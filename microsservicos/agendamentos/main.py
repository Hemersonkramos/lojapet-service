from contextlib import asynccontextmanager
from database import init_db
from fastapi import FastAPI
from controller import router
from seguranca import middleware_jwt

@asynccontextmanager
async def lifespan(app):
    init_db()
    yield

app = FastAPI(
    lifespan=lifespan,
    title="Microserviço de Agendamentos",
    version="1.0.0"
)

app.middleware("http")(middleware_jwt)

app.include_router(router)


@app.get("/")
def inicio():
    return {"mensagem": "Microserviço de Agendamentos funcionando!"}


@app.get("/health")
def health():
    return {"servico": "agendamentos", "status": "ok"}
