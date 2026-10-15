from sqlalchemy.orm import Session
import repository
import schemas
import os
import httpx
import producer

def criar_profissional(db: Session, profissional: schemas.ProfissionalCreate):
    return repository.criar_profissional(db, profissional)


def listar_profissionais(db: Session):
    return repository.listar_profissionais(db)


def excluir_profissional(db: Session, profissional_id: int):
    return repository.excluir_profissional(db, profissional_id)

# ---------------- SERVIÇOS ----------------

def criar_servico(db: Session, servico: schemas.ServicoCreate):
    return repository.criar_servico(db, servico)


def listar_servicos(db: Session):
    return repository.listar_servicos(db)


def atualizar_servico(db: Session, servico_id: int, dados: schemas.ServicoCreate):
    return repository.atualizar_servico(db, servico_id, dados)


def excluir_servico(db: Session, servico_id: int):
    return repository.excluir_servico(db, servico_id)

# ---------------- DISPONIBILIDADE ----------------

def criar_disponibilidade(
    db: Session,
    disponibilidade: schemas.DisponibilidadeCreate
):
    return repository.criar_disponibilidade(db, disponibilidade)


def listar_disponibilidades(db: Session):
    return repository.listar_disponibilidades(db)


def excluir_disponibilidade(db: Session, disponibilidade_id: int):
    return repository.excluir_disponibilidade(db, disponibilidade_id)
# ---------------- AGENDAMENTOS ----------------

def criar_agendamento(
    db: Session,
    agendamento: schemas.AgendamentoCreate
):
    if agendamento.fim <= agendamento.inicio:
        raise ValueError(
            "O horário de término deve ser posterior ao horário de início"
        )
    try:
        resposta = httpx.get(
            f"{os.getenv('CADASTROS_URL', 'http://127.0.0.1:8081').rstrip('/')}/pets/{agendamento.pet_id}",
            timeout=5
        )
    except httpx.RequestError:
        raise ValueError("Não foi possível consultar o microserviço de Cadastros")

    if resposta.status_code == 404:
        raise ValueError("Pet não encontrado no microserviço de Cadastros")

    if resposta.status_code != 200:
        raise ValueError("Erro ao consultar o microserviço de Cadastros")

    return repository.criar_agendamento(db, agendamento)


def listar_agendamentos(db: Session):
    return repository.listar_agendamentos(db)


def buscar_agendamento(db: Session, agendamento_id: int):
    return repository.buscar_agendamento(db, agendamento_id)


def atualizar_agendamento(
    db: Session,
    agendamento_id: int,
    dados: schemas.AgendamentoUpdate
):
    return repository.atualizar_agendamento(db, agendamento_id, dados)


def excluir_agendamento(db: Session, agendamento_id: int):
    return repository.excluir_agendamento(db, agendamento_id)
def criar_agendamento_com_evento(
    db: Session,
    agendamento: schemas.AgendamentoCreate
):
    novo = criar_agendamento(db, agendamento)

    evento = {
        "tipo": "AGENDAMENTO_CRIADO",
        "dados": {
            "id": novo.id,
            **agendamento.model_dump(mode="json")
        }
    }

    producer.publicar_agendamento(evento)

    return novo, evento

def processar_evento_agendamento(evento: dict):
    tipo = evento.get("tipo")

    if tipo == "AGENDAMENTO_CRIADO":
        dados = evento.get("dados", {})
        print(
            f"Agendamento {dados.get('id')} "
            "recebido e processado pelo Service."
        )

    elif tipo == "TESTE_CONEXAO":
        print("Mensagem de teste processada pelo Service.")

    else:
        raise ValueError(f"Tipo de evento desconhecido: {tipo}")