import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")

ALGORITMO = "HS256"
EMISSOR = os.getenv("JWT_ISSUER", "petshop-auth")
EXPIRACAO_MINUTOS = int(os.getenv("JWT_EXPIRES_MINUTES", "30"))
DATABASE_PATH = os.getenv("AUTH_DATABASE_PATH", str(ROOT / "auth.db"))


def segredo_jwt() -> str:
    segredo = os.getenv("JWT_SECRET", "")
    if len(segredo) < 32:
        raise RuntimeError("Configure JWT_SECRET com pelo menos 32 caracteres aleatórios")
    return segredo
