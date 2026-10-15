import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import amqp from "amqplib";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { topology, processMessage } from "../src/messaging/Consumer.js";
import { ClienteService } from "../src/service/ClienteService.js";
import { ClienteRepository } from "../src/repository/ClienteRepository.js";
import { pool, write } from "../src/repository/database.js";
test("RabbitMQ real: offline, persistência, duplicação e DLQ limitada", {timeout:30000}, async () => {
  assert.ok(process.env.RABBITMQ_URL,"Configure RABBITMQ_URL");
  const connection=await amqp.connect(process.env.RABBITMQ_URL);
  const ch=await connection.createConfirmChannel();
  const name=`teste.entrega3.${randomUUID()}`;
  const id=8_000_000_000+Math.floor(Math.random()*1_000_000_000);
  const event={event_id:randomUUID(),version:1,evento:"CLIENTE_CADASTRADO",id_cliente:id,revision:1,nome:"Teste broker",email:null,ativo:true};
  const wait=async (predicate:()=>Promise<boolean>) => {
    for(let attempt=0;attempt<100;attempt++){if(await predicate())return;await delay(100);}
    throw new Error("Timeout aguardando processamento");
  };
  try {
    await topology(ch,name,name);
    // Consumer stopped: persistent, confirmed publication still queues the message.
    ch.publish(name,"",Buffer.from(JSON.stringify(event)),{persistent:true,mandatory:true});
    await ch.waitForConfirms();
    assert.equal((await ch.checkQueue(name)).messageCount,1);
    const repo=new ClienteRepository();
    await ch.prefetch(1);
    const consumer=await ch.consume(name,msg=>{if(msg)void processMessage(ch,msg,new ClienteService());});
    await wait(async()=>Boolean(await repo.buscar(id)));
    ch.publish(name,"",Buffer.from(JSON.stringify(event)),{persistent:true});
    ch.publish(name,"",Buffer.from("{}"),{persistent:true});
    await ch.waitForConfirms();
    await wait(async()=>(await ch.checkQueue(`${name}.dlq`)).messageCount===1);
    assert.equal((await repo.buscar(id))?.revision,1);
    await ch.cancel(consumer.consumerTag);
    const failed=await ch.consume(name,msg=>{if(msg)void processMessage(ch,msg,{async receber(){throw new Error("MySQL indisponível");}});});
    ch.publish(name,"",Buffer.from(JSON.stringify({...event,event_id:randomUUID()})),{persistent:true});
    await ch.waitForConfirms();
    await wait(async()=>(await ch.checkQueue(`${name}.dlq`)).messageCount===2);
    await ch.cancel(failed.consumerTag);
  } finally {
    await ch.deleteQueue(name);
    await ch.deleteQueue(`${name}.dlq`);
    await ch.deleteExchange(name);
    await ch.deleteExchange(`${name}.dead`);
    await connection.close();
    await write(pool,"DELETE FROM clientes_projecao WHERE id_cliente=?",[id]);
    await pool.end();
  }
});
