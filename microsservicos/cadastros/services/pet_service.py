from sqlalchemy.orm import Session
from repositories.pet_repository import PetRepository
from fastapi import HTTPException

class PetService:
    def __init__(self, db: Session):
        self.repository = PetRepository(db)

    def obter_pet_por_id(self, pet_id: int):
        pet = self.repository.buscar_por_id(pet_id)
        if not pet:
            raise HTTPException(status_code=404, detail="Pet não encontrado no sistema.")
        return {
            "id": pet.id,
            "nome": pet.nome,
            "especie": pet.especie,
            "raca": pet.raca,
            "tutor": pet.cliente,
        }
