import { hostname } from "node:os";
import type { NextFunction, Request, Response } from "express";

export const INSTANCIA = process.env.INSTANCE_NAME || hostname();

export function registrarInstancia(req: Request, res: Response, next: NextFunction) {
  const inicio = process.hrtime.bigint();
  res.setHeader("X-Instance", INSTANCIA);
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
    const usuario = (res.locals.usuario as { sub?: string } | undefined)?.sub ?? "-";
    console.info(
      `[loja ${INSTANCIA}] ${req.method} ${req.originalUrl} -> ${res.statusCode} ` +
        `(${ms.toFixed(1)} ms) usuario=${usuario} ip=${req.get("x-real-ip") ?? req.ip}`,
    );
  });
  next();
}
