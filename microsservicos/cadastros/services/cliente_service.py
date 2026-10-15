from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from repositories.cliente_repository import ClienteRepository, IClienteRepository
from repositories.outbox_repository import OutboxRepository, IOutboxRepository
from models.outbox_model import OutboxModel
from messaging import publicar_evento_cadastro
from dtos.evento_dto import ClienteEventoDTO
class ClienteService:
    def __init__(self, repository: IClienteRepository | None = None,
                 outbox: IOutboxRepository | None = None, publisher=None):
        self.repository = repository or ClienteRepository()
        self.outbox = outbox or OutboxRepository()
        self.publisher = publisher or publicar_evento_cadastro

    def publicar(self, db, record):
        payload = record.payload
        if not record.published:
            try:
                self.publisher(payload)
                record.published = True
                db.commit()
            except Exception:
                db.rollback()
                raise HTTPException(503, detail={"mensagem": "Gravado localmente; publicação pendente na outbox. Repita com a mesma Idempotency-Key.",
                    "event_id": str(ClienteEventoDTO.model_validate_json(payload).event_id)})
        return ClienteEventoDTO.model_validate_json(payload)

    def criar(self, db, data, request_key):
        record = db.query(OutboxModel).filter_by(request_key=request_key).first()
        if record:
            return self.publicar(db, record)
        try:
            cliente = self.repository.criar_cliente(db, data)
            record = self.outbox.adicionar(db, cliente, "CLIENTE_CADASTRADO", request_key)
            db.commit()
        except IntegrityError:
            db.rollback()
            record = db.query(OutboxModel).filter_by(request_key=request_key).one()
        except Exception:
            db.rollback()
            raise
        return self.publicar(db, record)

    def atualizar(self, db, cliente_id, data):
        cliente = self.repository.buscar_por_id(db, cliente_id)
        if not cliente:
            raise HTTPException(404, "Cliente não encontrado")
        try:
            cliente.nome, cliente.email = data.nome, data.email
            cliente.telefone, cliente.ativo = data.telefone, data.ativo
            record = self.outbox.adicionar(db, cliente, "CLIENTE_ATUALIZADO")
            db.commit()
        except Exception:
            db.rollback()
            raise
        return self.publicar(db, record)
