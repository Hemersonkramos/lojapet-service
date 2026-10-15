# Dados fict?cios para demonstra??o

Carga executada nos tr?s bancos SQLite, preservando os registros existentes. Nomes, contatos e endere?os adicionados s?o fict?cios; emails usam `example.com`.

| Banco | Dados ap?s a carga |
| --- | --- |
| Cadastros | 6 clientes, 6 endere?os, 8 pets, 6 eventos na outbox |
| Agendamentos | 3 profissionais, 4 servi?os, 15 disponibilidades, 8 agendamentos |
| Loja | 15 produtos, 10 pedidos, 20 itens, 4 entregas, 6 retiradas, 8 pagamentos, 6 clientes na proje??o |

Os oito agendamentos s?o de 19 a 21/10/2026. Cada um aponta para um pet existente e seu pr?prio tutor em Cadastros. Servi?os e profissionais tamb?m existem no banco de Agendamentos. Os pedidos novos usam os mesmos clientes e seus endere?os, com exemplos de entrega, retirada, pagamento pendente/aprovado e cancelamento. Estoque foi descontado nos pedidos novos n?o cancelados; os totais foram calculados com decimal exato. Os cinco produtos e dois pedidos anteriores foram preservados.

A proje??o da Loja foi preenchida diretamente para permitir demonstra??o imediata. Isso n?o comprova consumo RabbitMQ: os seis eventos de clientes permanecem pendentes na outbox e o worker pode public?-los normalmente. T?m os mesmos IDs, revis?es e event_ids da proje??o, permitindo consumo idempotente posterior. Para demonstrar cliente ainda n?o sincronizado, cadastre outro cliente pela API com o consumidor parado.

## Reexecutar

Na raiz do projeto, com os tr?s bancos j? inicializados:

```powershell
.\.venv-entrega3\Scripts\python.exe scripts/popular-demo.py
```

A carga usa uma chave pr?pria na outbox para n?o repetir os dados. N?o apague essa chave para for?ar repeti??o. Cria backups consistentes dos tr?s bancos em `artifacts/backup-demo-*` antes de escrever. N?o publica eventos no broker. Executa a grava??o numa transa??o com os tr?s bancos anexados e desfaz em caso de erro.

Valida integridade SQLite, FKs locais, v?nculo pet/tutor, clientes dos pedidos e somas dos itens/subtotal/total. A segunda execu??o foi conferida sem duplicar registros. `node scripts/check-package.cjs` tamb?m passou para os tr?s bancos.

O ZIP `artifacts/petshop-entrega3.zip` foi regenerado com snapshots dos bancos populados. Os arquivos `.db` continuam ignorados pelo Git; o script de carga acompanha o c?digo.
