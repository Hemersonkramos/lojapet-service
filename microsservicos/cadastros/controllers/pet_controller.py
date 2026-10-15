from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from services.pet_service import PetService
from dtos.pet_dto import PetResponseDTO

router = APIRouter(prefix="/pets", tags=["Pets"])

@router.get("/{pet_id}", response_model=PetResponseDTO)
def obter_pet(pet_id: int, db: Session = Depends(get_db)):
    service = PetService(db)
    return service.obter_pet_por_id(pet_id)