from sqlalchemy.orm import Session
from models.cliente_model import ClienteModel, EnderecoModel
from dtos.cliente_dto import ClienteCreateDTO
from typing import Protocol
class IClienteRepository(Protocol):
    def criar_cliente(self, db: Session, cliente_data: ClienteCreateDTO) -> ClienteModel: ...
    def buscar_por_id(self, db: Session, cliente_id: int): ...

class ClienteRepository:

    @staticmethod
    def criar_cliente(db: Session, cliente_data: ClienteCreateDTO) -> ClienteModel:
        # Cria a instância principal do Cliente (sem os endereços por enquanto)
        novo_cliente = ClienteModel(
            nome=cliente_data.nome,
            email=cliente_data.email,
            telefone=cliente_data.telefone,
            ativo=cliente_data.ativo
        )
        db.add(novo_cliente)
        db.flush()  # Executa o flush para gerar o ID do cliente antes de inserir os endereços

        # Adiciona os endereços associados a este cliente
        for end_dto in cliente_data.enderecos:
            novo_endereco = EnderecoModel(
                cliente_id=novo_cliente.id,
                cep=end_dto.cep,
                logradouro=end_dto.logradouro,
                numero=end_dto.numero,
                complemento=end_dto.complemento,
                bairro=end_dto.bairro,
                cidade=end_dto.cidade,
                uf=end_dto.uf,
                principal=end_dto.principal
            )
            db.add(novo_endereco)

        db.flush()
        return novo_cliente

    @staticmethod
    def listar_clientes(db: Session):
        return db.query(ClienteModel).all()

    @staticmethod
    def buscar_por_id(db: Session, cliente_id: int):
        return db.query(ClienteModel).filter(ClienteModel.id == cliente_id).first()
