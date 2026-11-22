import os
from contextvars import ContextVar

import jwt
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

ALGORITMOS_ACEITOS = ["HS256"]
EMISSOR = os.getenv("JWT_ISSUER", "petshop-auth")
ROTAS_PUBLICAS = {"/", "/health", "/docs", "/openapi.json"}

token_atual: ContextVar[str | None] = ContextVar("token_atual", default=None)


def _segredo() -> str:
    segredo = os.getenv("JWT_SECRET", "")
    if len(segredo) < 32:
        raise RuntimeError("Configure JWT_SECRET com pelo menos 32 caracteres aleatórios")
    return segredo


def validar_token(token: str) -> dict:
    return jwt.decode(
        token,
        _segredo(),
        algorithms=ALGORITMOS_ACEITOS,
        issuer=EMISSOR,
        options={"require": ["exp", "iat", "sub", "role"]},
    )


def _nao_autorizado(mensagem: str) -> JSONResponse:
    return JSONResponse(
        status_code=401,
        content={"detail": mensagem},
        headers={"WWW-Authenticate": 'Bearer error="invalid_token"'},
    )


async def middleware_jwt(request: Request, call_next):
    if request.method == "OPTIONS" or request.url.path in ROTAS_PUBLICAS:
        return await call_next(request)
    cabecalho = request.headers.get("authorization", "")
    esquema, _, token = cabecalho.partition(" ")
    if esquema.lower() != "bearer" or not token.strip():
        return _nao_autorizado("Token ausente. Envie Authorization: Bearer <token>")
    token = token.strip()
    try:
        claims = validar_token(token)
    except jwt.ExpiredSignatureError:
        return _nao_autorizado("Token expirado")
    except jwt.InvalidTokenError:
        return _nao_autorizado("Token inválido: assinatura ou claims não conferem")
    request.state.usuario = claims
    marcador = token_atual.set(token)
    try:
        return await call_next(request)
    finally:
        token_atual.reset(marcador)


def exigir_role(*papeis: str):
    def verificar(request: Request) -> dict:
        claims = getattr(request.state, "usuario", None)
        if claims is None:
            raise HTTPException(status_code=401, detail="Token ausente")
        if claims.get("role") not in papeis:
            raise HTTPException(status_code=403, detail="Permissão insuficiente")
        return claims
    return verificar


def cabecalho_autorizacao() -> dict:
    token = token_atual.get()
    return {"Authorization": f"Bearer {token}"} if token else {}
