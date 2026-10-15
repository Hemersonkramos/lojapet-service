-- Incremental: execute no banco_loja existente. Nenhuma tabela anterior é alterada.
CREATE TABLE IF NOT EXISTS clientes_projecao (
  id_cliente BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NULL,
  ativo BOOLEAN NOT NULL,
  revision BIGINT UNSIGNED NOT NULL,
  event_id CHAR(36) NOT NULL,
  recebido_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
