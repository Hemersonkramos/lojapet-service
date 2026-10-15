from fastapi import FastAPI
from database import Base, engine
from controllers import cliente_controller, pet_controller

# Cria as tabelas no banco de dados SQLite
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Microsserviço de Cadastros - PetShop",
    description="Gerenciamento de Clientes, Endereços e Pets",
    version="1.0.0"
)

# Inclui os routers dos controllers
app.include_router(cliente_controller.router)
app.include_router(pet_controller.router)

@app.get("/")
def root():
    return {"mensagem": "Microsserviço de Cadastros a funcionar com sucesso!"}