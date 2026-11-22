import type { NextFunction, Request, Response } from "express";
import { TokenInvalido, verificarJwt, type Claims } from "./jwt.js";

const ROTAS_PUBLICAS = new Set(["/health"]);

export function segredoJwt(): string {
  const segredo = process.env.JWT_SECRET ?? "";
  if (segredo.length < 32)
    throw new Error("Configure JWT_SECRET com pelo menos 32 caracteres aleatórios");
  return segredo;
}

const emissor = () => process.env.JWT_ISSUER ?? "petshop-auth";

function naoAutorizado(res: Response, mensagem: string) {
  res
    .status(401)
    .set("WWW-Authenticate", 'Bearer error="invalid_token"')
    .json({ erro: mensagem });
}

export function autenticar(req: Request, res: Response, next: NextFunction) {
  if (req.method === "OPTIONS" || ROTAS_PUBLICAS.has(req.path)) return next();
  const [esquema, token] = (req.get("authorization") ?? "").split(" ");
  if (esquema?.toLowerCase() !== "bearer" || !token) {
    naoAutorizado(res, "Token ausente. Envie Authorization: Bearer <token>");
    return;
  }
  try {
    res.locals.usuario = verificarJwt(token, segredoJwt(), emissor());
  } catch (error) {
    if (!(error instanceof TokenInvalido)) return next(error);
    naoAutorizado(res, `Token inválido: ${error.message}`);
    return;
  }
  next();
}

export function exigirRole(...papeis: string[]) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const usuario = res.locals.usuario as Claims | undefined;
    if (!usuario) {
      naoAutorizado(res, "Token ausente");
      return;
    }
    if (!papeis.includes(usuario.role)) {
      res.status(403).json({ erro: "Permissão insuficiente" });
      return;
    }
    next();
  };
}
