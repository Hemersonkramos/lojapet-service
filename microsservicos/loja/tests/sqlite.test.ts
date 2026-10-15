import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
const dir=mkdtempSync(join(tmpdir(),"loja-sqlite-"));
process.env.DB_DRIVER="sqlite";
process.env.SQLITE_PATH=join(dir,"teste.db");
test("SQLite real: eventos, compras, pagamento, cancelamento, concorrência e rollback",async()=>{
const {pool,rows,write,transaction}=await import("../src/repository/database.js");
const {ClienteService}=await import("../src/service/ClienteService.js");
const {ClienteRepository}=await import("../src/repository/ClienteRepository.js");
const {ProdutoRepository}=await import("../src/repository/ProdutoRepository.js");
const {PedidoService}=await import("../src/service/PedidoService.js");
const {pedidoRequest}=await import("../src/dto/contracts.js");
 try{
  const event={event_id:randomUUID(),version:1,evento:"CLIENTE_CADASTRADO",id_cliente:1,revision:1,nome:"Teste",email:null,ativo:true};
  const clientes=new ClienteService();
  await clientes.receber(event);
  await Promise.all([clientes.receber(event),clientes.receber(event)]);
  assert.equal((await rows<{n:number}>(pool,"SELECT COUNT(*) n FROM clientes_projecao"))[0].n,1);
  const produtos=new ProdutoRepository();
  const id=await produtos.criar({nome:"Ração",preco:12.35,estoque:5,ativo:true});
  const pedidos=new PedidoService();
  const request=(quantidade:number)=>pedidoRequest.parse({cliente_id:1,tipo_recebimento:"RETIRADA",itens:[{produto_id:id,quantidade}],retirada:{nome_retirante:"Teste"}});
  const pedido=await pedidos.criar(request(2));
  assert.equal(pedido.total,"24.70");
  assert.equal(pedido.itens[0].preco_unitario,"12.35");
  assert.equal((await produtos.buscar(id))?.estoque,3);
  await pedidos.mudarStatus(pedido.id,"CANCELADO");
  assert.equal((await produtos.buscar(id))?.estoque,5);
  const pago=await pedidos.criar(request(1));
  const pagamento=await pedidos.registrarPagamento(pago.id,"PIX");
  await pedidos.confirmarPagamento(pago.id,pagamento.pagamentos[0].id);
  await pedidos.mudarStatus(pago.id,"EM_PREPARACAO");
  await pedidos.mudarStatus(pago.id,"PRONTO_PARA_RETIRADA");
  const retirado=await pedidos.mudarStatus(pago.id,"RETIRADO");
  assert.ok(retirado.retirada?.data_retirada);
  await assert.rejects(transaction(async db=>{await write(db,"UPDATE produtos SET estoque=0 WHERE id=?",[id]);throw new Error("falha depois da gravação");}));
  assert.equal((await produtos.buscar(id))?.estoque,4);
  const attempts=await Promise.allSettled([pedidos.criar(request(3)),pedidos.criar(request(3))]);
  assert.equal(attempts.filter(r=>r.status==="fulfilled").length,1);
  assert.equal((await produtos.buscar(id))?.estoque,1);
  await clientes.receber({...event,event_id:randomUUID(),revision:2,ativo:false});
  await clientes.receber(event);
  assert.equal((await new ClienteRepository().buscar(1))?.ativo,0);
  await assert.rejects(pedidos.criar(request(1)),/inativo/);
  const reopened=new DatabaseSync(process.env.SQLITE_PATH!,{readOnly:true});
  try {
    assert.equal(reopened.prepare("SELECT ativo FROM clientes_projecao WHERE id_cliente=1").get()?.ativo,0);
    assert.equal(reopened.prepare("PRAGMA integrity_check").get()?.integrity_check,"ok");
  } finally { reopened.close(); }
 }finally{await pool.end();rmSync(dir,{recursive:true,force:true});}
});
