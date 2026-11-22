import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { adulterarPayload, gerarToken } from "./jwt-helper.js";
import { verificarJwt, TokenInvalido } from "../src/security/jwt.js";
import { app } from "../src/app.js";

const SEGREDO = process.env.JWT_SECRET!;

test("JWT: aceita token íntegro e recusa adulterações", () => {
  const token = gerarToken();
  assert.equal(verificarJwt(token, SEGREDO, "petshop-auth").role, "USER");
  const virouAdmin = adulterarPayload(token, { role: "ADMIN" });
  assert.throws(() => verificarJwt(virouAdmin, SEGREDO, "petshop-auth"), TokenInvalido);
  const outroSegredo = gerarToken({ role: "ADMIN" }, "your-256-bit-secret-mas-com-mais-de-32-chars");
  assert.throws(() => verificarJwt(outroSegredo, SEGREDO, "petshop-auth"), TokenInvalido);
  const semAlg = gerarToken({}, SEGREDO, { alg: "none", typ: "JWT" });
  assert.throws(() => verificarJwt(semAlg, SEGREDO, "petshop-auth"), /Algoritmo/);
  const [h, p] = token.split(".");
  assert.throws(() => verificarJwt(`${h}.${p}.`, SEGREDO, "petshop-auth"), TokenInvalido);
  const expirado = gerarToken({ exp: Math.floor(Date.now() / 1000) - 1 });
  assert.throws(() => verificarJwt(expirado, SEGREDO, "petshop-auth"), /expirado/);
  const outroEmissor = gerarToken({ iss: "falso" });
  assert.throws(() => verificarJwt(outroEmissor, SEGREDO, "petshop-auth"), /Emissor/);
});

test("Resource Server: 401 sem token/adulterado, 403 sem papel, health público", async () => {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}`, "Content-Type": "application/json" });
  try {
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
    assert.ok(health.headers.get("x-instance"));

    const semToken = await fetch(`${base}/produtos`);
    assert.equal(semToken.status, 401);
    assert.match(semToken.headers.get("www-authenticate") ?? "", /Bearer/);

    const lixo = await fetch(`${base}/produtos`, { headers: bearer("abc.def.ghi") });
    assert.equal(lixo.status, 401);

    const tokenUser = gerarToken();
    const adulterado = adulterarPayload(tokenUser, { role: "ADMIN" });
    const corpo = JSON.stringify({ nome: "X", preco: 1, estoque: 1 });
    const tentativa = await fetch(`${base}/produtos`, { method: "POST", headers: bearer(adulterado), body: corpo });
    assert.equal(tentativa.status, 401);

    const proibido = await fetch(`${base}/produtos`, { method: "POST", headers: bearer(tokenUser), body: "{}" });
    assert.equal(proibido.status, 403);

    const admin = await fetch(`${base}/produtos`, { method: "POST", headers: bearer(gerarToken({ role: "ADMIN" })), body: "{}" });
    assert.equal(admin.status, 400);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
  }
});
