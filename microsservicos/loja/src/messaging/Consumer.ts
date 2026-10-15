import amqp, { type Channel, type ConsumeMessage } from "amqplib";
import { setTimeout as delay } from "node:timers/promises";
import { ClienteService } from "../service/ClienteService.js";
import { ZodError } from "zod";
export const EXCHANGE = "cadastros.clientes.v1";
export const QUEUE = "loja.clientes.v1";
export async function topology(ch: Channel, exchange=EXCHANGE, queue=QUEUE) {
  await ch.assertExchange(exchange, "fanout", { durable: true });
  await ch.assertExchange(`${queue}.dead`, "fanout", { durable: true });
  await ch.assertQueue(`${queue}.dlq`, { durable: true });
  await ch.bindQueue(`${queue}.dlq`, `${queue}.dead`, "");
  await ch.assertQueue(queue, { durable: true, arguments: {
    "x-queue-type": "quorum", "x-delivery-limit": 5,
    "x-dead-letter-exchange": `${queue}.dead`,
    "x-dead-letter-strategy": "at-least-once", "x-overflow": "reject-publish",
  } });
  await ch.bindQueue(queue, exchange, "");
}
export async function processMessage(ch: Pick<Channel,"ack"|"nack">, msg: ConsumeMessage,
  service: Pick<ClienteService,"receber">) {
  try {
    await service.receber(JSON.parse(msg.content.toString("utf8")));
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      ch.nack(msg, false, false); // Invalid contract: DLQ immediately.
      return;
    }
    await delay(1000);
    ch.nack(msg, false, true); // Quorum delivery-limit bounds retries, including process crashes.
    return;
  }
  ch.ack(msg); // Only after committed persistence. Lost ACK safely redelivers.
}
export async function runConsumer(url: string, signal: AbortSignal) {
  while (!signal.aborted) {
    let connection: Awaited<ReturnType<typeof amqp.connect>> | undefined;
    try {
      connection = await amqp.connect(url, { timeout: 5000 });
      connection.on("error", () => {});
      const closed = new Promise<void>(resolve => connection!.once("close", resolve));
      const stop = () => { void connection!.close().catch(() => {}); };
      signal.addEventListener("abort", stop, { once: true });
      try {
        const ch = await connection.createChannel();
        ch.on("error", () => { void connection!.close().catch(() => {}); });
        await topology(ch);
        await ch.prefetch(1);
        await ch.consume(QUEUE, msg => {
          if (!msg) { void connection!.close().catch(() => {}); return; }
          void processMessage(ch,msg,new ClienteService()).catch(() => {
            void connection!.close().catch(() => {});
          });
        }, { noAck: false });
        console.info("Consumidor Loja conectado");
        if (signal.aborted) stop();
        await closed;
      } finally { signal.removeEventListener("abort", stop); }
    } catch { console.error("RabbitMQ indisponível; reconectando em 3s"); }
    finally { await connection?.close().catch(() => {}); }
    if (!signal.aborted) await delay(3000, undefined, { signal }).catch(() => {});
  }
}
