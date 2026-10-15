from sqlalchemy.orm import Session
from models.pet_model import PetModel

class PetRepository:
    def __init__(self, db: Session):
        self.db = db

    def buscar_por_id(self, pet_id: int):
        return self.db.query(PetModel).filter(PetModel.id == pet_id).first()