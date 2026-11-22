import os
import sqlite3
from contextlib import closing
from pathlib import Path

import config
import senhas

PAPEIS = ("USER", "ADMIN")


def _conectar() -> sqlite3.Connection:
    Path(config.DATABASE_PATH).parent.mkdir(parents=True, exist_ok=True)
    conexao = sqlite3.connect(config.DATABASE_PATH, timeout=5)
    conexao.row_factory = sqlite3.Row
    return conexao


def iniciar_banco() -> None:
    with closing(_conectar()) as db, db:
        db.execute(
            """CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                senha_hash TEXT NOT NULL,
                role TEXT NOT NULL CHECK (role IN ('USER', 'ADMIN')),
                ativo INTEGER NOT NULL DEFAULT 1
            )"""
        )
    for username, role, variavel in (
        ("admin", "ADMIN", "AUTH_ADMIN_PASSWORD"),
        ("usuario", "USER", "AUTH_USER_PASSWORD"),
    ):
        senha = os.getenv(variavel)
        if senha:
            criar_se_ausente(username, senha, role)


def criar_se_ausente(username: str, senha: str, role: str) -> None:
    if role not in PAPEIS:
        raise ValueError("Papel inválido")
    with closing(_conectar()) as db, db:
        db.execute(
            "INSERT OR IGNORE INTO usuarios (username, senha_hash, role) VALUES (?, ?, ?)",
            (username, senhas.gerar_hash(senha), role),
        )


def buscar(username: str):
    with closing(_conectar()) as db:
        return db.execute(
            "SELECT id, username, senha_hash, role, ativo FROM usuarios WHERE username = ?",
            (username,),
        ).fetchone()
