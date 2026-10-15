from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class PetModel(Base):
    __tablename__ = "pets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    nome = Column(String, nullable=False)
    especie = Column(String, nullable=False)
    raca = Column(String, nullable=True)
    data_nascimento = Column(Date, nullable=True)
    porte = Column(String, nullable=True)
    observacoes = Column(String, nullable=True)
    ativo = Column(Boolean, default=True, nullable=False)

    cliente = relationship("ClienteModel", back_populates="pets")