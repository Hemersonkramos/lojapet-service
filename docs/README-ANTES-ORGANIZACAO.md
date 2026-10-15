> Documento historico anterior a reorganizacao. Para caminhos e comandos atuais, consulte [README](../README.md).

# Pet Shop — Entrega 3 com SQLite

> **Carga demonstrativa atualizada:** os bancos e o ZIP agora possuem 6 clientes, 8 pets, 8 agendamentos, 15 produtos e 10 pedidos. Os n?meros e observa??es de bancos vazios abaixo descrevem o snapshot anterior ? carga. Consulte [dados de demonstra??o](docs/DADOS-DEMO.md).

Loja e Cadastros usam **bancos SQLite separados**, incluídos no pacote `artifacts/petshop-entrega3.zip`. Não é necessário instalar MySQL para executar. RabbitMQ continua obrigatório para a comunicação assíncrona; Node, Python e Docker precisam estar instalados, e a primeira instalação das dependências exige internet. O ZIP contém o projeto e os bancos, não os runtimes/dependências nem o estado interno do broker.

Fluxo: Cadastros (Python/FastAPI/SQLite) → RabbitMQ → Loja (Node/TypeScript/SQLite). Model, Repository com interfaces, Service, Controller, Request DTO e Response DTO foram preservados. Gateway e Agendamentos não foram modificados. [Origem do código de Cadastros e alterações anteriores preservadas](docs/CADASTROS-ORIGEM.md).

## Bancos e migração

- `data/loja.db`: cópia conferida do MySQL local, com 5 produtos, 2 pedidos, 4 itens e 2 retiradas. Entregas, pagamentos e projeção de clientes estavam vazios na origem. IDs, preços, status e histórico foram preservados, comparando todas as colunas copiadas.
- `integrations/cadastros/microservico-cadastro/cadastros.db`: banco independente de Cadastros, com tabelas criadas e sem clientes nesta sessão. O repositório do colega não incluía seu banco populado; se o grupo já possui clientes, use o arquivo SQLite existente dele e execute a sincronização descrita abaixo.
- O MySQL original foi preservado e continua disponível. A Loja usa SQLite por padrão (`DB_DRIVER=sqlite`). Para voltar ao MySQL: `DB_DRIVER=mysql` e configure `DB_*`.

O esquema SQLite está em `migrations/sqlite/001_schema.sql`: cria somente tabelas e índices ausentes, automaticamente ao abrir o banco. Não usa DROP. A migração MySQL `migrations/003_clientes_projecao.sql` permanece disponível para o modo opcional MySQL.

Para copiar novamente o MySQL para **outro arquivo SQLite vazio**, pare a Loja/Consumer e execute na raiz:

```powershell
$env:SQLITE_PATH='data/loja-nova.db'
npm.cmd run db:import:mysql
Remove-Item Env:SQLITE_PATH
```

Esse comando lê as credenciais MySQL do `.env`, abre um snapshot somente leitura da origem, copia as sete tabelas em uma transação SQLite e compara os valores de todas as colunas. Recusa destinos com registros e desfaz a cópia em caso de erro. Para usar o novo banco, ajuste `SQLITE_PATH` no `.env`. Não é necessário executar a importação para usar o banco já entregue no ZIP.

Valores monetários são texto decimal no SQLite, mantendo respostas como `"24.70"` e cálculos em centavos no Service. `FOR UPDATE` do MySQL foi substituído, no SQLite, por transações `BEGIN IMMEDIATE`, fila de operações na conexão e `busy_timeout=5000` entre processos. SQLite permite um escritor por vez; é adequado para a demonstração acadêmica local. API e Consumer da Loja devem apontar para o mesmo arquivo local; Cadastros usa outro arquivo. Não compartilhe o arquivo por pasta de rede entre computadores.

## Executar a partir do ZIP

Extraia o ZIP inteiro. Pré-requisitos: **Node 22.13+**, Python 3.12+ e Docker Desktop. O driver da Loja usa [SQLite nativo do Node](https://nodejs.org/docs/latest-v22.x/api/sqlite.html); algumas versões podem emitir aviso de recurso experimental. Execute os comandos da Loja sempre na raiz do projeto, pois caminhos de banco e migração são relativos a ela.

```powershell
npm.cmd ci
# Somente se ainda não existir .env:
Copy-Item .env.example .env
```

Edite `.env`: `DB_DRIVER=sqlite`, `SQLITE_PATH=data/loja.db`, `PORT=8082`; preencha `RABBITMQ_USER`, `RABBITMQ_PASSWORD` e `RABBITMQ_URL` com os mesmos usuário/senha. Exemplo de formato: `amqp://USUARIO:SENHA@localhost:5672/%2F`. Codifique caracteres especiais na URL. Não há credenciais reais no pacote. O `.env` da sessão foi preservado e pode conter `PORT=8083`: ajuste para 8082. `CADASTROS_*` é configuração legada, não usada para criar pedidos neste fluxo.

```powershell
docker compose up -d --wait
npm.cmd run rabbit:setup
npm.cmd run db:check
npm.cmd run build
npm.cmd start
```

`rabbit:setup` provisiona exchange/filas **sem consumir**. Execute antes de cadastrar o primeiro cliente, inclusive na demonstração com consumidor parado. Loja: `http://localhost:8082`. Painel RabbitMQ: `http://localhost:15672`, com as credenciais configuradas. O health da Loja indica vida da API; o Consumer é um processo separado.

Para Cadastros, outro terminal na raiz:

```powershell
py -m venv .venv-entrega3
.\.venv-entrega3\Scripts\python.exe -m pip install -r integrations/cadastros/microservico-cadastro/requirements-entrega3.lock.txt
Set-Location integrations/cadastros/microservico-cadastro
# Somente se não existir .env nesta pasta:
Copy-Item .env.example .env
# Edite RABBITMQ_URL: mesmo broker, usuário e senha da Loja.
..\..\..\.venv-entrega3\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8081
```

Cadastros usa `DATABASE_URL=sqlite:///./cadastros.db`, relativo à sua pasta de execução. Mantenha dois outros terminais:

```powershell
# Na pasta de Cadastros: recupera publicações pendentes
..\..\..\.venv-entrega3\Scripts\python.exe outbox_worker.py
```

```powershell
# Na raiz da Loja: processa eventos
npm.cmd run consumer
```

Portas seguem o mapa do Gateway atual do colega: Cadastros 8081, Loja 8082, Agendamentos 8083. Gateway não é necessário para esta demonstração. Para computadores diferentes, exponha a porta 5672 no Compose/firewall e use o IP do broker nas URLs AMQP; os bindings entregues estão restritos a localhost. Cada banco continua local ao seu serviço.

## Contrato e confiabilidade

Publish/Subscribe com exchange fanout durável `cadastros.clientes.v1`, fila quorum exclusiva da Loja `loja.clientes.v1`, exchange de falhas `loja.clientes.v1.dead` e fila `loja.clientes.v1.dlq`. Se Agendamentos participar, deve declarar **outra fila**, por exemplo `agendamentos.clientes.v1`, vinculada à mesma exchange. Serviços distintos não disputam a fila da Loja. O produtor conhece apenas o destino lógico e o contrato.

```json
{"event_id":"49e6a453-cba2-42ee-b0ab-1005f169f208","version":1,"evento":"CLIENTE_CADASTRADO","id_cliente":1,"revision":1,"nome":"Hemerson","email":"exemplo@email.com","ativo":true}
```

`revision` vem da sequência persistida da outbox e cresce entre eventos; não precisa ser consecutiva por cliente. Atualizações/desativações emitem `CLIENTE_ATUALIZADO` com o mesmo snapshot completo. Não exclua/recrie a outbox nem seu contador. Python e TypeScript validam uma fixture compartilhada desse contrato.

Controller recebe Request DTO → Service grava cliente, endereços e outbox na mesma transação, pelo Repository → publica DTO com mensagem persistente, `mandatory=True` e publisher confirms → Controller retorna Response DTO com **202 somente após confirmação do broker**, sem aguardar a Loja. Falha ao publicar retorna 503 e deixa a outbox pendente para recuperação. Se nenhuma fila estiver vinculada, a publicação falha e permanece pendente. `Idempotency-Key` é obrigatório no POST: repetir a mesma operação/chave retorna o cliente/evento original. Use uma chave nova para outra operação; não reutilize chave com outro corpo.

Consumer valida DTO → ClienteService → Repository faz upsert da projeção → ACK após commit. Eventos duplicados ou antigos não sobrescrevem revisões mais recentes. Queda depois do commit e antes do ACK pode reentregar com segurança. Falha de banco retenta após 1s, com limite de entrega 5 da quorum queue; mensagem inválida vai imediatamente para DLQ. Conexão perdida reconecta após 3s. Cancelamento do consumidor pelo broker também força reconexão. Não execute o `consumer.py` antigo de exemplo de Cadastros.

A DLQ exige inspeção/correção, sem reenvio automático infinito. A outbox mantém tentativas de publicação enquanto o broker estiver indisponível. Confirmação perdida ou queda após publicação pode gerar duplicação, coberta pela projeção idempotente. Dead lettering configura at-least-once e reject-publish, conforme a [documentação RabbitMQ](https://www.rabbitmq.com/docs/quorum-queues#dead-lettering). O Compose tem um broker e volume persistente; não oferece alta disponibilidade entre máquinas.

## Consistência eventual e sincronização

Cadastros continua sendo a fonte oficial. A Loja guarda somente nome, email, ativo e metadados, sem FK entre bancos. Pedidos consultam a projeção local: antes da chegada do evento, retornam **409 Cliente ainda não sincronizado**, sem criar pedido ou baixar estoque. Aguarde e repita. A resposta não distingue cliente inexistente de evento pendente.

Clientes já existentes são sincronizados com snapshots na outbox. Na pasta Cadastros, pare o worker anterior e execute:

```powershell
..\..\..\.venv-entrega3\Scripts\python.exe outbox_worker.py --sync
```

O comando sincroniza e permanece como worker. Use também para reconciliar a Loja após falhas corrigidas na DLQ. Para volume acadêmico, lê todos os clientes em uma transação; grandes volumes exigiriam paginação. Os pedidos históricos importados do MySQL permanecem preservados; não fabricamos clientes oficiais a partir dos IDs desses pedidos.

`PATCH /clientes/{id}` recebe nome, telefone, email e ativo; envie `ativo=false` para desativar. Endereços não fazem parte desse DTO de atualização. Mudança e evento são gravados juntos. Até a desativação chegar, uma compra ainda pode ser aceita por consistência eventual. Após o consumo, cliente inativo recebe 409; pedidos anteriores permanecem no histórico. Alterações diretas no SQLite exigem `--sync`.

## Postman e demonstração

Importe [docs/entrega3.postman_collection.json](docs/entrega3.postman_collection.json). Variáveis: `cadastrosUrl=http://localhost:8081`, `lojaUrl=http://localhost:8082`, `clienteId`, `requestKey`. A coleção antiga da Loja também foi mantida.

1. Ligue broker, prepare a topologia, inicie Cadastros e API Loja. Deixe **o Consumer da Loja parado**.
2. POST `/clientes/` com uma nova `Idempotency-Key`: mostre 202, `event_id` e `id_cliente` retornados.
3. No painel RabbitMQ, fila `loja.clientes.v1`: mostre Consumers=0 e mensagem em Ready. Não remova a mensagem usando Get com ACK.
4. Abra `data/loja.db` em um visualizador SQLite ou use o comando abaixo com o ID retornado. Antes de consumir, a projeção estará vazia para esse cliente.
5. Inicie `npm.cmd run consumer`; mostre Ready=0 e o cliente na projeção.
6. Repita POST com a mesma chave: mesmo cliente/evento. Faça PATCH com `ativo=false`; após consumir, confira ativo=0 e tente criar pedido (409).
7. Pare o broker e faça novo POST: 503, cliente + outbox persistidos. Reinicie: o worker publica sem cadastrar novamente. No SQLite Cadastros, confira `SELECT revision,event_id,published FROM event_outbox;`.

Consulta portátil, na raiz, substituindo o último argumento pelo ID:

```powershell
node scripts/consultar-cliente.cjs 1
```

Para verificar mensagens inválidas, publique `{}` na exchange pelo painel: deve chegar à DLQ. Falha prolongada de SQLite, como bloqueio de escrita, também termina na DLQ após o limite; corrija a causa e sincronize novamente.

## Testes executados e pendentes

Nesta sessão, 15/10/2026:

- Build TypeScript aprovado.
- `npm.cmd test`: **17 testes aprovados**. Inclui teste com SQLite real isolado: eventos duplicados/antigos, compra e valores monetários, estoque, pagamento, retirada, cancelamento, rollback, pedidos concorrentes sem vender acima do estoque e desativação. Testes antigos do client REST são regressão de código legado, não prova do fluxo atual.
- `npm.cmd run db:check`: sete tabelas verificadas no banco SQLite entregue (seis de negócio e projeção).
- Importação MySQL → SQLite executada com comparação de todos os valores e FKs. MySQL não foi alterado pela cópia.
- `npm.cmd run test:mysql`: teste opcional MySQL aprovado, mantendo compatibilidade com o banco anterior.
- Cinco testes Python com SQLite real em memória e publisher mock: contrato compartilhado, outbox/recuperação, repetição, rollback, HTTP 503/202 e atualização/desativação. Execute na pasta Cadastros: `..\..\..\.venv-entrega3\Scripts\python.exe -m unittest -v test_entrega3`.
- Integridade e FKs dos dois snapshots SQLite no pacote verificadas.

**Atualização em 15/10/2026:** Docker/Compose instalados, RabbitMQ iniciado com status Healthy, `npm.cmd run rabbit:setup` concluído e `npm.cmd run test:rabbit` aprovado (1 teste, 0 falhas). O teste usou broker e SQLite reais, com filas de teste exclusivas: publicação confirmada com consumidor parado, persistência, duplicação, mensagem inválida e DLQ após falhas limitadas. O produtor desse teste é Node; os testes Python anteriores usam publisher mock. Continuam pendentes a demonstração completa Python → RabbitMQ → Consumer Loja no Postman, reinício/reconexão do broker e execução entre computadores.

Se o Compose informar que RABBITMQ_USER/PASSWORD estão ausentes, execute `node scripts/configure-rabbit.cjs` na raiz. O script preserva as outras configurações locais, cria credenciais quando ausentes e configura a mesma URL AMQP nos .env da Loja e de Cadastros, sem imprimir senhas. Ele é para o broker local deste Compose; não o use para substituir URLs de um broker remoto. Se o volume do broker já tiver sido inicializado com outras credenciais, preserve-as: alterar o .env não muda usuários já gravados no RabbitMQ.

## Empacotar e Git

O ZIP inclui os tr?s bancos SQLite por solicitação do usuário, com snapshots consistentes feitos por `VACUUM INTO`, sem depender de arquivos WAL temporários. Não inclui `.env`, senhas locais, node_modules, ambientes virtuais ou metadados Git. Para regenerar, na raiz:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/package.ps1
```

O script inclui `SQLITE_PATH` da Loja, `cadastros.db` da pasta de Cadastros e `integrations/agendamentos/agendamentos.db`, além dos fontes. Se Cadastros usar outro arquivo em DATABASE_URL, ajuste o script antes de empacotar. Os bancos são ignorados no Git, mas entram explicitamente no ZIP. Arquivos novos são criados automaticamente quando ausentes.

Branch local: `entrega-3-rabbitmq`; sem push ou merge. Para abrir PR por conta própria, revise as alterações (incluindo as preexistentes), depois:

```powershell
git status --short
git add .
git commit -m "Entrega 3 com RabbitMQ e bancos SQLite portáteis"
git push -u origin entrega-3-rabbitmq
gh pr create --base main --head entrega-3-rabbitmq --title "Entrega 3: eventos e SQLite" --body "Implementa outbox, projeção idempotente, SQLite e pacote portátil. Consulte README para execução e testes."
```

Para o repositório do colega, copie o código de `integrations/cadastros/microservico-cadastro` em uma branch própria, preservando o `.env` e o banco dele. Documentação anterior arquivada: [Entrega 2](docs/README-ENTREGA2.md) e [versão MySQL da Entrega 3](docs/README-MYSQL.md). As instruções atuais são as deste README.
