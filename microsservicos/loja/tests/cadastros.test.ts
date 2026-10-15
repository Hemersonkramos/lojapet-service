import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { CadastrosClient } from "../src/client/CadastrosClient.js";
import { PedidoService } from "../src/service/PedidoService.js";
import { AppError } from "../src/errors.js";

test("Cadastros: comunicação HTTP real e tratamento de falhas", async (t) => {
  let status = 200;
  let body = JSON.stringify({
    id: 7,
    nome: "Tutor de teste",
    cpf: "00000000000",
    telefone: "00000000000",
    email: null,
    pets: [],
  });
  let delay = false;
  const paths: string[] = [];
  const server = createServer((req, res) => {
    paths.push(req.url!);
    res.writeHead(status, { "Content-Type": "application/json" });
    if (delay) {
      res.flushHeaders();
      res.write('{"id":');
      return;
    }
    res.end(body);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const client = new CadastrosClient({
    CADASTROS_MODE: "real",
    CADASTROS_URL: `http://127.0.0.1:${address.port}`,
    CADASTROS_CLIENTE_PATH: "/tutores/{id}",
    CADASTROS_TIMEOUT_MS: 1000,
  });
  const errorStatus = (expected: number) => (error: unknown) =>
    error instanceof AppError && error.status === expected;
  try {
    await t.test("consulta tutor pelo contrato da API de Cadastros", async () => {
      await client.validarCliente(7);
      assert.equal(paths.at(-1), "/tutores/7");
    });
    await t.test("rejeita cliente inexistente", async () => {
      status = 404;
      await assert.rejects(client.validarCliente(7), errorStatus(404));
    });
    await t.test("rejeita cliente inativo", async () => {
      status = 200;
      for (const ativo of [false, 0]) {
        body = JSON.stringify({ id: 7, ativo });
        await assert.rejects(client.validarCliente(7), errorStatus(409));
      }
    });
    await t.test("rejeita JSON e contrato inválidos", async () => {
      for (const invalid of ["{", '{"id":8}', '{"id":7,"ativo":"false"}']) {
        body = invalid;
        await assert.rejects(client.validarCliente(7), errorStatus(502));
      }
    });
    await t.test(
      "falha de Cadastros interrompe criação antes do banco",
      async () => {
        status = 503;
        const service = new PedidoService(
          undefined,
          undefined,
          undefined,
          client,
        );
        await assert.rejects(
          service.criar({
            cliente_id: 7,
            tipo_recebimento: "RETIRADA",
            itens: [{ produto_id: 1, quantidade: 1 }],
            retirada: { nome_retirante: "Ana" },
          }),
          errorStatus(502),
        );
      },
    );
    await t.test(
      "timeout também cobre leitura do corpo da resposta",
      async () => {
        status = 200;
        delay = true;
        await assert.rejects(client.validarCliente(7), errorStatus(503));
      },
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
  await t.test("serviço desconectado retorna 503", async () => {
    await assert.rejects(client.validarCliente(7), errorStatus(503));
  });
});
