import { z } from "zod";
export const clienteEvento = z.object({
  event_id: z.string().uuid(),
  version: z.literal(1),
  evento: z.enum(["CLIENTE_CADASTRADO", "CLIENTE_ATUALIZADO"]),
  id_cliente: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  revision: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  nome: z.string().min(1).max(255),
  email: z.string().max(255).nullable(),
  ativo: z.boolean(),
}).strict();
export type ClienteEvento = z.infer<typeof clienteEvento>;
