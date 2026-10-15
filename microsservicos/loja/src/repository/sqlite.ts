import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
// Native SQLite: no external database server or native npm compilation needed.
export function openSqlite(path: string) {
  if (path !== ":memory:") mkdirSync(dirname(resolve(path)), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;");
  db.exec(readFileSync(resolve("migrations/sqlite/001_schema.sql"), "utf8"));
  return db;
}
type Value = string | number | boolean | null;
export class SqliteDB {
  constructor(readonly native: DatabaseSync, readonly inTransaction = false) {}
  async query(sql: string) { return this.native.prepare(sql).all(); }
  async end() { this.native.close(); }
}
export const sqliteValues = (values: Value[]) => values.map(v => typeof v === "boolean" ? Number(v) : v);
