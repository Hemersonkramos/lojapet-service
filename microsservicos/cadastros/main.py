from fastapi import FastAPI
from database import Base, engine
from controllers import cliente_controller, pet_controller
from seguranca import middleware_jwt

# Cria as tabelas no banco de dados SQLite
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Microsserviço de Cadastros - PetShop",
    description="Gerenciamento de Clientes, Endereços e Pets",
    version="1.0.0"
)

app.middleware("http")(middleware_jwt)

# Inclui os routers dos controllers
app.include_router(cliente_controller.router)
app.include_router(pet_controller.router)

@app.get("/")
def root():
    return {"mensagem": "Microsserviço de Cadastros a funcionar com sucesso!"}


@app.get("/health")
def health():
    return {"servico": "cadastros", "status": "ok"}
