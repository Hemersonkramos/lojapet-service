import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient

_tmp = tempfile.TemporaryDirectory()
os.environ["AGENDAMENTOS_DATABASE_URL"] = "sqlite:///" + (Path(_tmp.name) / "test.db").as_posix()
from main import app
from database import engine
from sqlalchemy import inspect, text

class SQLiteIntegrationTest(unittest.TestCase):
    @classmethod
    def tearDownClass(cls):
        engine.dispose()
        _tmp.cleanup()

    def test_fluxo_persistencia_e_eventos(self):
        with TestClient(app) as api:
            self.assertEqual(len(inspect(engine).get_table_names()), 4)
            profissional = api.post("/profissionais", json={"nome": "Ana"}).json()
            servico = api.post("/servicos", json={"nome": "Banho", "preco": 45.50, "duracao_minutos": 30}).json()
            self.assertEqual(api.put(f"/servicos/{servico['id']}", json={"nome": "Banho atualizado", "preco": 50.25, "duracao_minutos": 30}).status_code, 200)
            self.assertEqual(api.post("/disponibilidades", json={"profissional_id": profissional["id"], "dia_semana": 1, "hora_inicio": "08:00:00", "hora_fim": "18:00:00"}).status_code, 200)
            dados = {"pet_id": 1, "cliente_id": 1, "servico_id": servico["id"], "profissional_id": profissional["id"], "inicio": "2026-10-19T10:00:00", "fim": "2026-10-19T10:30:00", "valor": 50.25}
            with patch("service.httpx.get") as consulta:
                consulta.return_value.status_code = 404
                self.assertEqual(api.post("/agendamentos", json=dados).status_code, 400)
                consulta.return_value.status_code = 200
                resposta = api.post("/agendamentos", json=dados)
                self.assertEqual(resposta.status_code, 200, resposta.text)
                ident = resposta.json()["id"]
                with patch("producer.publicar_agendamento") as publicar:
                    self.assertEqual(api.post("/agendamentos/eventos", json=dados).status_code, 202)
                    self.assertEqual(publicar.call_args.args[0]["tipo"], "AGENDAMENTO_CRIADO")
            dados["status"] = "concluido"
            self.assertEqual(api.put(f"/agendamentos/{ident}", json=dados).status_code, 200)
        engine.dispose()
        with TestClient(app) as api:
            salvo = api.get(f"/agendamentos/{ident}").json()
            self.assertEqual(salvo["status"], "concluido")
            self.assertEqual(float(salvo["valor"]), 50.25)
            self.assertEqual(api.delete(f"/agendamentos/{ident}").status_code, 200)
            self.assertEqual(api.get(f"/agendamentos/{ident}").status_code, 404)
        with engine.connect() as conn:
            self.assertEqual(conn.execute(text("PRAGMA foreign_keys")).scalar(), 1)
            self.assertEqual(conn.execute(text("PRAGMA integrity_check")).scalar(), "ok")
            self.assertEqual(conn.execute(text("PRAGMA foreign_key_check")).all(), [])

if __name__ == "__main__":
    unittest.main()
