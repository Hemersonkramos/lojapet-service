import os
import time

import jwt

os.environ.setdefault("JWT_SECRET", "segredo-de-teste-com-mais-de-32-caracteres-0123456789")


def cabecalho_auth(role: str = "ADMIN") -> dict:
    agora = int(time.time())
    token = jwt.encode(
        {"sub": role.lower(), "role": role, "iss": os.getenv("JWT_ISSUER", "petshop-auth"),
         "iat": agora, "exp": agora + 600},
        os.environ["JWT_SECRET"], algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}
