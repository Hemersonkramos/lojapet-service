import { pool } from "./repository/database.js";
import { config } from "./config.js";

// Somente leitura: confirma que as colunas usadas pela API existem no banco atual.
const checks = [
  "SELECT id,nome,descricao,preco,estoque,ativo FROM produtos LIMIT 0",
  "SELECT id,cliente_id,data_criacao,tipo_recebimento,status,subtotal,taxa_entrega,total FROM pedidos LIMIT 0",
  "SELECT id,pedido_id,produto_id,nome_produto,quantidade,preco_unitario FROM itens_pedido LIMIT 0",
  "SELECT id,pedido_id,destinatario,telefone,cep,logradouro,numero,complemento,bairro,cidade,uf,referencia,data_entrega FROM entregas LIMIT 0",
  "SELECT id,pedido_id,nome_retirante,codigo_retirada,data_retirada FROM retiradas LIMIT 0",
  "SELECT id,pedido_id,forma,status,valor,data_pagamento FROM pagamentos LIMIT 0",
  "SELECT id_cliente,nome,email,ativo,revision,event_id FROM clientes_projecao LIMIT 0",
];
async function main() {
  try {
    await pool.query("SELECT 1");
    console.log(`Conexão ${config.DB_DRIVER}: OK`);
    for (const sql of checks) {
      await pool.query(sql);
      console.log(`Tabela ${sql.match(/FROM (\w+)/)![1]}: colunas OK`);
    }
    console.log("Verificação concluída. SQLite cria somente tabelas ausentes ao abrir o banco; dados existentes são preservados.");
  } catch (error) {
    const code = (error as { code?: string }).code ?? "ERRO_DESCONHECIDO";
    console.error(
      `Verificação falhou: ${code}. Confira o .env e o schema no Workbench.`,
    );
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
void main();
