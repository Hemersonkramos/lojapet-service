import { rows, write, type DB } from "./database.js";
import type { Pagamento } from "../model/entities.js";
export interface IPagamentoRepository {
  listar(db: DB, id: number): Promise<Pagamento[]>;
  criar(db: DB, id: number, forma: string, valor: string): Promise<number>;
  aprovar(db: DB, id: number, pagamento: number): Promise<boolean>;
}
export class PagamentoRepository implements IPagamentoRepository {
  listar(db: DB, id: number) {
    return rows<Pagamento>(
      db,
      "SELECT * FROM pagamentos WHERE pedido_id=? ORDER BY id",
      [id],
    );
  }
  async criar(db: DB, id: number, forma: string, valor: string) {
    return (
      await write(
        db,
        "INSERT INTO pagamentos (pedido_id,forma,valor) VALUES (?,?,?)",
        [id, forma, valor],
      )
    ).insertId;
  }
  async aprovar(db: DB, id: number, pagamento: number) {
    return (
      (
        await write(
          db,
          "UPDATE pagamentos SET status='APROVADO',data_pagamento=CURRENT_TIMESTAMP WHERE id=? AND pedido_id=? AND status='PENDENTE'",
          [pagamento, id],
        )
      ).affectedRows > 0
    );
  }
}
