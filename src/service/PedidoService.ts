import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import { AppError } from "../errors.js";
import { CadastrosClient } from "../client/CadastrosClient.js";
import {
  ProdutoRepository,
  type IProdutoRepository,
} from "../repository/ProdutoRepository.js";
import {
  PedidoRepository,
  type IPedidoRepository,
} from "../repository/PedidoRepository.js";
import {
  PagamentoRepository,
  type IPagamentoRepository,
} from "../repository/PagamentoRepository.js";
import { transaction } from "../repository/database.js";
import {
  pedidoResponse,
  pedidoResumoResponse,
  type PedidoRequest,
  type PedidoResponse,
} from "../dto/contracts.js";
import type { Produto, StatusPedido } from "../model/entities.js";
import { centavos, reais, consolidarItens, validarTransicao } from "./rules.js";
export class PedidoService {
  constructor(
    private pedidos: IPedidoRepository = new PedidoRepository(),
    private produtos: IProdutoRepository = new ProdutoRepository(),
    private pagamentos: IPagamentoRepository = new PagamentoRepository(),
    private cadastros = new CadastrosClient(),
  ) {}
  async buscar(id: number): Promise<PedidoResponse> {
    const p = await this.pedidos.detalhar(id);
    if (!p) throw new AppError(404, "Pedido não encontrado");
    return pedidoResponse(p);
  }
  async listar(clienteId: number) {
    return (await this.pedidos.listar(clienteId)).map(pedidoResumoResponse);
  }
  async criar(d: PedidoRequest): Promise<PedidoResponse> {
    await this.cadastros.validarCliente(d.cliente_id);
    return transaction(async (db) => {
      const itens = consolidarItens(d.itens);
      const encontrados = new Map<number, Produto>();
      let subtotal = 0;
      // Ordem estável de bloqueios reduz deadlocks; FOR UPDATE protege estoque.
      for (const i of itens) {
        const p = await this.produtos.buscar(i.produto_id, db, true);
        if (!p || !p.ativo)
          throw new AppError(404, `Produto ${i.produto_id} indisponível`);
        if (p.estoque < i.quantidade)
          throw new AppError(409, `Estoque insuficiente: ${p.nome}`);
        encontrados.set(p.id, p);
        subtotal += centavos(p.preco) * i.quantidade;
      }
      const taxa =
        d.tipo_recebimento === "ENTREGA" ? centavos(config.TAXA_ENTREGA) : 0;
      if (subtotal + taxa > 999999999999)
        throw new AppError(422, "Total do pedido excede o limite permitido");
      const id = await this.pedidos.criar(
        db,
        d,
        reais(subtotal),
        reais(taxa),
        reais(subtotal + taxa),
      );
      for (const i of itens) {
        const p = encontrados.get(i.produto_id)!;
        await this.pedidos.item(db, id, p.id, p.nome, i.quantidade, p.preco);
        if (!(await this.produtos.baixarEstoque(db, p.id, i.quantidade)))
          throw new AppError(409, "Estoque indisponível");
      }
      await this.pedidos.recebimento(db, id, d, randomUUID());
      return pedidoResponse((await this.pedidos.detalhar(id, db))!);
    });
  }
  async mudarStatus(id: number, next: StatusPedido) {
    return transaction(async (db) => {
      const p = await this.pedidos.buscar(id, db, true);
      if (!p) throw new AppError(404, "Pedido não encontrado");
      validarTransicao(p, next);
      const pagamentos = await this.pagamentos.listar(db, id);
      if (next === "CANCELADO") {
        if (pagamentos.some((x) => x.status === "APROVADO"))
          throw new AppError(
            409,
            "Pedido pago: estorno deve ser tratado antes de cancelar",
          );
        const detalhe = (await this.pedidos.detalhar(id, db))!;
        for (const i of consolidarItens(detalhe.itens))
          await this.produtos.devolverEstoque(db, i.produto_id, i.quantidade);
        await this.pedidos.cancelarPendentes(db, id);
      }
      if (
        (next === "ENTREGUE" || next === "RETIRADO") &&
        !pagamentos.some((x) => x.status === "APROVADO")
      )
        throw new AppError(409, "Confirme o pagamento antes de concluir");
      await this.pedidos.status(db, id, next);
      return pedidoResponse((await this.pedidos.detalhar(id, db))!);
    });
  }
  async registrarPagamento(id: number, forma: string) {
    return transaction(async (db) => {
      const p = await this.pedidos.buscar(id, db, true);
      if (!p) throw new AppError(404, "Pedido não encontrado");
      if (["CANCELADO", "ENTREGUE", "RETIRADO"].includes(p.status))
        throw new AppError(409, "Pedido encerrado");
      const pagamentos = await this.pagamentos.listar(db, id);
      if (pagamentos.some((x) => ["PENDENTE", "APROVADO"].includes(x.status)))
        throw new AppError(409, "Já existe pagamento pendente ou aprovado");
      if (centavos(p.total) <= 0)
        throw new AppError(422, "Pedido sem valor a pagar");
      await this.pagamentos.criar(db, id, forma, p.total);
      return pedidoResponse((await this.pedidos.detalhar(id, db))!);
    });
  }
  async confirmarPagamento(id: number, pagamentoId: number) {
    return transaction(async (db) => {
      const p = await this.pedidos.buscar(id, db, true);
      if (!p) throw new AppError(404, "Pedido não encontrado");
      if (p.status === "CANCELADO") throw new AppError(409, "Pedido cancelado");
      const list = await this.pagamentos.listar(db, id);
      const payment = list.find((x) => x.id === pagamentoId);
      if (!payment) throw new AppError(404, "Pagamento não encontrado");
      if (payment.status !== "PENDENTE")
        throw new AppError(409, "Pagamento não está pendente");
      if (list.some((x) => x.status === "APROVADO"))
        throw new AppError(409, "Pedido já pago");
      await this.pagamentos.aprovar(db, id, pagamentoId);
      return pedidoResponse((await this.pedidos.detalhar(id, db))!);
    });
  }
}
