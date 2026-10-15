from typing import Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field
class ClienteEventoDTO(BaseModel):
    model_config = ConfigDict(extra="forbid")
    event_id: UUID
    version: Literal[1] = 1
    evento: Literal["CLIENTE_CADASTRADO", "CLIENTE_ATUALIZADO"]
    id_cliente: int = Field(gt=0, le=9007199254740991)
    revision: int = Field(gt=0, le=9007199254740991)
    nome: str = Field(min_length=1, max_length=255)
    email: str | None = Field(max_length=255)
    ativo: bool
class CadastroAcceptedDTO(BaseModel):
    mensagem: str
    dados: ClienteEventoDTO
