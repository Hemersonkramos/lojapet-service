from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, date

class EnderecoDTO(BaseModel):
    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    principal: Optional[bool] = True

    class Config:
        from_attributes = True

class PetBaseDTO(BaseModel):
    id: int
    nome: str
    especie: str
    raca: Optional[str] = None
    data_nascimento: Optional[date] = None
    porte: Optional[str] = None
    observacoes: Optional[str] = None
    ativo: Optional[bool] = True

    class Config:
        from_attributes = True

class ClienteCreateDTO(BaseModel):
    nome: str = Field(min_length=1, max_length=255)
    email: Optional[str] = Field(default=None, max_length=255)
    telefone: str
    ativo: bool = True
    enderecos: List[EnderecoDTO] = []

class ClienteUpdateDTO(BaseModel):
    model_config = ConfigDict(extra="forbid")
    nome: str = Field(min_length=1, max_length=255)
    email: Optional[str] = Field(default=None, max_length=255)
    telefone: str
    ativo: bool

class ClienteResponseDTO(BaseModel):
    id: int
    nome: str
    email: Optional[str] = None
    telefone: str
    ativo: bool
    data_cadastro: datetime
    enderecos: List[EnderecoDTO] = []
    pets: List[PetBaseDTO] = []

    class Config:
        from_attributes = True
