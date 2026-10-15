# Pacote Entrega 3

`petshop-entrega3.zip` inclui fontes organizados e snapshots dos tres bancos SQLite. Nao inclui `.env`, senhas, runtimes, dependencias nem estado do RabbitMQ.

Extraia em uma pasta separada e siga o README da raiz. Para atualizar o pacote: execute `powershell -ExecutionPolicy Bypass -File scripts/package.ps1` na raiz e copie `artifacts/petshop-entrega3.zip` para esta pasta. A pasta `entregas` e excluida do empacotamento para evitar ZIPs aninhados.
