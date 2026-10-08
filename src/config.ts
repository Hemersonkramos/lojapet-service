import "dotenv/config";
import { z } from "zod";
const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(8083),
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().int().default(3306),
  DB_USER: z.string().default("root"),
  DB_PASSWORD: z.string().default(""),
  DB_NAME: z.string().default("banco_loja"),
  CADASTROS_MODE: z.enum(["real", "demo"]).default("real"),
  CADASTROS_URL: z.string().url().default("http://localhost:8082"),
  CADASTROS_CLIENTE_PATH: z.string().default("/clientes/{id}"),
  CADASTROS_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  TAXA_ENTREGA: z.coerce.number().min(0).max(99999999.99).default(10),
});
export const config = schema.parse(process.env);
