import { pool, rows, write, type DB } from "./database.js";
import type {
  Pedido,
  PedidoDetalhado,
  ItemPedido,
  Entrega,
  Retirada,
  Pagamento,
  StatusPedido,
} from "../model/entities.js";
import type { PedidoRequest } from "../dto/contracts.js";
export interface IPedidoRepository {
  buscar(id: number, db?: DB, lock?: boolean): Promise<Pedido | undefined>;
  detalhar(id: number, db?: DB): Promise<PedidoDetalhado | undefined>;
  listar(clienteId: number): Promise<Pedido[]>;
  criar(
    db: DB,
    data: PedidoRequest,
    subtotal: string,
    taxa: string,
    total: string,
  ): Promise<number>;
  item(
    db: DB,
    pedido: number,
    produto: number,
    nome: string,
    quantidade: number,
    preco: string,
  ): Promise<void>;
  recebimento(
    db: DB,
    id: number,
    data: PedidoRequest,
    codigo: string,
  ): Promise<void>;
  status(db: DB, id: number, status: StatusPedido): Promise<void>;
  cancelarPendentes(db: DB, id: number): Promise<void>;
}
export class PedidoRepository implements IPedidoRepository {
  async buscar(id: number, db: DB = pool, lock = false) {
    return (
      await rows<Pedido>(
        db,
        "SELECT * FROM pedidos WHERE id=?" + (lock ? " FOR UPDATE" : ""),
        [id],
      )
    )[0];
  }
  listar(id: number) {
    return rows<Pedido>(
      pool,
      "SELECT * FROM pedidos WHERE cliente_id=? ORDER BY id DESC LIMIT 500",
      [id],
    );
  }
  async detalhar(
    id: number,
    db: DB = pool,
  ): Promise<PedidoDetalhado | undefined> {
    const p = await this.buscar(id, db);
    if (!p) return undefined;
    const itens = await rows<ItemPedido>(
      db,
      "SELECT * FROM itens_pedido WHERE pedido_id=? ORDER BY id",
      [id],
    );
    const entrega =
      (
        await rows<Entrega>(db, "SELECT * FROM entregas WHERE pedido_id=?", [
          id,
        ])
      )[0] ?? null;
    const retirada =
      (
        await rows<Retirada>(db, "SELECT * FROM retiradas WHERE pedido_id=?", [
          id,
        ])
      )[0] ?? null;
    const pagamentos = await rows<Pagamento>(
      db,
      "SELECT * FROM pagamentos WHERE pedido_id=? ORDER BY id",
      [id],
    );
    return { ...p, itens, entrega, retirada, pagamentos };
  }
  async criar(
    db: DB,
    d: PedidoRequest,
    subtotal: string,
    taxa: string,
    total: string,
  ) {
    return (
      await write(
        db,
        "INSERT INTO pedidos (cliente_id,tipo_recebimento,subtotal,taxa_entrega,total) VALUES (?,?,?,?,?)",
        [d.cliente_id, d.tipo_recebimento, subtotal, taxa, total],
      )
    ).insertId;
  }
  async item(
    db: DB,
    pedido: number,
    produto: number,
    nome: string,
    q: number,
    preco: string,
  ) {
    await write(
      db,
      "INSERT INTO itens_pedido (pedido_id,produto_id,nome_produto,quantidade,preco_unitario) VALUES (?,?,?,?,?)",
      [pedido, produto, nome, q, preco],
    );
  }
  async recebimento(db: DB, id: number, d: PedidoRequest, codigo: string) {
    if (d.tipo_recebimento === "ENTREGA") {
      const e = d.entrega;
      await write(
        db,
        "INSERT INTO entregas (pedido_id,destinatario,telefone,cep,logradouro,numero,complemento,bairro,cidade,uf,referencia) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        [
          id,
          e.destinatario,
          e.telefone,
          e.cep,
          e.logradouro,
          e.numero,
          e.complemento ?? null,
          e.bairro,
          e.cidade,
          e.uf,
          e.referencia ?? null,
        ],
      );
    } else
      await write(
        db,
        "INSERT INTO retiradas (pedido_id,nome_retirante,codigo_retirada) VALUES (?,?,?)",
        [id, d.retirada.nome_retirante, codigo],
      );
  }
  async status(db: DB, id: number, status: StatusPedido) {
    await write(db, "UPDATE pedidos SET status=? WHERE id=?", [status, id]);
    if (status === "ENTREGUE")
      await write(
        db,
        "UPDATE entregas SET data_entrega=CURRENT_TIMESTAMP WHERE pedido_id=?",
        [id],
      );
    if (status === "RETIRADO")
      await write(
        db,
        "UPDATE retiradas SET data_retirada=CURRENT_TIMESTAMP WHERE pedido_id=?",
        [id],
      );
  }
  async cancelarPendentes(db: DB, id: number) {
    await write(
      db,
      "UPDATE pagamentos SET status='CANCELADO' WHERE pedido_id=? AND status='PENDENTE'",
      [id],
    );
  }
}
