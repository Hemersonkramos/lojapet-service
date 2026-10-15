import mysql from "mysql2/promise";
import type { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { config } from "../config.js";
import { openSqlite, SqliteDB, sqliteValues } from "./sqlite.js";
export const pool = config.DB_DRIVER === "sqlite"
  ? new SqliteDB(openSqlite(config.SQLITE_PATH))
  : mysql.createPool({host:config.DB_HOST,port:config.DB_PORT,user:config.DB_USER,
      password:config.DB_PASSWORD,database:config.DB_NAME,waitForConnections:true,
      connectionLimit:10,dateStrings:true});
export type DB = Pool | PoolConnection | SqliteDB;
type SqlValue = string | number | boolean | null;
// Serialize transactions AND standalone operations on the shared SQLite connection.
// API and Consumer have separate connections/processes; BEGIN IMMEDIATE + busy_timeout protect both.
let pending: Promise<unknown> = Promise.resolve();
function exclusive<T>(fn:()=>Promise<T>):Promise<T> {
  const result=pending.then(fn);
  pending=result.catch(()=>{});
  return result;
}
export async function rows<T>(db: DB, sql: string, values: SqlValue[] = []):Promise<T[]> {
  if (db instanceof SqliteDB) {
    const run=async()=>db.native.prepare(sql.replace(/\s+FOR UPDATE\s*$/i,""))
      .all(...sqliteValues(values)) as T[];
    return db.inTransaction ? run() : exclusive(run);
  }
  const [result]=await db.execute<RowDataPacket[]>(sql,values);
  return result as T[];
}
export async function write(db: DB, sql: string, values: SqlValue[] = []) {
  if (db instanceof SqliteDB) {
    const run=async()=>{
      const result=db.native.prepare(sql).run(...sqliteValues(values));
      return {insertId:Number(result.lastInsertRowid),affectedRows:Number(result.changes)};
    };
    return db.inTransaction ? run() : exclusive(run);
  }
  const [result]=await db.execute<ResultSetHeader>(sql,values);
  return result;
}
export async function transaction<T>(fn:(db:DB)=>Promise<T>):Promise<T> {
  if (pool instanceof SqliteDB) {
    return exclusive(async()=>{
      pool.native.exec("BEGIN IMMEDIATE");
      try {
        const result=await fn(new SqliteDB(pool.native,true));
        pool.native.exec("COMMIT");
        return result;
      } catch(error) { pool.native.exec("ROLLBACK"); throw error; }
    });
  }
  const db=await pool.getConnection();
  try {
    await db.beginTransaction(); const result=await fn(db); await db.commit(); return result;
  } catch(error) { await db.rollback(); throw error; }
  finally { db.release(); }
}
