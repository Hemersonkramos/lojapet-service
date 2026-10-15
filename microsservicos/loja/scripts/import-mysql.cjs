require('dotenv/config');
const mysql=require('mysql2/promise');
const {DatabaseSync}=require('node:sqlite');
const fs=require('fs');
const path=require('path');
const tables=['produtos','pedidos','itens_pedido','entregas','retiradas','pagamentos','clientes_projecao'];
(async()=>{
 const file=process.env.SQLITE_PATH||'data/loja.db';
 fs.mkdirSync(path.dirname(path.resolve(file)),{recursive:true});
 const sqlite=new DatabaseSync(file);
 sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
 sqlite.exec(fs.readFileSync('migrations/sqlite/001_schema.sql','utf8'));
 let source;
 try{
  for(const table of tables) if(sqlite.prepare('SELECT COUNT(*) AS n FROM '+table).get().n!==0)
   throw new Error('Destino já contém dados. Use SQLITE_PATH para um novo arquivo; nenhum dado será sobrescrito.');
  source=await mysql.createConnection({host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'banco_loja',dateStrings:true});
  await source.query('SET TRANSACTION READ ONLY');
  await source.query('START TRANSACTION WITH CONSISTENT SNAPSHOT');
  sqlite.exec('BEGIN IMMEDIATE');
  try{
   for(const table of tables){
    const [records,fields]=await source.query('SELECT * FROM `'+table+'`');
    const columns=fields.map(f=>f.name);
    const available=sqlite.prepare('PRAGMA table_info('+table+')').all().map(c=>c.name);
    if(columns.some(c=>!available.includes(c)))throw new Error('Colunas não mapeadas em '+table);
    const insert=sqlite.prepare('INSERT INTO '+table+' ('+columns.map(c=>'"'+c+'"').join(',')+') VALUES ('+columns.map(()=>'?').join(',')+')');
    for(const record of records)insert.run(...columns.map(c=>record[c]));
    // Compare all source columns, not only counts. Money stays exact decimal text.
    for(const record of records){
     const key=table==='clientes_projecao'?'id_cliente':'id';
     const actual=sqlite.prepare('SELECT * FROM '+table+' WHERE '+key+'=?').get(record[key]);
     for(const column of columns)if((record[column]===null?null:String(record[column]))!==(actual[column]===null?null:String(actual[column])))
      throw new Error('Divergência em '+table+'.'+column);
    }
    console.log(table+': '+records.length+' registros copiados e conferidos');
   }
   if(sqlite.prepare('PRAGMA foreign_key_check').all().length)throw new Error('Violação de FK');
   sqlite.exec('COMMIT');
  }catch(error){sqlite.exec('ROLLBACK');throw error;}
  await source.rollback(); // Read-only snapshot; no source changes.
  console.log('Migração concluída: '+file+'. MySQL preservado.');
 }finally{sqlite.close();if(source)await source.end();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
