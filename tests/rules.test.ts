import test from "node:test";
import assert from "node:assert/strict";
import {
  centavos,
  reais,
  consolidarItens,
  validarTransicao,
} from "../src/service/rules.js";
import { pedidoRequest } from "../src/dto/contracts.js";
import type { Pedido } from "../src/model/entities.js";
test("cálculos monetários em centavos", () =>
  assert.equal(reais(centavos("0.10") + centavos("0.20")), "0.30"));
test("consolida produto repetido e ordena bloqueios", () =>
  assert.deepEqual(
    consolidarItens([
      { produto_id: 2, quantidade: 1 },
      { produto_id: 1, quantidade: 2 },
      { produto_id: 2, quantidade: 4 },
    ]),
    [
      { produto_id: 1, quantidade: 2 },
      { produto_id: 2, quantidade: 5 },
    ],
  ));
test("retirada não pode conter entrega nem aceitar preço enviado", () => {
  const d = {
    cliente_id: 1,
    tipo_recebimento: "RETIRADA",
    itens: [{ produto_id: 1, quantidade: 1 }],
    retirada: { nome_retirante: "Ana" },
  };
  assert.equal(pedidoRequest.safeParse(d).success, true);
  assert.equal(pedidoRequest.safeParse({ ...d, entrega: {} }).success, false);
  assert.equal(pedidoRequest.safeParse({ ...d, total: 1 }).success, false);
});
test("impede modalidade errada e cancelamento repetido", () => {
  const p = { status: "EM_PREPARACAO", tipo_recebimento: "RETIRADA" } as Pedido;
  assert.throws(() => validarTransicao(p, "SAIU_PARA_ENTREGA"));
  assert.doesNotThrow(() => validarTransicao(p, "PRONTO_PARA_RETIRADA"));
  assert.throws(() =>
    validarTransicao({ ...p, status: "CANCELADO" }, "CANCELADO"),
  );
});
