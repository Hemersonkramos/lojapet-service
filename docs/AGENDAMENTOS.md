# Agendamentos com SQLite

Importado somente `microservico-agendamento` de https://github.com/ariellyba/microsservico-cadastros, commit `deeac107aeb5c1ef8de1961d4a086e13479c8263`. Cadastros e Gateway desse reposit?rio n?o foram incorporados por esta altera??o. Os servi?os que j? estavam neste projeto foram preservados.

O banco independente `microsservicos/agendamentos/agendamentos.db` ? criado automaticamente ao iniciar a API, com profissionais, servi?os, disponibilidade e agendamentos. N?o requer MySQL. O reposit?rio de origem n?o cont?m banco populado nem dump: esta adapta??o cria o esquema SQLite, mas n?o migra registros de um banco externo indispon?vel. Depois foi adicionada uma [carga fict?cia relacionada a Cadastros](DADOS-DEMO.md), inclu?da no banco e no ZIP.

## Executar

Na raiz do projeto, instale as depend?ncias (pode usar o ambiente Python j? existente):

```powershell
py -m venv .venv-entrega3
.\.venv-entrega3\Scripts\python.exe -m pip install -r microsservicos/agendamentos/requirements.lock.txt
Set-Location microsservicos/agendamentos
Copy-Item .env.example .env # apenas se ainda n?o existir
..\..\.venv-entrega3\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8083
```

Configure `.env` desta pasta com `CADASTROS_URL=http://127.0.0.1:8081` e a mesma `RABBITMQ_URL` usada pela Loja. O caminho padr?o do SQLite ? absoluto e independe da pasta de execu??o. Para outro arquivo, configure `AGENDAMENTOS_DATABASE_URL=sqlite:///C:/caminho/agendamentos.db`; a pasta deve existir. A vari?vel exclusiva evita reutilizar por engano o banco de Cadastros.

Swagger: http://localhost:8083/docs. O Gateway existente encaminha http://localhost:8080/agendamento/agendamentos se iniciado na porta 8080. N?o h? comunica??o direta Loja ? Agendamentos definida no c?digo original; ambos executam como servi?os independentes.

## Fluxo

1. Cadastre um profissional em `POST /profissionais` com `{"nome":"Ana"}`.
2. Cadastre um servi?o em `POST /servicos` com `{"nome":"Banho","preco":50.25,"duracao_minutos":30}`.
3. Use IDs reais de pet e cliente do Cadastros existente. A cria??o consulta `GET /pets/{pet_id}` na API de Cadastros, que precisa estar ligada.
4. Envie `POST /agendamentos`:

```json
{"pet_id":1,"cliente_id":1,"servico_id":1,"profissional_id":1,"inicio":"2026-10-19T10:00:00","fim":"2026-10-19T10:30:00","valor":50.25,"status":"agendado"}
```

`GET /agendamentos` lista; `GET`, `PUT` e `DELETE /agendamentos/{id}` consultam, substituem e excluem. `PUT` recebe todos os campos da cria??o. Servi?os e disponibilidades mant?m as rotas originais. IDs de profissionais/servi?os devem existir no SQLite (FKs habilitadas).

`POST /agendamentos/eventos` salva e publica `AGENDAMENTO_CRIADO` na fila dur?vel original `agendamentos_criados`. RabbitMQ s? ? necess?rio para essa rota e `consumer.py`; o CRUD comum funciona sem broker. O publicador agora usa URL com credenciais e confirma??o do broker. Para consumir, execute `..\..\.venv-entrega3\Scripts\python.exe consumer.py` nesta pasta. Esse consumidor original apenas registra o evento; n?o alimenta a Loja nem consome a fila de clientes dela.

Limita??es herdadas: n?o h? outbox/idempot?ncia nos eventos de agendamentos; se a publica??o falhar, retorna 503 mas o agendamento j? est? salvo. Consulte a listagem antes de repetir para evitar duplicatas. N?o h? verifica??o de sobreposi??o de hor?rios nem valida??o do v?nculo pet/cliente. A consulta de exist?ncia do pet foi preservada.

## Verificar

Na raiz:

```powershell
.\.venv-entrega3\Scripts\python.exe -m unittest discover -s microsservicos/agendamentos -p test_sqlite.py -v
```

O teste usa arquivo SQLite tempor?rio real: cria??o das quatro tabelas, CRUD, persist?ncia ap?s reabrir conex?o, valores, integridade e FKs. HTTP Cadastros e publica??o RabbitMQ s?o simulados; n?o demonstra integra??o com servi?os ativos. Build e testes existentes da Loja tamb?m foram executados.

O empacotamento inclui snapshot deste banco al?m dos bancos existentes. Se usar um caminho personalizado, ajuste `scripts/snapshot-dbs.cjs` antes de empacotar.
