import { assinarHs256 } from "../src/security/jwt.js";

export const SEGREDO_TESTE = "segredo-de-teste-com-mais-de-32-caracteres-0123456789";
process.env.JWT_SECRET ??= SEGREDO_TESTE;
process.env.JWT_ISSUER ??= "petshop-auth";

const b64 = (valor: unknown) => Buffer.from(JSON.stringify(valor)).toString("base64url");

export function gerarToken(
  claims: Record<string, unknown> = {},
  segredo = process.env.JWT_SECRET!,
  header: Record<string, unknown> = { alg: "HS256", typ: "JWT" },
) {
  const agora = Math.floor(Date.now() / 1000);
  const payload = { sub: "usuario", uid: 2, role: "USER", iss: "petshop-auth", iat: agora, exp: agora + 600, ...claims };
  const conteudo = `${b64(header)}.${b64(payload)}`;
  return `${conteudo}.${assinarHs256(conteudo, segredo)}`;
}

export function adulterarPayload(token: string, alteracoes: Record<string, unknown>) {
  const [cabecalho, payload, assinatura] = token.split(".");
  const original = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  return `${cabecalho}.${b64({ ...original, ...alteracoes })}.${assinatura}`;
}
