# Entrega 4 - Segurança (JWT) e Escalabilidade (Nginx)

## Topologia

```text
                 host: porta 80 (única exposta)
                          |
                       [nginx]  proxy reverso + load balancer
      /api/auth/   /api/cadastros/   /api/agendamentos/    /api/loja/
          |              |                  |                  |  Round Robin
       [auth]       [cadastros]      [agendamentos]     [loja-1][loja-2][loja-3]
     emite JWT    valida JWT          valida JWT          validam JWT
                       |                                       |
             [cadastros-outbox] --> [rabbitmq] --> [loja-consumer]
```

Rede interna do Docker apenas: `auth`, `cadastros`, `agendamentos`, `loja` (3 réplicas), `rabbitmq` e os workers não publicam portas.

## Segurança

| Peça | Onde | O que faz |
|---|---|---|
| Authorization Server | `microsservicos/auth` | `POST /login` confere usuário e senha (hash PBKDF2-SHA256 no SQLite) e emite JWT **HS256** |
| Payload do JWT | `auth/tokens.py` | `sub`, `uid`, `role`, `iss`, `iat`, `exp`, `jti`. Nenhum dado sensível |
| Resource Servers Python | `cadastros/seguranca.py`, `agendamentos/seguranca.py` | Middleware lê `Authorization: Bearer`, valida assinatura, `exp`, `iss`; 401 se ausente/inválido |
| Resource Server Node | `loja/src/security/` | Mesma validação com `node:crypto` (HMAC-SHA256 + `timingSafeEqual`) |
| Papéis | Loja e Agendamentos | Token válido sem o papel exigido recebe **403** |

Detalhes que fazem o teste do jwt.io passar:
- O algoritmo aceito é fixo (`HS256`); tokens com `"alg": "none"` são recusados.
- O segredo exige no mínimo 32 caracteres. Com um segredo fraco (como o padrão do jwt.io), quem altera o payload no jwt.io consegue reassinar o token; com um segredo aleatório longo, não.
- 401 = assinatura/token inválido. 403 = token íntegro, mas sem permissão.

Regras de acesso:
- Loja: qualquer usuário autenticado lê e compra; `POST/PUT /produtos` exige `ADMIN`.
- Agendamentos: criar/alterar/excluir profissionais, serviços e disponibilidades exige `ADMIN`.
- Cadastros: qualquer usuário autenticado.
- `/health` de cada serviço é público (usado pelos healthchecks).
- Agendamentos repassa o JWT do usuário quando consulta o pet em Cadastros.

Usuários de demonstração (senhas no `.env`): `admin` (ADMIN) e `usuario` (USER).

## Escalabilidade

- `compose.yaml`: o serviço `loja` tem `deploy.replicas: 3` (contêineres `lojapet-loja-1`, `-2`, `-3`).
- `nginx/nginx.conf`: `upstream loja_cluster` com **Round Robin** (padrão), `max_fails=1 fail_timeout=10s`, `proxy_next_upstream error timeout http_502 http_503 http_504` e `proxy_connect_timeout 2s`. Se uma réplica cair, a requisição é refeita na próxima e o nó fica fora da rotação.
- `resolver 127.0.0.11` + `resolve` nos upstreams: o Nginx reconsulta o DNS do Docker a cada 5 s, então contêineres parados saem da lista e religados voltam.
- Cabeçalhos repassados: `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`, `X-Request-ID`.
- Prova da distribuição: cada resposta da Loja traz `X-Instance` (hostname da réplica) e `X-Upstream` (IP:porta escolhido pelo Nginx); o log do Nginx registra `upstream=...` e cada réplica registra `[loja <id>] GET ... -> 200`.
- As réplicas são stateless: identidade vem do JWT e os dados ficam no SQLite compartilhado (volume `loja_data`, modo WAL).

## Como rodar

```powershell
Copy-Item .env.example .env   # só se ainda não existir; preencha os valores
docker compose up -d --build --wait
```

Gateway: http://localhost (troque `GATEWAY_PORT` no `.env` se a porta 80 estiver ocupada).

## Testes de aceitação

Automático (sobe tudo e executa todos os critérios do professor):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/teste-entrega4.ps1
```

Manual (Postman): importe `docs/entrega4.postman_collection.json`, preencha `senha_usuario` e `senha_admin` e execute a pasta "1. Segurança". Para a distribuição, rode a pasta "2. Escalabilidade" no Runner com 9 iterações e veja o console.

Roteiro da demonstração:

```powershell
# 1. Sem token -> 401
curl.exe -i http://localhost/api/loja/produtos
# 2. Login
curl.exe -s -X POST http://localhost/api/auth/login -H "Content-Type: application/json" -d '{\"username\":\"usuario\",\"password\":\"<AUTH_USER_PASSWORD>\"}'
# 3. Cole o token no jwt.io, troque "role":"USER" por "ADMIN" e use o token alterado -> 401
curl.exe -i http://localhost/api/loja/produtos -H "Authorization: Bearer <token_adulterado>"
# 4. Distribuição: repita e observe X-Instance
curl.exe -s -D - -o NUL http://localhost/api/loja/produtos -H "Authorization: Bearer <token>" | findstr X-Instance
docker compose logs nginx --tail 20
# 5. Derrubar uma réplica e continuar recebendo 200
docker stop lojapet-loja-2
```

Testes unitários:

```powershell
npm.cmd test                                                     # Loja (inclui tests/seguranca.test.ts)
cd microsservicos/auth;         python -m unittest test_auth.py
cd microsservicos/cadastros;    python -m unittest discover -p "test_*.py"
cd microsservicos/agendamentos; python -m unittest discover -p "test_*.py"
```

Os testes Python precisam de `PyJWT` (`pip install PyJWT==2.10.1` no venv).

## Observações

- O antigo `api-gateway/` (FastAPI) foi substituído pelo Nginx e não sobe no compose.
- Os bancos começam vazios nos volumes Docker. Para zerar tudo: `docker compose down -v`.
- A interface do RabbitMQ (15672) não é mais publicada. Para inspecionar: `docker compose exec rabbitmq rabbitmq-diagnostics status`.
