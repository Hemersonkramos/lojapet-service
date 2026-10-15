import time
import argparse
from database import SessionLocal, Base, engine
from models.cliente_model import ClienteModel
from models.pet_model import PetModel
from models.outbox_model import OutboxModel
from repositories.outbox_repository import OutboxRepository
from services.cliente_service import ClienteService
def sincronizar():
    with SessionLocal() as db:
        try:
            for cliente in db.query(ClienteModel).order_by(ClienteModel.id).all():
                OutboxRepository().adicionar(db, cliente, "CLIENTE_ATUALIZADO")
            db.commit()
        except Exception:
            db.rollback()
            raise
def processar():
    with SessionLocal() as db:
        for record in db.query(OutboxModel).filter_by(published=False).order_by(OutboxModel.revision).limit(100).all():
            try:
                ClienteService().publicar(db, record)
            except Exception:
                print("Publicação pendente; nova tentativa em 3s", flush=True)
                break
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--sync", action="store_true")
    args = parser.parse_args()
    Base.metadata.create_all(engine)
    if args.sync:
        sincronizar()
    try:
        while True:
            processar()
            time.sleep(3)
    except KeyboardInterrupt:
        pass
