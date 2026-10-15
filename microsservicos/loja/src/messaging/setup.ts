import "dotenv/config";
import amqp from "amqplib";
import { topology } from "./Consumer.js";
async function main() {
  if (!process.env.RABBITMQ_URL) throw new Error("Configure RABBITMQ_URL");
  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  try { await topology(await connection.createChannel()); }
  finally { await connection.close(); }
}
main().catch(() => { console.error("Falha ao preparar RabbitMQ"); process.exitCode=1; });
