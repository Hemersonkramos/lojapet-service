import { createHmac, timingSafeEqual } from "node:crypto";

export class TokenInvalido extends Error {}

export interface Claims {
  sub: string;
  role: string;
  exp: number;
  iat: number;
  iss?: string;
  uid?: number;
  [claim: string]: unknown;
}

const BASE64URL = /^[A-Za-z0-9_-]+$/;

function decodificar(parte: string): Buffer {
  if (!BASE64URL.test(parte)) throw new TokenInvalido("Codificação inválida");
  return Buffer.from(parte, "base64url");
}

function json(parte: string): Record<string, unknown> {
  try {
    const valor: unknown = JSON.parse(decodificar(parte).toString("utf8"));
    if (valor && typeof valor === "object" && !Array.isArray(valor))
      return valor as Record<string, unknown>;
  } catch {
    /* tratado abaixo */
  }
  throw new TokenInvalido("JSON inválido no token");
}

export function assinarHs256(conteudo: string, segredo: string): string {
  return createHmac("sha256", segredo).update(conteudo).digest("base64url");
}

export function verificarJwt(
  token: string,
  segredo: string,
  emissor: string,
  agora = Math.floor(Date.now() / 1000),
): Claims {
  const partes = token.split(".");
  if (partes.length !== 3) throw new TokenInvalido("Formato inválido");
  const [cabecalho, payload, assinatura] = partes;
  const header = json(cabecalho);
  if (header.alg !== "HS256") throw new TokenInvalido("Algoritmo não aceito");
  const esperada = createHmac("sha256", segredo)
    .update(`${cabecalho}.${payload}`)
    .digest();
  const recebida = decodificar(assinatura);
  if (recebida.length !== esperada.length || !timingSafeEqual(recebida, esperada))
    throw new TokenInvalido("Assinatura inválida");
  const claims = json(payload);
  if (typeof claims.exp !== "number" || claims.exp <= agora)
    throw new TokenInvalido("Token expirado");
  if (typeof claims.nbf === "number" && claims.nbf > agora)
    throw new TokenInvalido("Token ainda não válido");
  if (typeof claims.iat !== "number") throw new TokenInvalido("Claim iat ausente");
  if (claims.iss !== emissor) throw new TokenInvalido("Emissor inválido");
  if (typeof claims.sub !== "string" || typeof claims.role !== "string")
    throw new TokenInvalido("Claims obrigatórias ausentes");
  return claims as Claims;
}
