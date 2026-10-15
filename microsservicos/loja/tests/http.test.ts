import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { app } from "../src/app.js";

test("API: saúde, validação e erros JSON sem depender do banco", async () => {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).servico, "loja");
    const missing = await fetch(`${base}/rota-inexistente`);
    assert.equal(missing.status, 404);
    assert.ok((await missing.json()).erro);
    const invalid = await fetch(`${base}/pedidos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(invalid.status, 400);
    assert.ok((await invalid.json()).detalhes.length > 0);
    const malformed = await fetch(`${base}/produtos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    assert.equal(malformed.status, 400);
    assert.equal((await malformed.json()).erro, "JSON inválido");
    const id = await fetch(`${base}/produtos/abc`);
    assert.equal(id.status, 400);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
