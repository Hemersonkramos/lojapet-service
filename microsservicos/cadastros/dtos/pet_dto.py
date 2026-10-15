from pydantic import BaseModel
from typing import Optional

class TutorSimpleDTO(BaseModel):
    id: int
    nome: str
    telefone: str

    class Config:
        from_attributes = True

class PetResponseDTO(BaseModel):
    id: int
    nome: str
    especie: str
    raca: Optional[str] = None
    peso: Optional[float] = None
    tutor: TutorSimpleDTO

    class Config:
        from_attributes = True