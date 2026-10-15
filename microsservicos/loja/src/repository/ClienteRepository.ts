import { pool, rows, transaction, write } from "./database.js";
import type { Cliente } from "../model/Cliente.js";
import type { ClienteEvento } from "../dto/ClienteEvento.js";
import { config } from "../config.js";
export interface IClienteRepository {
  aplicar(evento: ClienteEvento): Promise<void>;
  buscar(id: number): Promise<Cliente | undefined>;
}
export class ClienteRepository implements IClienteRepository {
  async buscar(id: number) {
    return (await rows<Cliente>(pool, "SELECT * FROM clientes_projecao WHERE id_cliente=?", [id]))[0];
  }
  async aplicar(e: ClienteEvento) {
    await transaction(async db => {
      // Upsert serializes concurrent deliveries for the same aggregate. Older revisions cannot overwrite.
      const sqliteSql = `INSERT INTO clientes_projecao (id_cliente,nome,email,ativo,revision,event_id)
        VALUES (?,?,?,?,?,?) ON CONFLICT(id_cliente) DO UPDATE SET
        nome=excluded.nome,email=excluded.email,ativo=excluded.ativo,
        revision=excluded.revision,event_id=excluded.event_id,recebido_em=CURRENT_TIMESTAMP
        WHERE excluded.revision > clientes_projecao.revision`;
      await write(db, config.DB_DRIVER === "sqlite" ? sqliteSql : `INSERT INTO clientes_projecao (id_cliente,nome,email,ativo,revision,event_id)
        VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE
        nome=IF(VALUES(revision)>revision,VALUES(nome),nome),
        email=IF(VALUES(revision)>revision,VALUES(email),email),
        ativo=IF(VALUES(revision)>revision,VALUES(ativo),ativo),
        event_id=IF(VALUES(revision)>revision,VALUES(event_id),event_id),
        revision=GREATEST(revision,VALUES(revision))`,
        [e.id_cliente,e.nome,e.email,e.ativo,e.revision,e.event_id]);
    });
  }
}
