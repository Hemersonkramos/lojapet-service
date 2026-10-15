from typing import Protocol
from uuid import uuid4
from models.outbox_model import OutboxModel
from dtos.evento_dto import ClienteEventoDTO
class IOutboxRepository(Protocol):
    def adicionar(self, db, cliente, evento: str, request_key: str | None = None) -> OutboxModel: ...
class OutboxRepository:
    def adicionar(self, db, cliente, evento, request_key=None):
        record = OutboxModel(event_id=str(uuid4()), request_key=request_key, payload="", published=False)
        db.add(record)
        db.flush()
        dto = ClienteEventoDTO(event_id=record.event_id, evento=evento,
            revision=record.revision, id_cliente=cliente.id, nome=cliente.nome,
            email=cliente.email, ativo=cliente.ativo)
        record.payload = dto.model_dump_json()
        db.flush()
        return record
