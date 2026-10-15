from sqlalchemy.orm import Session
import models
import schemas


# ---------- PROFISSIONAIS ----------

def criar_profissional(db: Session, profissional: schemas.ProfissionalCreate):
    novo_profissional = models.Profissional(
        nome=profissional.nome,
        ativo=profissional.ativo
    )

    db.add(novo_profissional)
    db.commit()
    db.refresh(novo_profissional)

    return novo_profissional


def listar_profissionais(db: Session):
    return db.query(models.Profissional).all()


def buscar_profissional(db: Session, profissional_id: int):
    return db.query(models.Profissional).filter(
        models.Profissional.id == profissional_id
    ).first()


def excluir_profissional(db: Session, profissional_id: int):
    profissional = buscar_profissional(db, profissional_id)

    if profissional:
        db.delete(profissional)
        db.commit()

    return profissional

# ---------- SERVIÇOS ----------

def criar_servico(db: Session, servico: schemas.ServicoCreate):
    novo_servico = models.Servico(
        nome=servico.nome,
        descricao=servico.descricao,
        preco=servico.preco,
        duracao_minutos=servico.duracao_minutos,
        ativo=servico.ativo
    )

    db.add(novo_servico)
    db.commit()
    db.refresh(novo_servico)

    return novo_servico


def listar_servicos(db: Session):
    return db.query(models.Servico).all()


def buscar_servico(db: Session, servico_id: int):
    return db.query(models.Servico).filter(
        models.Servico.id == servico_id
    ).first()


def excluir_servico(db: Session, servico_id: int):
    servico = buscar_servico(db, servico_id)

    if servico:
        db.delete(servico)
        db.commit()

    return servico

# ---------- DISPONIBILIDADE ----------

def criar_disponibilidade(
    db: Session,
    disponibilidade: schemas.DisponibilidadeCreate
):
    nova_disponibilidade = models.Disponibilidade(
        profissional_id=disponibilidade.profissional_id,
        dia_semana=disponibilidade.dia_semana,
        hora_inicio=disponibilidade.hora_inicio,
        hora_fim=disponibilidade.hora_fim
    )

    db.add(nova_disponibilidade)
    db.commit()
    db.refresh(nova_disponibilidade)

    return nova_disponibilidade


def listar_disponibilidades(db: Session):
    return db.query(models.Disponibilidade).all()


def excluir_disponibilidade(db: Session, disponibilidade_id: int):
    disponibilidade = db.query(models.Disponibilidade).filter(
        models.Disponibilidade.id == disponibilidade_id
    ).first()

    if disponibilidade:
        db.delete(disponibilidade)
        db.commit()

    return disponibilidade

# ---------- AGENDAMENTOS ----------

def criar_agendamento(db: Session, agendamento: schemas.AgendamentoCreate):
    novo_agendamento = models.Agendamento(
        pet_id=agendamento.pet_id,
        cliente_id=agendamento.cliente_id,
        servico_id=agendamento.servico_id,
        profissional_id=agendamento.profissional_id,
        inicio=agendamento.inicio,
        fim=agendamento.fim,
        valor=agendamento.valor,
        status=agendamento.status,
        observacoes=agendamento.observacoes
    )

    db.add(novo_agendamento)
    db.commit()
    db.refresh(novo_agendamento)

    return novo_agendamento


def listar_agendamentos(db: Session):
    return db.query(models.Agendamento).all()


def buscar_agendamento(db: Session, agendamento_id: int):
    return db.query(models.Agendamento).filter(
        models.Agendamento.id == agendamento_id
    ).first()


def excluir_agendamento(db: Session, agendamento_id: int):
    agendamento = buscar_agendamento(db, agendamento_id)

    if agendamento:
        db.delete(agendamento)
        db.commit()

    return agendamento

def atualizar_agendamento(
    db: Session,
    agendamento_id: int,
    dados: schemas.AgendamentoUpdate
):
    agendamento = buscar_agendamento(db, agendamento_id)

    if not agendamento:
        return None

    agendamento.pet_id = dados.pet_id
    agendamento.cliente_id = dados.cliente_id
    agendamento.servico_id = dados.servico_id
    agendamento.profissional_id = dados.profissional_id
    agendamento.inicio = dados.inicio
    agendamento.fim = dados.fim
    agendamento.valor = dados.valor
    agendamento.status = dados.status
    agendamento.observacoes = dados.observacoes

    db.commit()
    db.refresh(agendamento)

    return agendamento