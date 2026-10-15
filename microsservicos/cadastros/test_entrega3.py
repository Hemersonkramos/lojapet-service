import json
import unittest
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi import HTTPException
from fastapi.testclient import TestClient
from unittest.mock import patch
from database import Base, get_db
from models.cliente_model import ClienteModel, EnderecoModel
from models.pet_model import PetModel
from models.outbox_model import OutboxModel
from dtos.cliente_dto import ClienteCreateDTO
from dtos.evento_dto import ClienteEventoDTO
from services.cliente_service import ClienteService
from main import app

class Entrega3Test(unittest.TestCase):
    def setUp(self):
        self.engine=create_engine("sqlite://",connect_args={"check_same_thread":False},poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.session=sessionmaker(bind=self.engine, expire_on_commit=False)
        self.db=self.session()
        self.data=ClienteCreateDTO(nome="Hemerson",telefone="86999999999",email="exemplo@email.com",enderecos=[{"cidade":"Teresina"}])
    def tearDown(self):
        app.dependency_overrides.clear()
        self.db.close()
        self.engine.dispose()
    def test_contract(self):
        fixture=Path(__file__).resolve().parents[1]/"loja"/"tests"/"fixtures"/"cliente-evento.json"
        dto=ClienteEventoDTO.model_validate_json(fixture.read_text())
        self.assertEqual(dto.model_dump(mode="json"),json.loads(fixture.read_text()))
    def test_outbox_failure_recovery_and_duplicate_request(self):
        sent=[]
        def offline(_): raise ConnectionError("broker offline")
        with self.assertRaises(HTTPException) as error:
            ClienteService(publisher=offline).criar(self.db,self.data,"request-1")
        self.assertEqual(error.exception.status_code,503)
        self.assertEqual(self.db.query(ClienteModel).count(),1)
        self.assertEqual(self.db.query(EnderecoModel).count(),1)
        self.assertFalse(self.db.query(OutboxModel).one().published)
        svc=ClienteService(publisher=sent.append)
        first=svc.criar(self.db,self.data,"request-1")
        second=svc.criar(self.db,self.data,"request-1")
        self.assertEqual(first.event_id,second.event_id)
        self.assertEqual(len(sent),1)
        self.assertTrue(self.db.query(OutboxModel).one().published)
        self.assertEqual(self.db.query(ClienteModel).count(),1)
    def test_transaction_rollback(self):
        class BrokenOutbox:
            def adicionar(self,*args): raise RuntimeError("outbox insert failed")
        with self.assertRaises(RuntimeError):
            ClienteService(outbox=BrokenOutbox()).criar(self.db,self.data,"fail")
        self.assertEqual(self.db.query(ClienteModel).count(),0)
        self.assertEqual(self.db.query(EnderecoModel).count(),0)
    def test_http_202_after_confirm_only(self):
        app.dependency_overrides[get_db]=lambda:self.db
        with TestClient(app) as client:
            with patch("services.cliente_service.publicar_evento_cadastro",side_effect=ConnectionError):
                response=client.post("/clientes/",headers={"Idempotency-Key":"http-1"},json=self.data.model_dump())
                self.assertEqual(response.status_code,503)
            with patch("services.cliente_service.publicar_evento_cadastro") as publish:
                response=client.post("/clientes/",headers={"Idempotency-Key":"http-1"},json=self.data.model_dump())
                self.assertEqual(response.status_code,202)
                publish.assert_called_once()
                self.assertEqual(response.json()["dados"]["evento"],"CLIENTE_CADASTRADO")
    def test_update_deactivation(self):
        svc=ClienteService(publisher=lambda _:None)
        original=svc.criar(self.db,self.data,"update")
        updated=svc.atualizar(self.db,original.id_cliente,self.data.model_copy(update={"ativo":False}))
        self.assertGreater(updated.revision,original.revision)
        self.assertFalse(updated.ativo)
        self.assertEqual(updated.evento,"CLIENTE_ATUALIZADO")

if __name__=="__main__": unittest.main()
