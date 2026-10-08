import { AppError } from "../errors.js";
import type { Pedido, StatusPedido } from "../model/entities.js";
export const centavos = (value: string | number) =>
  Math.round(Number(value) * 100);
export const reais = (value: number) => (value / 100).toFixed(2);
export function consolidarItens(
  itens: { produto_id: number; quantidade: number }[],
) {
  const map = new Map<number, number>();
  for (const i of itens)
    map.set(i.produto_id, (map.get(i.produto_id) ?? 0) + i.quantidade);
  return [...map]
    .sort((a, b) => a[0] - b[0])
    .map(([produto_id, quantidade]) => ({ produto_id, quantidade }));
}
export function validarTransicao(p: Pedido, next: StatusPedido) {
  const transitions: Record<StatusPedido, StatusPedido[]> = {
    RECEBIDO: ["EM_PREPARACAO", "CANCELADO"],
    EM_PREPARACAO: [
      p.tipo_recebimento === "ENTREGA"
        ? "SAIU_PARA_ENTREGA"
        : "PRONTO_PARA_RETIRADA",
      "CANCELADO",
    ],
    SAIU_PARA_ENTREGA: ["ENTREGUE"],
    PRONTO_PARA_RETIRADA: ["RETIRADO", "CANCELADO"],
    ENTREGUE: [],
    RETIRADO: [],
    CANCELADO: [],
  };
  if (!transitions[p.status].includes(next))
    throw new AppError(409, `Transição inválida: ${p.status} → ${next}`);
}
