# PetShop - tres microsservicos e API Gateway

[Baixar pacote com fontes e os tres bancos populados](entregas/petshop-entrega3.zip). Extraia o ZIP em uma pasta separada e siga a instalacao abaixo. O Git guarda os fontes; os bancos populados estao dentro deste pacote.

O projeto esta organizado por componente. As rotas, portas, regras de negocio, comunicacao RabbitMQ e registros dos bancos foram preservados.

```text
api-gateway/                  # FastAPI: entrada unica, porta 8080
microsservicos/
  cadastros/                  # FastAPI + SQLite, porta 8081
  loja/                       # Node/TypeScript + SQLite, porta 8082
    src/
    tests/
    migrations/
    scripts/
    data/loja.db
    package.json
  agendamentos/               # FastAPI + SQLite, porta 8083
frontend/                     # Pasta reservada; interface nao encontrada nos fontes
scripts/                      # Inicializacao, dados demo e empacotamento do sistema
docs/                         # Contratos, colecoes Postman e documentacao
compose.yaml                  # RabbitMQ compartilhado
package.json                  # npm workspace e comandos na raiz
```

## Instalar

Requisitos: Node 22.13+, Python 3.12+ e Docker Desktop iniciado. Execute na raiz:

```powershell
npm.cmd ci
py -m venv .venv-entrega3
.\.venv-entrega3\Scripts\python.exe -m pip install -r microsservicos/cadastros/requirements-entrega3.lock.txt
```

Esse ambiente Python compartilhado atende tambem Agendamentos e Gateway (FastAPI, SQLAlchemy, httpx, pika, uvicorn). Os requirements de cada componente continuam em suas pastas para instalacao separada.

Somente se ainda nao existirem, copie os exemplos de configuracao:

```powershell
Copy-Item .env.example .env
Copy-Item microsservicos/loja/.env.example microsservicos/loja/.env
Copy-Item microsservicos/cadastros/.env.example microsservicos/cadastros/.env
Copy-Item microsservicos/agendamentos/.env.example microsservicos/agendamentos/.env
```

O `.env` da raiz configura o RabbitMQ do Compose. Cada microsservico tem seu proprio `.env`. Mantenha as credenciais existentes do broker. Para configurar o broker local deste Compose nos quatro arquivos, use `node scripts/configure-rabbit.cjs`; esse comando preserva credenciais da raiz e cria as ausentes. Nao o use para substituir configuracao de um broker remoto. Alterar credenciais no `.env` nao altera usuarios de um volume RabbitMQ ja inicializado.

Loja: `DB_DRIVER=sqlite`, `SQLITE_PATH=data/loja.db`, `PORT=8082`.
Cadastros: `DATABASE_URL=sqlite:///./cadastros.db`.
Agendamentos: banco padrao `agendamentos.db` na sua pasta e `CADASTROS_URL=http://127.0.0.1:8081`.

## Iniciar e parar

Na raiz:

```powershell
npm.cmd run services:start
```

Inicia RabbitMQ, prepara as filas, compila a Loja e inicia APIs, Gateway, Consumer da Loja e worker da outbox em segundo plano. Grava logs em `artifacts/runtime` e verifica as APIs e as tres rotas do Gateway. As portas devem estar livres.

```powershell
npm.cmd run services:stop
```

Encerra somente os processos registrados pelo script de inicializacao, conferindo PID e horario de inicio. RabbitMQ permanece ligado. Se quiser para-lo: `docker compose stop`.

| Componente | Consulta |
| --- | --- |
| Cadastros | http://localhost:8081/clientes/ |
| Loja | http://localhost:8082/produtos |
| Agendamentos | http://localhost:8083/agendamentos |
| Gateway - Cadastros | http://localhost:8080/cadastros/clientes/ |
| Gateway - Loja | http://localhost:8080/loja/produtos |
| Gateway - Agendamentos | http://localhost:8080/agendamento/agendamentos |
| RabbitMQ | http://localhost:15672 |

`POST /clientes/` exige `Idempotency-Key` e broker disponivel. A Loja recebe clientes pelo Consumer; compras de clientes novos podem retornar 409 ate a sincronizacao. Agendamentos consulta a existencia do pet na API de Cadastros. O Gateway foi mantido com o prefixo original singular `/agendamento/`.

O frontend nao estava presente nos arquivos disponiveis. `frontend/README.md` registra a pasta reservada; nao existe servidor de front para iniciar.

## Executar componentes individualmente

Os comandos npm existentes continuam funcionando na raiz: `npm.cmd run dev`, `npm.cmd run build`, `npm.cmd start`, `npm.cmd test`, `npm.cmd run consumer` e `npm.cmd run db:check`. Sao encaminhados ao workspace Loja. Tambem podem ser executados diretamente em `microsservicos/loja`.

Para Python, abra um terminal por componente, a partir da raiz:

```powershell
Set-Location microsservicos/cadastros
..\..\.venv-entrega3\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8081
```

```powershell
Set-Location microsservicos/agendamentos
..\..\.venv-entrega3\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8083
```

```powershell
Set-Location api-gateway
..\.venv-entrega3\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8080
```

Outbox: na pasta de Cadastros, execute `..\..\.venv-entrega3\Scripts\python.exe outbox_worker.py`. Para sincronizar clientes anteriores, acrescente `--sync`.

## Dados, testes e pacote

Os tres bancos SQLite foram movidos com seus dados existentes, incluindo insercoes feitas pelo Postman. Nao houve nova carga ou alteracao de IDs. O script `scripts/popular-demo.py` usa os novos caminhos; sua carga e ficticia e evita repeticao.

```powershell
npm.cmd run build
npm.cmd test
npm.cmd run db:check
.\.venv-entrega3\Scripts\python.exe -m unittest discover -s microsservicos/cadastros -p "test_*.py" -v
.\.venv-entrega3\Scripts\python.exe -m unittest discover -s microsservicos/agendamentos -p test_sqlite.py -v
node scripts/check-package.cjs
powershell -ExecutionPolicy Bypass -File scripts/package.ps1
```

O ZIP `artifacts/petshop-entrega3.zip` inclui snapshots consistentes dos tres bancos e os fontes organizados. Exclui `.env`, dependencias, ambientes virtuais e metadados Git. Bancos SQLite sao ignorados no Git. Para caminhos de banco personalizados, ajuste os scripts compartilhados de snapshots, verificacao e carga antes de executa-los.

Colecao Postman: [inserir e buscar nas tres APIs](docs/tres-apis.postman_collection.json). [Dados ficticios da carga inicial](docs/DADOS-DEMO.md). [Detalhes de Agendamentos](docs/AGENDAMENTOS.md).

Documentacao anterior, com caminhos e quantidades historicos: [README anterior](docs/README-ANTES-ORGANIZACAO.md). As instrucoes de organizacao e inicializacao atuais sao as deste README.
