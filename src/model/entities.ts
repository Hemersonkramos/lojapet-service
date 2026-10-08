// Model: os nomes correspondem às colunas das seis tabelas existentes.
export interface Produto {
  id: number;
  nome: string;
  descricao: string | null;
  preco: string;
  estoque: number;
  ativo: number;
}
export type StatusPedido =
  | "RECEBIDO"
  | "EM_PREPARACAO"
  | "SAIU_PARA_ENTREGA"
  | "ENTREGUE"
  | "PRONTO_PARA_RETIRADA"
  | "RETIRADO"
  | "CANCELADO";
export interface Pedido {
  id: number;
  cliente_id: number;
  data_criacao: string;
  tipo_recebimento: "ENTREGA" | "RETIRADA";
  status: StatusPedido;
  subtotal: string;
  taxa_entrega: string;
  total: string;
}
export interface ItemPedido {
  id: number;
  pedido_id: number;
  produto_id: number;
  nome_produto: string;
  quantidade: number;
  preco_unitario: string;
}
export interface Entrega {
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
}
export interface Retirada {
  id: number;
  pedido_id: number;
  nome_retirante: string;
  codigo_retirada: string;
  data_retirada: string | null;
}
export interface Pagamento {
  id: number;
  pedido_id: number;
  forma: string;
  status: string;
  valor: string;
  data_pagamento: string | null;
}
export interface PedidoDetalhado extends Pedido {
  itens: ItemPedido[];
  entrega: Entrega | null;
  retirada: Retirada | null;
  pagamentos: Pagamento[];
}
