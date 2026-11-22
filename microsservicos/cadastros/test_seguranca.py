import base64
import json
import os
import time
import unittest

os.environ["JWT_SECRET"] = "segredo-de-teste-com-mais-de-32-caracteres-0123456789"
os.environ.setdefault("DATABASE_URL", "sqlite://")

import jwt  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from database import Base, get_db  # noqa: E402
from main import app  # noqa: E402

SEGREDO = os.environ["JWT_SECRET"]


def gerar_token(segredo=SEGREDO, **claims):
    agora = int(time.time())
    payload = {"sub": "usuario", "uid": 2, "role": "USER", "iss": "petshop-auth",
               "iat": agora, "exp": agora + 600, **claims}
    return jwt.encode(payload, segredo, algorithm="HS256")


def adulterar(token, **alteracoes):
    cabecalho, payload, assinatura = token.split(".")
    dados = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
    dados.update(alteracoes)
    novo = base64.urlsafe_b64encode(json.dumps(dados).encode()).rstrip(b"=").decode()
    return f"{cabecalho}.{novo}.{assinatura}"


def b64(obj):
    return base64.urlsafe_b64encode(json.dumps(obj).encode()).rstrip(b"=").decode()


class SegurancaCadastrosTest(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(engine)
        sessao = sessionmaker(bind=engine)
        def db():
            s = sessao()
            try:
                yield s
            finally:
                s.close()
        app.dependency_overrides[get_db] = db
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()

    def get(self, token=None):
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        return self.client.get("/clientes/", headers=headers)

    def test_health_publico(self):
        self.assertEqual(self.client.get("/health").status_code, 200)

    def test_sem_token_401(self):
        resposta = self.get()
        self.assertEqual(resposta.status_code, 401)
        self.assertIn("Bearer", resposta.headers["www-authenticate"])

    def test_token_valido_200(self):
        self.assertEqual(self.get(gerar_token()).status_code, 200)

    def test_payload_adulterado_401(self):
        self.assertEqual(self.get(adulterar(gerar_token(), role="ADMIN")).status_code, 401)

    def test_reassinado_com_segredo_padrao_do_jwtio_401(self):
        token = gerar_token(segredo="your-256-bit-secret-mas-com-32+-caracteres", role="ADMIN")
        self.assertEqual(self.get(token).status_code, 401)

    def test_alg_none_401(self):
        agora = int(time.time())
        token = f'{b64({"alg": "none", "typ": "JWT"})}.{b64({"sub": "x", "role": "ADMIN", "iss": "petshop-auth", "iat": agora, "exp": agora + 60})}.'
        self.assertEqual(self.get(token).status_code, 401)

    def test_expirado_401(self):
        self.assertEqual(self.get(gerar_token(exp=int(time.time()) - 5)).status_code, 401)

    def test_esquema_errado_401(self):
        resposta = self.client.get("/clientes/", headers={"Authorization": f"Basic {gerar_token()}"})
        self.assertEqual(resposta.status_code, 401)


if __name__ == "__main__":
    unittest.main()
