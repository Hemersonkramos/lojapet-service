from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

import config
import senhas
import tokens
import usuarios


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in: int


@asynccontextmanager
async def lifespan(_app):
    config.segredo_jwt()
    usuarios.iniciar_banco()
    yield


app = FastAPI(
    lifespan=lifespan,
    title="Authorization Server - PetShop",
    description="Responsável exclusivamente pela identidade: valida credenciais e emite JWT (HS256).",
    version="1.0.0",
)


@app.get("/")
def raiz():
    return {"servico": "auth", "status": "ok"}


@app.get("/health")
def health():
    return {"servico": "auth", "status": "ok"}


@app.post("/login", response_model=TokenResponse)
def login(dados: LoginRequest):
    usuario = usuarios.buscar(dados.username)
    hash_armazenado = usuario["senha_hash"] if usuario else senhas.HASH_FICTICIO
    senha_ok = senhas.verificar(dados.password, hash_armazenado)
    if not usuario or not senha_ok or not usuario["ativo"]:
        raise HTTPException(
            status_code=401,
            detail="Usuário ou senha inválidos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token, expira_em = tokens.emitir(usuario)
    return TokenResponse(access_token=token, expires_in=expira_em)
