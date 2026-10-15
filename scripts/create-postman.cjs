const fs=require('fs');
const request=(name,method,url,body,headers=[],test=[])=>({name,request:{method,header:[{key:'Content-Type',value:'application/json'},...headers],url, ...(body?{body:{mode:'raw',raw:JSON.stringify(body,null,2)}}:{})},...(test.length?{event:[{listen:'test',script:{type:'text/javascript',exec:test}}]}:{})});
const collection={info:{name:'Pet Shop — Entrega 3',schema:'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'},variable:[{key:'cadastrosUrl',value:'http://localhost:8081'},{key:'lojaUrl',value:'http://localhost:8082'},{key:'clienteId',value:'1'},{key:'requestKey',value:'troque-por-chave-unica-para-cada-cliente'}],item:[
request('1. Cadastrar (consumidor parado)', 'POST','{{cadastrosUrl}}/clientes/',{nome:'Hemerson',telefone:'86999999999',email:'exemplo@email.com',ativo:true,enderecos:[]},[{key:'Idempotency-Key',value:'{{requestKey}}'}],["pm.test('Publicação confirmada: 202',()=>pm.response.to.have.status(202));","if(pm.response.code===202) pm.collectionVariables.set('clienteId',pm.response.json().dados.id_cliente);"]),
request('2. Repetir mesma chave (mesmo cliente/evento)', 'POST','{{cadastrosUrl}}/clientes/',{nome:'Hemerson',telefone:'86999999999',email:'exemplo@email.com',ativo:true,enderecos:[]},[{key:'Idempotency-Key',value:'{{requestKey}}'}]),
request('3. Listar fonte oficial','GET','{{cadastrosUrl}}/clientes/'),
request('4. Desativar (evento atualizado)','PATCH','{{cadastrosUrl}}/clientes/{{clienteId}}',{nome:'Hemerson',telefone:'86999999999',email:'exemplo@email.com',ativo:false}),
request('5. Saúde Loja','GET','{{lojaUrl}}/health'),
request('6. Pedido (troque produto_id por produto existente)','POST','{{lojaUrl}}/pedidos',{cliente_id:'{{clienteId}}',tipo_recebimento:'RETIRADA',itens:[{produto_id:1,quantidade:1}],retirada:{nome_retirante:'Hemerson'}}),
]};
// Numeric interpolation is required by the existing Request DTO.
collection.item.at(-1).request.body.raw=collection.item.at(-1).request.body.raw.replace('"{{clienteId}}"','{{clienteId}}');
fs.writeFileSync('docs/entrega3.postman_collection.json',JSON.stringify(collection,null,2)+'\n');
