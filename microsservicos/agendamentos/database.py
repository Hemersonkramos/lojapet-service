import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")
DATABASE_URL = os.getenv("AGENDAMENTOS_DATABASE_URL", "sqlite:///" + (ROOT / "agendamentos.db").as_posix())
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False, "timeout": 5})

@event.listens_for(engine, "connect")
def configurar_sqlite(connection, _):
    connection.execute("PRAGMA foreign_keys=ON")
    connection.execute("PRAGMA busy_timeout=5000")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def init_db():
    import models
    Base.metadata.create_all(bind=engine)
