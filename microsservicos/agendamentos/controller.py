from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import schemas
import service
import producer
import pika
from database import SessionLocal

router = APIRouter()
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        # ---------- PROFISSIONAIS ----------

@router.post("/profissionais", response_model=schemas.ProfissionalResponse)
def criar_profissional(
    profissional: schemas.ProfissionalCreate,
    db: Session = Depends(get_db)
):
    return service.criar_profissional(db, profissional)


@router.get("/profissionais")
def listar_profissionais(
    db: Session = Depends(get_db)
):
    return service.listar_profissionais(db)
@router.delete("/profissionais/{profissional_id}")
def excluir_profissional(
    profissional_id: int,
    db: Session = Depends(get_db)
):
    profissional = service.excluir_profissional(db, profissional_id)

    if not profissional:
        raise HTTPException(
            status_code=404,
            detail="Profissional não encontrado"
        )

    return {"mensagem": "Profissional excluído com sucesso"}
# ---------- SERVIÇOS ----------

@router.post("/servicos")
def criar_servico(
    servico: schemas.ServicoCreate,
    db: Session = Depends(get_db)
):
    return service.criar_servico(db, servico)


@router.get("/servicos")
def listar_servicos(
    db: Session = Depends(get_db)
):
    return service.listar_servicos(db)

@router.put("/servicos/{servico_id}")
def atualizar_servico(
    servico_id: int,
    servico: schemas.ServicoCreate,
    db: Session = Depends(get_db)
):
    servico_atualizado = service.atualizar_servico(
        db,
        servico_id,
        servico
    )

    if not servico_atualizado:
        raise HTTPException(
            status_code=404,
            detail="Serviço não encontrado"
        )

    return servico_atualizado


@router.delete("/servicos/{servico_id}")
def excluir_servico(
    servico_id: int,
    db: Session = Depends(get_db)
):
    servico = service.excluir_servico(db, servico_id)

    if not servico:
        raise HTTPException(
            status_code=404,
            detail="Serviço não encontrado"
        )

    return {"mensagem": "Serviço excluído com sucesso"}

# ---------- DISPONIBILIDADES ----------

@router.post("/disponibilidades")
def criar_disponibilidade(
    disponibilidade: schemas.DisponibilidadeCreate,
    db: Session = Depends(get_db)
):
    return service.criar_disponibilidade(db, disponibilidade)


@router.get("/disponibilidades")
def listar_disponibilidades(
    db: Session = Depends(get_db)
):
    return service.listar_disponibilidades(db)

@router.delete("/disponibilidades/{disponibilidade_id}")
def excluir_disponibilidade(
    disponibilidade_id: int,
    db: Session = Depends(get_db)
):
    disponibilidade = service.excluir_disponibilidade(
        db,
        disponibilidade_id
    )

    if not disponibilidade:
        raise HTTPException(
            status_code=404,
            detail="Disponibilidade não encontrada"
        )

    return {"mensagem": "Disponibilidade excluída com sucesso"}

    # ---------- AGENDAMENTOS ----------

@router.post("/agendamentos")
def criar_agendamento(
    agendamento: schemas.AgendamentoCreate,
    db: Session = Depends(get_db)
):
    try:
        return service.criar_agendamento(db, agendamento)
    except ValueError as erro:
        raise HTTPException(
            status_code=400,
            detail=str(erro)
        )

@router.get("/agendamentos")
def listar_agendamentos(
    db: Session = Depends(get_db)
):
    return service.listar_agendamentos(db)

@router.get("/agendamentos/{agendamento_id}")
def buscar_agendamento(
    agendamento_id: int,
    db: Session = Depends(get_db)
):
    agendamento = service.buscar_agendamento(
        db,
        agendamento_id
    )

    if not agendamento:
        raise HTTPException(
            status_code=404,
            detail="Agendamento não encontrado"
        )

    return agendamento

@router.put("/agendamentos/{agendamento_id}")
def atualizar_agendamento(
    agendamento_id: int,
    dados: schemas.AgendamentoUpdate,
    db: Session = Depends(get_db)
):
    agendamento = service.atualizar_agendamento(
        db,
        agendamento_id,
        dados
    )

    if not agendamento:
        raise HTTPException(
            status_code=404,
            detail="Agendamento não encontrado"
        )

    return agendamento

@router.delete("/agendamentos/{agendamento_id}")
def excluir_agendamento(
    agendamento_id: int,
    db: Session = Depends(get_db)
):
    agendamento = service.excluir_agendamento(
        db,
        agendamento_id
    )

    if not agendamento:
        raise HTTPException(
            status_code=404,
            detail="Agendamento não encontrado"
        )

    return {"mensagem": "Agendamento excluído com sucesso"}



@router.post("/agendamentos/eventos", status_code=202)
def publicar_evento_agendamento(
    agendamento: schemas.AgendamentoCreate,
    db: Session = Depends(get_db)
):
    try:
        novo, evento = service.criar_agendamento_com_evento(
            db, agendamento
        )

    except ValueError as erro:
        raise HTTPException(
            status_code=400,
            detail=str(erro)
        )

    except pika.exceptions.AMQPError:
        raise HTTPException(
            status_code=503,
            detail="Agendamento salvo, mas evento não enviado"
        )

    return {
        "mensagem": "Agendamento salvo e evento enviado",
        "evento": evento
    }