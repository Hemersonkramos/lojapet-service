require('dotenv/config');
const {DatabaseSync}=require('node:sqlite');
const id=Number(process.argv[2]);
if(!Number.isSafeInteger(id)||id<1)throw new Error('Informe ID positivo');
const db=new DatabaseSync(process.env.SQLITE_PATH||'data/loja.db',{readOnly:true});
try{console.table(db.prepare('SELECT * FROM clientes_projecao WHERE id_cliente=?').all(id));}
finally{db.close();}
