import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { clienteEvento } from "../src/dto/ClienteEvento.js";
import { processMessage } from "../src/messaging/Consumer.js";
import { ClienteService } from "../src/service/ClienteService.js";
import type { ConsumeMessage } from "amqplib";
const fixture = JSON.parse(readFileSync("tests/fixtures/cliente-evento.json", "utf8"));
const message = (body: unknown) => ({content: Buffer.from(JSON.stringify(body))}) as ConsumeMessage;
test("contrato compartilhado Python/TypeScript rejeita versão e campos ausentes", () => {
  assert.equal(clienteEvento.parse(fixture).id_cliente, 1);
  for (const invalid of [{...fixture, version:2}, {...fixture, revision:0}, {...fixture, event_id:"x"}, {...fixture, ativo:undefined}])
    assert.equal(clienteEvento.safeParse(invalid).success,false);
});
test("ACK ocorre depois da persistência; falha transitória reencaminha; inválido vai para DLQ", async () => {
  const calls: string[]=[];
  const ch={ack(){calls.push("ack");},nack(_m:unknown,_all:boolean,requeue:boolean){calls.push(requeue?"retry":"dlq");}};
  await processMessage(ch,message(fixture),{async receber(){calls.push("persist");}});
  assert.deepEqual(calls,["persist","ack"]);
  calls.length=0;
  await processMessage(ch,message(fixture),{async receber(){throw new Error("db offline");}});
  assert.deepEqual(calls,["retry"]);
  calls.length=0;
  await processMessage(ch,message({}),new ClienteService({async aplicar(){throw new Error("não deve persistir");},async buscar(){return undefined;}}));
  assert.deepEqual(calls,["dlq"]);
});
test("pedido antes de sincronizar ou cliente inativo é rejeitado", async () => {
  const repo={async aplicar(){},async buscar(){return undefined;}};
  await assert.rejects(new ClienteService(repo).validarCliente(1), /ainda não sincronizado/);
  await assert.rejects(new ClienteService({...repo,async buscar(){return {...fixture,ativo:false};}}).validarCliente(1), /inativo/);
});
