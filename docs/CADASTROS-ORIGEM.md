Código obtido em 15/10/2026 de https://github.com/Gabrieljalves123/microsservico-cadastros
Commit: 09809bdcc88389567f6a8d21bffc94e679d84763.

A pasta integrations/cadastros contém uma cópia editável do repositório, sem metadados Git internos. Nenhuma mudança foi enviada ao remoto. O Gateway foi copiado sem modificações; não é necessário executá-lo nesta entrega.

Versão conferida: FastAPI; SQLite cadastros.db; POST /clientes/ no controller; evento original com id_cliente, nome, email, evento. O controller original gravava diretamente no banco e publicava sem publisher confirms. Service/Repository existentes não eram usados pelo POST. O código original não definia porta de inicialização; o mapa do Gateway indicava Cadastros 8081, Loja 8082, Agendamento 8083. Os comandos desta entrega adotam essas portas.

As alterações locais anteriores em README.md e .env.example foram preservadas nas cópias docs/README-ENTREGA2.md e docs/env-entrega2.example. Alterações anteriores em src/config.ts e tests/cadastros.test.ts continuam no código. A configuração de porta padrão mudou para 8082. O .env real não foi editado.
