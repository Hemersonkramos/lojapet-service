import os
import tempfile
import time
import unittest
from unittest.mock import patch

os.environ["JWT_SECRET"] = "segredo-de-teste-com-mais-de-32-caracteres-0123456789"
os.environ["AGENDAMENTOS_DATABASE_URL"] = "sqlite:///" + os.path.join(tempfile.mkdtemp(), "ag.db").replace("\\", "/")

import httpx  # noqa: E402
import jwt  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from main import app  # noqa: E402


def token(role="USER"):
    agora = int(time.time())
    return jwt.encode({"sub": role.lower(), "role": role, "iss": "petshop-auth", "iat": agora,
                       "exp": agora + 600}, os.environ["JWT_SECRET"], algorithm="HS256")


class SegurancaAgendamentosTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ctx = TestClient(app)
        cls.client = cls.ctx.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.ctx.__exit__(None, None, None)

    def h(self, role="USER"):
        return {"Authorization": f"Bearer {token(role)}"}

    def test_sem_token_401(self):
        self.assertEqual(self.client.get("/servicos").status_code, 401)

    def test_user_le_mas_nao_administra(self):
        self.assertEqual(self.client.get("/servicos", headers=self.h()).status_code, 200)
        corpo = {"nome": "Banho", "preco": 50, "duracao_minutos": 30}
        self.assertEqual(self.client.post("/servicos", json=corpo, headers=self.h()).status_code, 403)
        self.assertEqual(self.client.post("/servicos", json=corpo, headers=self.h("ADMIN")).status_code, 200)

    def test_token_repassado_para_cadastros(self):
        capturado = {}
        def falso_get(url, headers=None, timeout=None):
            capturado["headers"] = headers or {}
            return httpx.Response(404, request=httpx.Request("GET", url))
        corpo = {"pet_id": 1, "cliente_id": 1, "servico_id": 1, "profissional_id": 1,
                 "inicio": "2026-12-01T10:00:00", "fim": "2026-12-01T11:00:00", "valor": 50}
        cabecalho = self.h()
        with patch("service.httpx.get", falso_get):
            resposta = self.client.post("/agendamentos", json=corpo, headers=cabecalho)
        self.assertEqual(resposta.status_code, 400)
        self.assertEqual(capturado["headers"].get("Authorization"), cabecalho["Authorization"])


if __name__ == "__main__":
    unittest.main()
