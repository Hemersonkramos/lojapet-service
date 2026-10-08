import mysql from "mysql2/promise";
import type {
  Pool,
  PoolConnection,
  RowDataPacket,
  ResultSetHeader,
} from "mysql2/promise";
import { config } from "../config.js";
export const pool = mysql.createPool({
  host: config.DB_HOST,
  port: config.DB_PORT,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
});
export type DB = Pool | PoolConnection;
type SqlValue = string | number | boolean | null;
export async function rows<T>(
  db: DB,
  sql: string,
  values: SqlValue[] = [],
): Promise<T[]> {
  const [result] = await db.execute<RowDataPacket[]>(sql, values);
  return result as T[];
}
export async function write(db: DB, sql: string, values: SqlValue[] = []) {
  const [result] = await db.execute<ResultSetHeader>(sql, values);
  return result;
}
export async function transaction<T>(
  fn: (db: PoolConnection) => Promise<T>,
): Promise<T> {
  const db = await pool.getConnection();
  try {
    await db.beginTransaction();
    const result = await fn(db);
    await db.commit();
    return result;
  } catch (error) {
    await db.rollback();
    throw error;
  } finally {
    db.release();
  }
}
