from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class ClienteModel(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nome = Column(String, nullable=False)
    email = Column(String, nullable=True)
    telefone = Column(String, nullable=False)
    ativo = Column(Boolean, default=True, nullable=False)
    data_cadastro = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relacionamentos conforme o diagrama de arquitetura
    pets = relationship("PetModel", back_populates="cliente", cascade="all, delete")
    enderecos = relationship("EnderecoModel", back_populates="cliente", cascade="all, delete")


class EnderecoModel(Base):
    __tablename__ = "enderecos"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    cep = Column(String, nullable=True)
    logradouro = Column(String, nullable=True)
    numero = Column(String, nullable=True)
    complemento = Column(String, nullable=True)
    bairro = Column(String, nullable=True)
    cidade = Column(String, nullable=True)
    uf = Column(String, nullable=True)
    principal = Column(Boolean, default=True, nullable=False)

    cliente = relationship("ClienteModel", back_populates="enderecos")