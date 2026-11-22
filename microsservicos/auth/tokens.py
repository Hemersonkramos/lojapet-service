import time
import uuid

import jwt

import config


def emitir(usuario) -> tuple[str, int]:
    agora = int(time.time())
    expira_em = config.EXPIRACAO_MINUTOS * 60
    payload = {
        "sub": usuario["username"],
        "uid": usuario["id"],
        "role": usuario["role"],
        "iss": config.EMISSOR,
        "iat": agora,
        "exp": agora + expira_em,
        "jti": str(uuid.uuid4()),
    }
    token = jwt.encode(payload, config.segredo_jwt(), algorithm=config.ALGORITMO)
    return token, expira_em
