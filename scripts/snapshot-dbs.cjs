require('dotenv/config');
const {DatabaseSync}=require('node:sqlite');
const fs=require('fs');
const path=require('path');
const staging=process.argv[2];
if(!staging)throw new Error('Informe pasta de staging');
const files=[
 [require('path').resolve('microsservicos/loja',(fs.existsSync('microsservicos/loja/.env')?require('dotenv').parse(fs.readFileSync('microsservicos/loja/.env','utf8')):{}).SQLITE_PATH||'data/loja.db'),'microsservicos/loja/data/loja.db'],
 ['microsservicos/cadastros/cadastros.db','microsservicos/cadastros/cadastros.db'],
 ['microsservicos/agendamentos/agendamentos.db','microsservicos/agendamentos/agendamentos.db']
];
for(const [source,relative] of files){
 if(!fs.existsSync(source))throw new Error('Banco ausente: '+source);
 const destination=path.resolve(staging,relative);
 fs.mkdirSync(path.dirname(destination),{recursive:true});
 const db=new DatabaseSync(source,{readOnly:true});
 try{db.prepare('VACUUM INTO ?').run(destination);}finally{db.close();}
 console.log('Snapshot consistente: '+relative);
}
