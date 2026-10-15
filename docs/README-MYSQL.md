# Pet Shop — Entrega 3

Cadastros (Python/FastAPI/SQLite) → RabbitMQ → Loja (Node/TypeScript/MySQL). Implementação baseada no PDF **DSD - Entrega 3 - 01_10_26.pdf**, lido integralmente, e no código atual de Cadastros, commit `09809bdcc88389567f6a8d21bffc94e679d84763`. [Origem e alterações preservadas](docs/CADASTROS-ORIGEM.md).

Branch local: `entrega-3-rabbitmq`. Não houve push, merge ou alteração remota. O código completo de Cadastros atualizado está em `microsservicos/cadastros`. Não é um submódulo.

## Arquitetura e contrato

O Controller recebe o Request DTO; o Service usa Repository com interface para gravar cliente, endereços e outbox na mesma transação SQLite. Depois serializa o Event DTO e publica com mensagem persistente, `mandatory=True` e confirmação do broker. Só retorna **202** após confirmação, sem aguardar a Loja. O Response DTO inclui o evento e seu ID. Falha de publicação retorna **503**, preservando cliente e outbox pendente; o worker recupera a publicação. `Idempotency-Key` obrigatório no POST evita cadastrar novamente ao repetir uma requisição cujo resultado ficou incerto. Use a mesma chave somente para a mesma operação; uma chave já utilizada retorna o resultado original.

Padrão **Publish/Subscribe**: exchange fanout durável `cadastros.clientes.v1`; fila durável quorum da Loja `loja.clientes.v1`; dead letter exchange `loja.clientes.v1.dead` e fila `loja.clientes.v1.dlq`. Agendamentos, se participar, deve criar **outra fila**, por exemplo `agendamentos.clientes.v1`, vinculada à mesma exchange. Somente instâncias da Loja compartilham a fila da Loja. Cadastros conhece apenas a exchange e o contrato; o provisionamento das filas é responsabilidade da infraestrutura/consumidores.

Contrato JSON v1, validado em Python e TypeScript com fixture compartilhada:

```json
{"event_id":"49e6a453-cba2-42ee-b0ab-1005f169f208","version":1,"evento":"CLIENTE_CADASTRADO","id_cliente":1,"revision":1,"nome":"Hemerson","email":"exemplo@email.com","ativo":true}
```

`revision` é a sequência persistida da outbox; cresce entre eventos, sem precisar ser consecutiva por cliente. Atualizações e desativações emitem `CLIENTE_ATUALIZADO`, com o mesmo formato completo. A Loja faz upsert pela chave `id_cliente` e só aceita revisões maiores: duplicações e eventos antigos não sobrescrevem dados recentes. Não há FK entre bancos. Cadastros é a fonte oficial; a projeção contém somente nome, email, ativo e metadados.

O Consumer valida o DTO, chama ClienteService → IClienteRepository → MySQL e só envia ACK após commit. Contrato inválido vai diretamente para DLQ; erro transitório tenta novamente após 1s, com limite de entrega 5 da quorum queue, incluindo reentregas por queda do processo. Falhas de conexão levam à reconexão após 3s. DLQ precisa de inspeção e correção; não há retorno automático para a fila principal. Não use o antigo `consumer.py` de exemplo do colega.

A topologia configura dead lettering at-least-once e `reject-publish`, conforme a [documentação RabbitMQ](https://www.rabbitmq.com/docs/quorum-queues#dead-lettering). O Compose usa um único broker com volume persistente: não oferece alta disponibilidade entre máquinas. Confirmação perdida ou queda após publicar e antes de marcar a outbox pode duplicar eventos; a projeção idempotente cobre esse caso. A outbox retenta publicações enquanto pendentes; erros de processamento na Loja têm limite e DLQ. Não exclua/recrie a outbox nem seu contador.

## Preparar e executar no Windows

Pré-requisitos: Node 22+, Python 3.12+, MySQL existente com as seis tabelas da Loja e Docker Desktop para o broker. Não recrie o banco da Loja. A migration adiciona apenas `clientes_projecao`; já foi aplicada no MySQL disponível nesta sessão.

Na raiz:

```powershell
npm.cmd ci
# Somente se não existir .env:
Copy-Item .env.example .env
```

Edite `.env`: configure MySQL, `PORT=8082`, `RABBITMQ_USER`, `RABBITMQ_PASSWORD` e `RABBITMQ_URL`. O `.env` existente foi preservado e pode conter `PORT=8083`; ajuste-o para evitar conflito com Agendamentos. `CADASTROS_*` é configuração legada, não é usada para criar pedidos na Entrega 3. Não exponha credenciais no código. Senhas com caracteres especiais devem ser codificadas na URL AMQP.

Execute **uma vez** `migrations/003_clientes_projecao.sql` no MySQL Workbench, com `banco_loja` selecionado. É incremental e repetível, sem DROP. Em seguida:

```powershell
docker compose up -d --wait
npm.cmd run rabbit:setup
npm.cmd run build
npm.cmd start
```

`rabbit:setup` cria exchange, filas e bindings **sem iniciar o consumo**. É obrigatório antes da primeira publicação, inclusive quando o consumidor estiver parado. Sem fila vinculada, `mandatory=True` faz a publicação falhar e a outbox fica pendente. A API Loja fica em `http://localhost:8082` e o painel RabbitMQ em `http://localhost:15672` com as credenciais do `.env`. O health da API indica vida do processo, não prontidão do consumidor separado.

Em outro terminal, para preparar Cadastros:

```powershell
py -m venv .venv-entrega3
.\.venv-entrega3\Scripts\python.exe -m pip install -r microsservicos/cadastros/requirements-entrega3.lock.txt
Set-Location microsservicos/cadastros
# Somente se não existir .env nesta pasta:
Copy-Item .env.example .env
# Edite RABBITMQ_URL com o mesmo broker. DATABASE_URL deve apontar para o SQLite existente.
..\..\..\.venv-entrega3\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8081
```

Use a pasta de Cadastros como diretório de execução: `sqlite:///./cadastros.db` é relativo a ela. Para preservar dados do colega, aponte `DATABASE_URL` para o arquivo existente ou copie esse arquivo com o serviço parado. `create_all` cria apenas tabelas ausentes, incluindo a outbox; não recria tabelas existentes. O ZIP original da Loja não apareceu como arquivo nesta sessão; foi utilizado o projeto Git local fornecido, preservando suas alterações.

Em outro terminal, a partir da pasta de Cadastros, mantenha a recuperação da outbox ligada:

```powershell
..\..\..\.venv-entrega3\Scripts\python.exe outbox_worker.py
```

Para iniciar o consumidor da Loja, outro terminal **na raiz**:

```powershell
npm.cmd run consumer
```

Para executar entre computadores, use o IP do broker em `RABBITMQ_URL`, libere a porta 5672 no firewall e ajuste os bindings do Compose, atualmente restritos a localhost. A API da Loja também escuta em localhost; o fluxo de eventos não precisa expor essa API. Gateway não é necessário. O mapa atual do colega usa Cadastros 8081, Loja 8082 e Agendamentos 8083; os comandos acima seguem esse mapa.

## Consistência eventual e clientes existentes

Pedidos consultam exclusivamente a projeção MySQL. Um cliente recém-criado ainda pode não ter chegado: a Loja responde **409 Cliente ainda não sincronizado**, sem criar pedido ou baixar estoque. Aguarde o consumo e repita. Essa resposta não diferencia cliente inexistente de sincronização pendente. Cliente inativo também recebe 409.

Antes de usar clientes já cadastrados, com a topologia preparada, execute na pasta Cadastros:

```powershell
..\..\..\.venv-entrega3\Scripts\python.exe outbox_worker.py --sync
```

O comando cria snapshots completos na outbox e continua como worker. Pare a outra instância do worker antes; não é necessário manter dois. Também serve para reconstruir/reconciliar uma projeção após corrigir falhas na DLQ. Para volumes acadêmicos, a sincronização lê todos os clientes em uma transação; volumes grandes exigem paginação.

`PATCH /clientes/{id}` recebe nome, telefone, email e ativo (todos os dados básicos desejados; endereços não são editados por essa operação). Envie `ativo=false` para desativar. A alteração e seu evento são persistidos juntos. Alterações feitas diretamente no SQLite ou fora deste Service não geram evento: execute `--sync`. Até chegar a desativação, uma compra ainda pode ser aceita, consequência explícita da consistência eventual; pedidos anteriores permanecem no histórico. Não há exclusão física de clientes nesta API.

## Postman e demonstração

Importe [a coleção da Entrega 3](docs/entrega3.postman_collection.json); a coleção antiga da Loja continua disponível. As variáveis são `cadastrosUrl=http://localhost:8081`, `lojaUrl=http://localhost:8082`, `clienteId` e `requestKey`.

1. Inicie RabbitMQ, execute `rabbit:setup`, ligue Cadastros e a API Loja. Deixe **somente o consumidor da Loja parado**.
2. Execute POST `/clientes/` no Postman com uma nova `Idempotency-Key`. Mostre o **202**, `event_id` e `id_cliente` retornados.
3. No painel RabbitMQ → Queues → `loja.clientes.v1`, mostre a mensagem em **Ready**, com Consumers=0. Não use Get messages com ACK para inspecionar, pois removeria o evento.
4. No Workbench: `SELECT * FROM clientes_projecao WHERE id_cliente = <id_retornado>;` deve estar vazio antes do consumo.
5. Execute `npm.cmd run consumer`. Mostre o log de conexão, Ready=0 e o registro MySQL pela mesma consulta.
6. Repita o POST com a **mesma chave**: retorna o mesmo evento/cliente. Testes automatizados adicionais reenviam o mesmo evento ao Repository e verificam idempotência.
7. Faça PATCH com `ativo=false`; após o consumo, confira `ativo=0`. Tente criar pedido e mostre 409.
8. Pare o broker e faça novo POST: recebe 503, cliente + outbox ficam no SQLite. Reinicie o broker; o worker publica sem novo cadastro. Consulte `SELECT revision,event_id,published FROM event_outbox;` no SQLite.

Para mensagens inválidas, publique `{}` na exchange pelo painel: deve ir para `loja.clientes.v1.dlq`. Se MySQL ficar indisponível por tempo suficiente, o evento válido também irá para DLQ após o limite; corrija a causa e use `--sync` para reconciliar. Não envie eventos inválidos à produção.

## Testes e evidências

Executados nesta sessão em 15/10/2026:

- `npm.cmd run build`: TypeScript aprovado.
- `npm.cmd test`: 16 testes aprovados, incluindo contrato, ACK após persistência, falha transitória, inválido para DLQ e cliente não sincronizado/inativo. Testes antigos do client REST continuam como regressão de código legado e não demonstram o fluxo atual.
- `npm.cmd run db:check`: conexão e colunas das seis tabelas existentes aprovadas.
- `npm.cmd run test:mysql`: teste com MySQL real aprovado; migração incremental, upserts concorrentes, evento duplicado, ordem e desativação. Removeu apenas seu registro temporário; a tabela de projeção permanece criada.
- Na pasta Cadastros: `..\..\..\.venv-entrega3\Scripts\python.exe -m unittest -v test_entrega3`: cinco testes aprovados com SQLite real em memória e publisher substituído por mock. Cobrem contrato compartilhado, endereços, rollback da transação, outbox pendente/recuperação, repetição de requisição, HTTP 503/202 e desativação. Não confirmam comunicação real com o broker.

**Pendente nos computadores do grupo:** Docker/Compose, RabbitMQ real, execução entre serviços/computadores, reconexão após reiniciar broker e a demonstração Postman acima. Docker e broker não estavam disponíveis nesta máquina. Há teste opt-in `npm.cmd run test:rabbit` para RabbitMQ + MySQL: cria filas de teste exclusivas, confirma publicação com consumidor parado, persiste, repete evento e verifica DLQ por contrato inválido e falhas limitadas; requer migração já aplicada e `RABBITMQ_URL` configurada. Não foi executado aqui. Não apresenta mocks como prova de integração real.

## Entregar ou abrir Pull Request

Todos os arquivos estão na branch local. Revise `git diff` e os arquivos novos; não adicione `.env`, bancos SQLite ou ambientes virtuais. Para publicar **você mesmo**, quando estiver pronto:

O pacote completo está em `artifacts/petshop-entrega3.zip`, incluindo Loja, Cadastros, SQL, Compose, exemplos e documentação. Para regenerar: `powershell -ExecutionPolicy Bypass -File scripts/package.ps1`. O pacote exclui credenciais locais, bancos, dependências e metadados Git.

```powershell
git status --short
git add .
git commit -m "Implementa eventos Cadastros RabbitMQ Loja para Entrega 3"
git push -u origin entrega-3-rabbitmq
# Se usar GitHub CLI:
gh pr create --base main --head entrega-3-rabbitmq --title "Entrega 3: Cadastros RabbitMQ Loja" --body "Implementa outbox, contrato v1, projeção idempotente, migração incremental e roteiro de demonstração. Consulte README para testes executados e pendentes."
```

Esses comandos incluem as alterações anteriores já presentes no workspace; revise se devem integrar o mesmo commit. Para aplicar Cadastros no repositório do colega, copie o conteúdo de `microsservicos/cadastros` para a pasta correspondente em uma branch daquele repositório, mantendo seu `.env` e SQLite existentes. O Gateway foi preservado. A documentação da Entrega 2 está arquivada em [docs/README-ENTREGA2.md](docs/README-ENTREGA2.md); suas instruções REST foram substituídas pelo fluxo descrito aqui.
