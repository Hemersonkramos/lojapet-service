require('dotenv/config');
const mysql=require('mysql2/promise');
(async()=>{
 const db=await mysql.createConnection({host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'banco_loja',dateStrings:true});
 try{for(const table of ['produtos','pedidos','itens_pedido','entregas','retiradas','pagamentos','clientes_projecao']){
  const [columns]=await db.query('SHOW COLUMNS FROM `'+table+'`');
  const [count]=await db.query('SELECT COUNT(*) AS total FROM `'+table+'`');
  console.log(table,count[0].total,columns.map(c=>c.Field).join(','));
 }}finally{await db.end();}
})().catch(e=>{console.error(e.code||e.name);process.exitCode=1;});
