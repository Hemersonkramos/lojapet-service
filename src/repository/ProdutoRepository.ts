import { pool, rows, write, type DB } from "./database.js";
import type { Produto } from "../model/entities.js";
import type { ProdutoRequest } from "../dto/contracts.js";
export interface IProdutoRepository {
  listar(): Promise<Produto[]>;
  buscar(id: number, db?: DB, lock?: boolean): Promise<Produto | undefined>;
  criar(data: ProdutoRequest): Promise<number>;
  atualizar(id: number, data: ProdutoRequest): Promise<boolean>;
  baixarEstoque(db: DB, id: number, quantidade: number): Promise<boolean>;
  devolverEstoque(db: DB, id: number, quantidade: number): Promise<void>;
}
export class ProdutoRepository implements IProdutoRepository {
  listar() {
    return rows<Produto>(
      pool,
      "SELECT * FROM produtos ORDER BY id DESC LIMIT 500",
    );
  }
  async buscar(id: number, db: DB = pool, lock = false) {
    return (
      await rows<Produto>(
        db,
        "SELECT * FROM produtos WHERE id = ?" + (lock ? " FOR UPDATE" : ""),
        [id],
      )
    )[0];
  }
  async criar(d: ProdutoRequest) {
    return (
      await write(
        pool,
        "INSERT INTO produtos (nome,descricao,preco,estoque,ativo) VALUES (?,?,?,?,?)",
        [d.nome, d.descricao ?? null, d.preco.toFixed(2), d.estoque, d.ativo],
      )
    ).insertId;
  }
  async atualizar(id: number, d: ProdutoRequest) {
    return (
      (
        await write(
          pool,
          "UPDATE produtos SET nome=?,descricao=?,preco=?,estoque=?,ativo=? WHERE id=?",
          [
            d.nome,
            d.descricao ?? null,
            d.preco.toFixed(2),
            d.estoque,
            d.ativo,
            id,
          ],
        )
      ).affectedRows > 0
    );
  }
  async baixarEstoque(db: DB, id: number, q: number) {
    return (
      (
        await write(
          db,
          "UPDATE produtos SET estoque=estoque-? WHERE id=? AND estoque>=?",
          [q, id, q],
        )
      ).affectedRows > 0
    );
  }
  async devolverEstoque(db: DB, id: number, q: number) {
    await write(db, "UPDATE produtos SET estoque=estoque+? WHERE id=?", [
      q,
      id,
    ]);
  }
}
