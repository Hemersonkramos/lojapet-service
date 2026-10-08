import { z } from "zod";
import type {
  Produto,
  Pedido,
  PedidoDetalhado,
  StatusPedido,
} from "../model/entities.js";
export const idSchema = z.coerce
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);
const money = z
  .number()
  .finite()
  .min(0)
  .max(99999999.99)
  .refine(
    (v) => Math.abs(v * 100 - Math.round(v * 100)) < 0.000001,
    "Use no máximo duas casas decimais",
  );
export const produtoRequest = z
  .object({
    nome: z.string().trim().min(1).max(150),
    descricao: z.string().max(10000).nullable().optional(),
    preco: money,
    estoque: z.number().int().min(0).max(2147483647),
    ativo: z.boolean().default(true),
  })
  .strict();
export const entregaRequest = z
  .object({
    destinatario: z.string().trim().min(1).max(150),
    telefone: z.string().trim().min(8).max(20),
    cep: z.string().regex(/^\d{8}$/),
    logradouro: z.string().trim().min(1).max(200),
    numero: z.string().trim().min(1).max(20),
    complemento: z.string().max(150).optional(),
    bairro: z.string().trim().min(1).max(100),
    cidade: z.string().trim().min(1).max(100),
    uf: z.enum([
      "AC",
      "AL",
      "AP",
      "AM",
      "BA",
      "CE",
      "DF",
      "ES",
      "GO",
      "MA",
      "MT",
      "MS",
      "MG",
      "PA",
      "PB",
      "PR",
      "PE",
      "PI",
      "RJ",
      "RN",
      "RS",
      "RO",
      "RR",
      "SC",
      "SP",
      "SE",
      "TO",
    ]),
    referencia: z.string().max(255).optional(),
  })
  .strict();
const common = {
  cliente_id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  itens: z
    .array(
      z
        .object({
          produto_id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
          quantidade: z.number().int().positive().max(100000),
        })
        .strict(),
    )
    .min(1)
    .max(100),
};
export const pedidoRequest = z.discriminatedUnion("tipo_recebimento", [
  z
    .object({
      ...common,
      tipo_recebimento: z.literal("ENTREGA"),
      entrega: entregaRequest,
    })
    .strict(),
  z
    .object({
      ...common,
      tipo_recebimento: z.literal("RETIRADA"),
      retirada: z
        .object({ nome_retirante: z.string().trim().min(1).max(150) })
        .strict(),
    })
    .strict(),
]);
export const statusRequest = z
  .object({
    status: z.enum([
      "EM_PREPARACAO",
      "SAIU_PARA_ENTREGA",
      "ENTREGUE",
      "PRONTO_PARA_RETIRADA",
      "RETIRADO",
      "CANCELADO",
    ]),
  })
  .strict();
export const pagamentoRequest = z
  .object({
    forma: z.enum(["PIX", "CARTAO_CREDITO", "CARTAO_DEBITO", "DINHEIRO"]),
  })
  .strict();
export type ProdutoRequest = z.infer<typeof produtoRequest>;
export type PedidoRequest = z.infer<typeof pedidoRequest>;
export type StatusRequest = z.infer<typeof statusRequest>;
export type PagamentoRequest = z.infer<typeof pagamentoRequest>;
// Response DTO: decimais são strings para preservar o valor exato do MySQL.
export interface ProdutoResponse {
  id: number;
  nome: string;
  descricao: string | null;
  preco: string;
  estoque: number;
  ativo: boolean;
}
export const produtoResponse = (p: Produto): ProdutoResponse => ({
  id: p.id,
  nome: p.nome,
  descricao: p.descricao,
  preco: p.preco,
  estoque: p.estoque,
  ativo: !!p.ativo,
});
export interface PedidoResumoResponse {
  id: number;
  cliente_id: number;
  data_criacao: string;
  tipo_recebimento: "ENTREGA" | "RETIRADA";
  status: StatusPedido;
  subtotal: string;
  taxa_entrega: string;
  total: string;
}
export interface PedidoResponse extends PedidoResumoResponse {
  itens: {
    id: number;
    pedido_id: number;
    produto_id: number;
    nome_produto: string;
    quantidade: number;
    preco_unitario: string;
  }[];
  entrega: {
    id: number;
    pedido_id: number;
    destinatario: string;
    telefone: string;
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string | null;
    bairro: string;
    cidade: string;
    uf: string;
    referencia: string | null;
    data_entrega: string | null;
  } | null;
  retirada: {
    id: number;
    pedido_id: number;
    nome_retirante: string;
    codigo_retirada: string;
    data_retirada: string | null;
  } | null;
  pagamentos: {
    id: number;
    pedido_id: number;
    forma: string;
    status: string;
    valor: string;
    data_pagamento: string | null;
  }[];
}
export const pedidoResumoResponse = (p: Pedido): PedidoResumoResponse => ({
  id: p.id,
  cliente_id: p.cliente_id,
  data_criacao: p.data_criacao,
  tipo_recebimento: p.tipo_recebimento,
  status: p.status,
  subtotal: p.subtotal,
  taxa_entrega: p.taxa_entrega,
  total: p.total,
});
export const pedidoResponse = (p: PedidoDetalhado): PedidoResponse => ({
  ...pedidoResumoResponse(p),
  itens: p.itens.map((i) => ({
    id: i.id,
    pedido_id: i.pedido_id,
    produto_id: i.produto_id,
    nome_produto: i.nome_produto,
    quantidade: i.quantidade,
    preco_unitario: i.preco_unitario,
  })),
  entrega: p.entrega
    ? {
        id: p.entrega.id,
        pedido_id: p.entrega.pedido_id,
        destinatario: p.entrega.destinatario,
        telefone: p.entrega.telefone,
        cep: p.entrega.cep,
        logradouro: p.entrega.logradouro,
        numero: p.entrega.numero,
        complemento: p.entrega.complemento,
        bairro: p.entrega.bairro,
        cidade: p.entrega.cidade,
        uf: p.entrega.uf,
        referencia: p.entrega.referencia,
        data_entrega: p.entrega.data_entrega,
      }
    : null,
  retirada: p.retirada
    ? {
        id: p.retirada.id,
        pedido_id: p.retirada.pedido_id,
        nome_retirante: p.retirada.nome_retirante,
        codigo_retirada: p.retirada.codigo_retirada,
        data_retirada: p.retirada.data_retirada,
      }
    : null,
  pagamentos: p.pagamentos.map((x) => ({
    id: x.id,
    pedido_id: x.pedido_id,
    forma: x.forma,
    status: x.status,
    valor: x.valor,
    data_pagamento: x.data_pagamento,
  })),
});
