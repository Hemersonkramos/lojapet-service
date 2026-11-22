import base64
import hashlib
import hmac
import secrets

ITERACOES = 600_000


def gerar_hash(senha: str) -> str:
    sal = secrets.token_bytes(16)
    derivada = hashlib.pbkdf2_hmac("sha256", senha.encode("utf-8"), sal, ITERACOES)
    return "pbkdf2_sha256${}${}${}".format(
        ITERACOES,
        base64.b64encode(sal).decode(),
        base64.b64encode(derivada).decode(),
    )


def verificar(senha: str, armazenado: str) -> bool:
    try:
        esquema, iteracoes, sal, derivada = armazenado.split("$")
        if esquema != "pbkdf2_sha256":
            return False
        calculada = hashlib.pbkdf2_hmac(
            "sha256", senha.encode("utf-8"), base64.b64decode(sal), int(iteracoes)
        )
        return hmac.compare_digest(calculada, base64.b64decode(derivada))
    except (ValueError, TypeError):
        return False


HASH_FICTICIO = gerar_hash(secrets.token_urlsafe(16))
