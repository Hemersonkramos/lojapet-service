from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session
from database import get_db
from services.cliente_service import ClienteService
from dtos.cliente_dto import ClienteCreateDTO, ClienteResponseDTO, ClienteUpdateDTO
from dtos.evento_dto import CadastroAcceptedDTO
from repositories.cliente_repository import ClienteRepository
router = APIRouter(prefix="/clientes", tags=["Clientes"])
@router.post("/", status_code=202, response_model=CadastroAcceptedDTO)
def criar_cliente(data: ClienteCreateDTO, db: Session = Depends(get_db),
    idempotency_key: str = Header(min_length=1, max_length=128)):
    evento = ClienteService().criar(db, data, idempotency_key)
    return CadastroAcceptedDTO(mensagem="Persistido e publicação confirmada pelo broker", dados=evento)
@router.get("/", response_model=list[ClienteResponseDTO])
def listar(db: Session = Depends(get_db)):
    return ClienteRepository.listar_clientes(db)
@router.patch("/{cliente_id}", status_code=202, response_model=CadastroAcceptedDTO)
def atualizar(cliente_id: int, data: ClienteUpdateDTO, db: Session = Depends(get_db)):
    evento = ClienteService().atualizar(db, cliente_id, data)
    return CadastroAcceptedDTO(mensagem="Atualização publicada", dados=evento)
