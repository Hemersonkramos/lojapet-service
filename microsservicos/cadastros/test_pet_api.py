import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from main import app
from database import Base, get_db
from models.cliente_model import ClienteModel
from models.pet_model import PetModel

class PetAPITest(unittest.TestCase):
    def test_pet_com_tutor_e_inexistente(self):
        engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(engine)
        sessions = sessionmaker(bind=engine)
        def db_override():
            with sessions() as db:
                yield db
        app.dependency_overrides[get_db] = db_override
        try:
            with sessions() as db:
                cliente = ClienteModel(nome="Tutor teste", telefone="11900000000", ativo=True)
                db.add(cliente)
                db.flush()
                pet = PetModel(nome="Luna", especie="Cachorro", cliente_id=cliente.id, ativo=True)
                db.add(pet)
                db.commit()
                pet_id, cliente_id = pet.id, cliente.id
            with TestClient(app) as api:
                response = api.get(f"/pets/{pet_id}")
                self.assertEqual(response.status_code, 200, response.text)
                self.assertEqual(response.json()["tutor"]["id"], cliente_id)
                self.assertEqual(response.json()["nome"], "Luna")
                self.assertEqual(api.get("/pets/999999").status_code, 404)
        finally:
            app.dependency_overrides.clear()
            engine.dispose()

if __name__ == "__main__":
    unittest.main()
