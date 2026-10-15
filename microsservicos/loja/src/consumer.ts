import "dotenv/config";
import { runConsumer } from "./messaging/Consumer.js";
import { pool } from "./repository/database.js";
const url = process.env.RABBITMQ_URL;
if (!url) throw new Error("Configure RABBITMQ_URL");
const abort = new AbortController();
for (const sig of ["SIGINT", "SIGTERM"] as const) process.on(sig, () => abort.abort());
runConsumer(url, abort.signal).finally(() => pool.end());
