from pydantic import BaseModel
from datetime import datetime, time
from typing import Optional


# ---------- PROFISSIONAL ----------

class ProfissionalCreate(BaseModel):
    nome: str
    ativo: bool = True


# ---------- SERVIÇO ----------

class ServicoCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None
    preco: float
    duracao_minutos: int
    ativo: bool = True


# ---------- DISPONIBILIDADE ----------

class DisponibilidadeCreate(BaseModel):
    profissional_id: int
    dia_semana: int
    hora_inicio: time
    hora_fim: time


# ---------- AGENDAMENTO ----------

class AgendamentoCreate(BaseModel):
    pet_id: int
    cliente_id: int
    servico_id: int
    profissional_id: int
    inicio: datetime
    fim: datetime
    valor: float
    status: str = "agendado"
    observacoes: Optional[str] = None


class AgendamentoUpdate(BaseModel):
        pet_id: int
        cliente_id: int
        servico_id: int
        profissional_id: int
        inicio: datetime
        fim: datetime
        valor: float
        status: str = "agendado"
        observacoes: Optional[str] = None
class ProfissionalResponse(BaseModel):
    id: int
    nome: str
    ativo: bool

    model_config = {"from_attributes": True}

class ServicoResponse(BaseModel):
    id: int
    nome: str
    descricao: Optional[str] = None
    preco: float
    duracao_minutos: int
    ativo: bool

    model_config = {"from_attributes": True}

class AgendamentoResponse(BaseModel):
    id: int
    pet_id: int
    cliente_id: int
    servico_id: int
    profissional_id: int
    inicio: datetime
    fim: datetime
    valor: float
    status: str
    observacoes: Optional[str] = None
    criado_em: Optional[datetime] = None

    model_config = {"from_attributes": True}
