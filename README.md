# Microsserviço da Loja — Pet Shop

Backend Node.js + TypeScript + Express 5 + MySQL2. Usa as seis tabelas do `banco_loja` criadas no MySQL Workbench. Não cria ou modifica o schema automaticamente.

Para a entrega da disciplina, consulte [a correspondência com os requisitos e o roteiro de apresentação](docs/ENTREGA-2.md). Importe [a coleção do Postman](docs/loja.postman_collection.json) para executar o fluxo da Loja.

## Executar no Windows / VS Code

1. Instale Node.js 22 ou superior e mantenha o MySQL ligado.
2. Abra esta pasta no VS Code.
3. Copie `.env.example` para `.env` e configure `DB_PASSWORD` com a senha LOCAL do MySQL (não envie a senha para ninguém).
4. No terminal da pasta execute:

```powershell
npm.cmd install
Copy-Item .env.example .env
# Edite o .env antes de continuar.
npm.cmd run dev
```

Se já tiver criado o `.env`, não o copie novamente. A API fica em `http://localhost:8083`. O servidor escuta somente no computador local; para execução em containers/outros computadores ajuste o endereço de escuta em `server.ts` e configure acesso/autenticação.

## Camadas

- `src/model`: entidades correspondentes às tabelas.
- `src/repository`: interfaces de produtos/pedidos, SQL parametrizado e transações.
- `src/service`: regras, estoque, totais, pagamentos e mudanças de status.
- `src/controller`: entrada HTTP, validação e códigos de resposta.
- `src/dto`: contratos de entrada e saída.
- `src/client`: consulta HTTP síncrona ao microsserviço de Cadastros.

## Cadastros: real ou demonstração

Padrão `CADASTROS_MODE=real`: antes de gravar pedido, aguarda `GET http://localhost:8082/clientes/{id}`. Espera JSON `{ "id": 1, "ativo": true }` (ativo é opcional). Se o colega usar outro caminho, ajuste `CADASTROS_CLIENTE_PATH`; se usar outro JSON, adapte o client. Cliente inexistente retorna 404; serviço indisponível retorna 503. O cliente_id deve corresponder ao ID do serviço de Cadastros.

Enquanto Cadastros não estiver pronto, use `CADASTROS_MODE=demo` no .env e reinicie: somente o cliente fictício 1 é aceito. Isso NÃO demonstra comunicação entre microsserviços. Para a apresentação exigida pelo professor, utilize o modo real e mostre o log HTTP.

O Gateway posteriormente encaminha `/api/loja/*` para `http://localhost:8083/*`, removendo `/api/loja`. Não há Gateway incluído. Agendamentos não é consultado porque a compra não depende de um atendimento.

## Testar no Postman

Use Body → raw → JSON, Content-Type: application/json. Copie os IDs retornados, não suponha que serão 1. `examples.http` também pode ser utilizado no VS Code com REST Client.

| Método | Caminho                                        | Resultado                                |
| ------ | ---------------------------------------------- | ---------------------------------------- |
| GET    | /health                                        | Estado do processo e modo de Cadastros   |
| POST   | /produtos                                      | Criar produto                            |
| GET    | /produtos                                      | Listar até 500 produtos                  |
| GET    | /produtos/:id                                  | Consultar produto                        |
| PUT    | /produtos/:id                                  | Atualizar todos os campos do produto     |
| POST   | /pedidos                                       | Criar compra e baixar estoque            |
| GET    | /pedidos/:id                                   | Compra completa e histórico de pagamento |
| GET    | /pedidos?clienteId=1                           | Até 500 compras do cliente               |
| PATCH  | /pedidos/:id/status                            | Alterar situação                         |
| POST   | /pedidos/:id/pagamentos                        | Registrar pagamento pendente             |
| PATCH  | /pedidos/:id/pagamentos/:pagamentoId/confirmar | Confirmação manual para demonstração     |

### Produto

```json
{
  "nome": "Ração 10 kg",
  "descricao": "Ração para cães adultos",
  "preco": 120,
  "estoque": 20,
  "ativo": true
}
```

### Pedido para retirada

```json
{
  "cliente_id": 1,
  "tipo_recebimento": "RETIRADA",
  "itens": [{ "produto_id": 1, "quantidade": 2 }],
  "retirada": { "nome_retirante": "Hemerson" }
}
```

### Pedido para entrega

```json
{
  "cliente_id": 1,
  "tipo_recebimento": "ENTREGA",
  "itens": [{ "produto_id": 1, "quantidade": 1 }],
  "entrega": {
    "destinatario": "Hemerson",
    "telefone": "86999999999",
    "cep": "64000000",
    "logradouro": "Rua Exemplo",
    "numero": "100",
    "bairro": "Centro",
    "cidade": "Teresina",
    "uf": "PI"
  }
}
```

### Pagamento / status

POST pagamento: `{"forma":"PIX"}`. PATCH confirmação: sem body. PATCH status: `{"status":"EM_PREPARACAO"}`.

Entrega: RECEBIDO → EM_PREPARACAO → SAIU_PARA_ENTREGA → ENTREGUE.
Retirada: RECEBIDO → EM_PREPARACAO → PRONTO_PARA_RETIRADA → RETIRADO.
Concluir exige pagamento aprovado. Cancelar antes de saída/conclusão devolve estoque e cancela pagamento pendente. Pedido pago não pode ser cancelado neste MVP: estorno real ainda não implementado.

## Regras e limites

- Preço vem do banco, não do cliente HTTP. Nome/preço e endereço ficam preservados na compra. Valores monetários nas respostas são strings decimais; cálculos usam centavos.
- Frete fixo definido por TAXA_ENTREGA, retirada sem frete.
- Pedido, itens, recebimento e baixa de estoque são uma transação; falha desfaz tudo. Produtos bloqueados com FOR UPDATE e ordem estável impedem vendas concorrentes acima do estoque.
- Itens repetidos são consolidados. Cancelamento repetido é rejeitado para não devolver estoque duas vezes.
- Um registro de entrega OU retirada é criado, nunca os dois pela API.
- Pagamento é registro administrativo/manual de demonstração. Não processa cartão, não gera Pix e não verifica transferência financeira.
- Não há login/autorização neste MVP. Use localmente no Postman; antes de publicar, proteja endpoints administrativos e valide a identidade do cliente para consultar compras. Enviar cliente_id não autentica o cliente.
- Não há edição de itens, cálculo de frete por distância, estorno, notificações, integração com Agendamentos ou paginação completa. Não são necessários para a operação básica implementada.
- Use exclusão lógica de produto (ativo=false), preservando histórico.

## Verificação

```powershell
npm.cmd run db:check
npm.cmd run build
npm.cmd test
npm.cmd start
```

`db:check` testa a conexão e as colunas usadas nas seis tabelas, somente com consultas. O build verifica TypeScript. Testes cobrem contratos, dinheiro, itens repetidos, transições, respostas HTTP e comunicação com um servidor HTTP local de teste, incluindo timeout e cliente inválido. A execução real exige o MySQL local e o schema já criado. Teste uma compra válida, estoque insuficiente, cancelamento e o serviço real de Cadastros indisponível. Confira que falha não cria pedido ou altera estoque.
