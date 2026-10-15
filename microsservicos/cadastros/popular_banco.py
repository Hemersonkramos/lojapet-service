from database import SessionLocal
from models.tutor_model import TutorModel
from models.pet_model import PetModel

# Abre uma sessão com a base de dados
db = SessionLocal()

print("A inserir dados de teste...")

# 1. Cria um tutor de teste
novo_tutor = TutorModel(
    nome="Gabriel Alves",
    cpf="123.456.789-00",
    telefone="(86) 99999-8888",
    email="gabriel.alves@email.com"
)
db.add(novo_tutor)
db.commit()
db.refresh(novo_tutor)

# 2. Cria um pet associado ao ID do tutor gerado acima
novo_pet = PetModel(
    tutor_id=novo_tutor.id,
    nome="Jubileu",
    especie="Cachorro",
    raca="Poodle",
    peso=7.5
)
db.add(novo_pet)
db.commit()

print(f"Sucesso! Tutor ID {novo_tutor.id} e Pet ID {novo_pet.id} criados na base de dados.")

# Fecha a sessão
db.close()