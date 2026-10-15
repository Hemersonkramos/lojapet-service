from sqlalchemy import Column, Integer, String, Boolean, DECIMAL, DateTime, Time, Text, ForeignKey
from database import Base
from datetime import datetime

class Profissional(Base):
    __tablename__ = "profissionais"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255), nullable=False)
    ativo = Column(Boolean, default=True)


class Servico(Base):
    __tablename__ = "servicos"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255), nullable=False)
    descricao = Column(String(255))
    preco = Column(DECIMAL(10, 2))
    duracao_minutos = Column(Integer)
    ativo = Column(Boolean, default=True)


class Disponibilidade(Base):
    __tablename__ = "disponibilidade"

    id = Column(Integer, primary_key=True, index=True)
    profissional_id = Column(Integer, ForeignKey("profissionais.id"))
    dia_semana = Column(Integer)
    hora_inicio = Column(Time)
    hora_fim = Column(Time)


class Agendamento(Base):
    __tablename__ = "agendamentos"

    id = Column(Integer, primary_key=True, index=True)
    pet_id = Column(Integer)
    cliente_id = Column(Integer)
    servico_id = Column(Integer, ForeignKey("servicos.id"))
    profissional_id = Column(Integer, ForeignKey("profissionais.id"))
    inicio = Column(DateTime)
    fim = Column(DateTime)
    valor = Column(DECIMAL(10, 2))
    status = Column(String(255))
    observacoes = Column(Text)
    criado_em = Column(DateTime, default=datetime.now)