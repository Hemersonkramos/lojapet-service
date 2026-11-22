import os
import tempfile
import time
import unittest

_tmp = tempfile.mkdtemp()
os.environ["AUTH_DATABASE_PATH"] = os.path.join(_tmp, "auth.db")
os.environ["JWT_SECRET"] = "segredo-de-teste-com-mais-de-32-caracteres-0123456789"
os.environ["AUTH_ADMIN_PASSWORD"] = "senha-admin-teste"
os.environ["AUTH_USER_PASSWORD"] = "senha-usuario-teste"

import jwt  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import config  # noqa: E402
from main import app  # noqa: E402


class AuthorizationServerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ctx = TestClient(app)
        cls.client = cls.ctx.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.ctx.__exit__(None, None, None)

    def login(self, username, password):
        return self.client.post("/login", json={"username": username, "password": password})

    def test_credenciais_invalidas_retorna_401(self):
        self.assertEqual(self.login("usuario", "errada").status_code, 401)
        self.assertEqual(self.login("inexistente", "x").status_code, 401)

    def test_login_emite_jwt_hs256_com_claims_minimas(self):
        resposta = self.login("usuario", "senha-usuario-teste")
        self.assertEqual(resposta.status_code, 200)
        corpo = resposta.json()
        self.assertEqual(corpo["token_type"], "Bearer")
        token = corpo["access_token"]
        self.assertEqual(jwt.get_unverified_header(token)["alg"], "HS256")
        claims = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=["HS256"], issuer="petshop-auth")
        self.assertEqual(claims["sub"], "usuario")
        self.assertEqual(claims["role"], "USER")
        self.assertEqual(claims["exp"] - claims["iat"], config.EXPIRACAO_MINUTOS * 60)
        self.assertGreater(claims["exp"], time.time())
        for proibido in ("password", "senha", "senha_hash", "email", "cpf"):
            self.assertNotIn(proibido, claims)

    def test_admin_recebe_role_admin(self):
        token = self.login("admin", "senha-admin-teste").json()["access_token"]
        self.assertEqual(jwt.decode(token, options={"verify_signature": False})["role"], "ADMIN")

    def test_segredo_fraco_e_recusado(self):
        anterior = os.environ["JWT_SECRET"]
        os.environ["JWT_SECRET"] = "your-256-bit-secret"
        try:
            with self.assertRaises(RuntimeError):
                config.segredo_jwt()
        finally:
            os.environ["JWT_SECRET"] = anterior


if __name__ == "__main__":
    unittest.main()
