// Opt-in: uses the existing database, applies only the additive migration and removes its own test record.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { pool, write } from "../src/repository/database.js";
import { ClienteRepository } from "../src/repository/ClienteRepository.js";
test("MySQL real: migração incremental, duplicação, ordem e desativação", async () => {
  const repo=new ClienteRepository();
  const id=8_000_000_000+Math.floor(Math.random()*1_000_000_000);
  const event={event_id:randomUUID(),version:1 as const,evento:"CLIENTE_CADASTRADO" as const,id_cliente:id,revision:1,nome:"Teste Entrega 3",email:null,ativo:true};
  try {
    await pool.query(readFileSync("migrations/003_clientes_projecao.sql","utf8"));
    assert.equal(await repo.buscar(id),undefined);
    await repo.aplicar(event);
    await Promise.all([repo.aplicar(event),repo.aplicar(event)]);
    assert.equal((await repo.buscar(id))?.revision,1);
    await repo.aplicar({...event,event_id:randomUUID(),revision:2,ativo:false,nome:"Atualizado"});
    await repo.aplicar(event);
    const cliente=await repo.buscar(id);
    assert.equal(cliente?.nome,"Atualizado");
    assert.equal(cliente?.ativo,0);
    assert.equal(cliente?.revision,2);
  } finally {
    await write(pool,"DELETE FROM clientes_projecao WHERE id_cliente=?",[id]);
    await pool.end();
  }
});
