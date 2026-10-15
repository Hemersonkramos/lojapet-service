const fs=require('fs');
const {DatabaseSync}=require('node:sqlite');
const path=require('path');
const root=process.argv[2]||'.';
for(const [file,tables] of [ ['microsservicos/loja/data/loja.db',['produtos','pedidos','itens_pedido','entregas','retiradas','pagamentos','clientes_projecao']],['microsservicos/cadastros/cadastros.db',['clientes','enderecos','pets','event_outbox']],['microsservicos/agendamentos/agendamentos.db',['profissionais','servicos','disponibilidade','agendamentos']] ]){
 const db=new DatabaseSync(path.resolve(root,file),{readOnly:true});
 try{
  if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw new Error('Banco corrompido: '+file);
  if(db.prepare('PRAGMA foreign_key_check').all().length)throw new Error('FK invÃ¡lida: '+file);
  for(const table of tables)console.log(file+' / '+table+': '+db.prepare('SELECT COUNT(*) n FROM '+table).get().n);
 }finally{db.close();}
}
