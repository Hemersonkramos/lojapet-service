"""Dados ficticios relacionados nos tres SQLite; preserva registros e evita repeticao."""
import json
import sqlite3
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
FILES = {"main": ROOT / "microsservicos/loja/data/loja.db", "cad": ROOT / "microsservicos/cadastros/cadastros.db", "age": ROOT / "microsservicos/agendamentos/agendamentos.db"}
KEY = "demo-integrada-v1"

def inserir(db, tabela, **dados):
    return db.execute(f"INSERT INTO {tabela} ({','.join(dados)}) VALUES ({','.join('?' for _ in dados)})", tuple(dados.values())).lastrowid

def validar(db):
    for schema in FILES:
        assert db.execute(f"PRAGMA {schema}.integrity_check").fetchone()[0] == "ok"
        assert not db.execute(f"PRAGMA {schema}.foreign_key_check").fetchall()
    assert not db.execute("SELECT a.id FROM age.agendamentos a LEFT JOIN cad.pets p ON p.id=a.pet_id WHERE p.id IS NULL OR p.cliente_id != a.cliente_id").fetchall()
    assert not db.execute("SELECT p.id FROM pedidos p LEFT JOIN cad.clientes c ON c.id=p.cliente_id WHERE c.id IS NULL").fetchall()
    for pedido in db.execute("SELECT id, subtotal, taxa_entrega, total FROM pedidos"):
        soma = sum((Decimal(preco)*qtd for preco,qtd in db.execute("SELECT preco_unitario,quantidade FROM itens_pedido WHERE pedido_id=?", (pedido[0],))), Decimal(0))
        assert soma == Decimal(pedido[1])
        assert soma + Decimal(pedido[2]) == Decimal(pedido[3])

def main():
    for file in FILES.values():
        if not file.exists():
            raise RuntimeError(f"Banco ausente: {file}")
    backup = ROOT / "artifacts" / ("backup-demo-" + datetime.now().strftime("%Y%m%d-%H%M%S-%f"))
    backup.mkdir(parents=True)
    for schema,file in FILES.items():
        with sqlite3.connect(file) as origem, sqlite3.connect(backup / (schema + ".db")) as destino:
            origem.backup(destino)
    db = sqlite3.connect(FILES["main"], timeout=10)
    try:
        db.execute("PRAGMA foreign_keys=ON")
        db.execute("ATTACH DATABASE ? AS cad", (str(FILES["cad"]),))
        db.execute("ATTACH DATABASE ? AS age", (str(FILES["age"]),))
        db.execute("BEGIN IMMEDIATE")
        if db.execute("SELECT 1 FROM cad.event_outbox WHERE request_key=?", (KEY+"-0",)).fetchone():
            validar(db)
            db.rollback()
            print("Dados desta carga ja existem; nenhum registro duplicado.")
            return
        clientes=[]
        nomes=["Marina Almeida", "Rafael Costa", "Beatriz Santos", "Lucas Ferreira", "Camila Oliveira", "Pedro Lima"]
        for i,nome in enumerate(nomes):
            email=f"demo.cliente{i+1}@example.com"
            cid=inserir(db,"cad.clientes",nome=nome,email=email,telefone=f"1190000000{i}",ativo=1,data_cadastro="2026-10-15 12:00:00")
            clientes.append(cid)
            inserir(db,"cad.enderecos",cliente_id=cid,cep="01001000",logradouro="Rua dos Pets (ficticia)",numero=str(100+i),bairro="Centro",cidade="Sao Paulo",uf="SP",principal=1)
            eid=str(uuid4())
            rev=inserir(db,"cad.event_outbox",event_id=eid,request_key=KEY+f"-{i}",payload="",published=0)
            evento={"event_id":eid,"version":1,"evento":"CLIENTE_CADASTRADO","id_cliente":cid,"revision":rev,"nome":nome,"email":email,"ativo":True}
            db.execute("UPDATE cad.event_outbox SET payload=? WHERE revision=?",(json.dumps(evento,ensure_ascii=False),rev))
            inserir(db,"clientes_projecao",id_cliente=cid,nome=nome,email=email,ativo=1,revision=rev,event_id=eid)
        pets=[]
        for i,(nome,especie,raca,porte) in enumerate([("Luna","Cachorro","Shih-tzu","Pequeno"),("Thor","Cachorro","Labrador","Grande"),("Mia","Gato","SRD","Pequeno"),("Mel","Cachorro","Poodle","Medio"),("Simba","Gato","Persa","Pequeno"),("Bob","Cachorro","Beagle","Medio"),("Nina","Cachorro","SRD","Medio"),("Chico","Gato","SRD","Pequeno")]):
            cid=clientes[i%len(clientes)]
            pid=inserir(db,"cad.pets",cliente_id=cid,nome=nome,especie=especie,raca=raca,data_nascimento=f"202{1+i%4}-03-10",porte=porte,observacoes="Dado ficticio para demonstracao",ativo=1)
            pets.append((pid,cid))
        produtos=[]
        for nome,preco,estoque in [("Racao caes adultos 10kg","129.90",35),("Racao gatos castrados 3kg","89.90",40),("Areia sanitaria 4kg","25.90",60),("Petisco dental 100g","18.50",80),("Shampoo neutro 500ml","32.90",30),("Coleira ajustavel","24.90",45),("Guia para passeio","39.90",30),("Brinquedo mordedor","19.90",70),("Cama pet tamanho M","119.90",20),("Comedouro inox","29.90",50)]:
            pid=inserir(db,"produtos",nome=nome,descricao="Produto demonstrativo para cuidados com pets",preco=preco,estoque=estoque,ativo=1)
            produtos.append((pid,nome,preco))
        status=["RECEBIDO","EM_PREPARACAO","SAIU_PARA_ENTREGA","ENTREGUE","PRONTO_PARA_RETIRADA","RETIRADO","CANCELADO","RECEBIDO"]
        for i,st in enumerate(status):
            cid=clientes[i%6]
            itens=[(produtos[i%10],1),(produtos[(i+3)%10],2)]
            sub=sum(Decimal(p[2])*q for p,q in itens)
            entrega=i in [0,2,3,6]
            taxa=Decimal("8.00") if entrega else Decimal("0.00")
            oid=inserir(db,"pedidos",cliente_id=cid,data_criacao="2026-10-15 13:00:00",tipo_recebimento="ENTREGA" if entrega else "RETIRADA",status=st,subtotal=str(sub),taxa_entrega=str(taxa),total=str(sub+taxa))
            for (pid,nome,preco),qtd in itens:
                inserir(db,"itens_pedido",pedido_id=oid,produto_id=pid,nome_produto=nome,quantidade=qtd,preco_unitario=preco)
                if st!="CANCELADO":
                    db.execute("UPDATE produtos SET estoque=estoque-? WHERE id=?",(qtd,pid))
            if entrega:
                inserir(db,"entregas",pedido_id=oid,destinatario=nomes[i%6],telefone=f"1190000000{i%6}",cep="01001000",logradouro="Rua dos Pets (ficticia)",numero=str(100+i%6),bairro="Centro",cidade="Sao Paulo",uf="SP",data_entrega="2026-10-15 15:00:00" if st=="ENTREGUE" else None)
            else:
                inserir(db,"retiradas",pedido_id=oid,nome_retirante=nomes[i%6],codigo_retirada=str(uuid4()),data_retirada="2026-10-15 15:00:00" if st=="RETIRADO" else None)
            inserir(db,"pagamentos",pedido_id=oid,forma="PIX" if i%2==0 else "CARTAO_CREDITO",status="CANCELADO" if st=="CANCELADO" else "PENDENTE" if st=="RECEBIDO" else "APROVADO",valor=str(sub+taxa),data_pagamento=None if st in ["RECEBIDO","CANCELADO"] else "2026-10-15 13:15:00")
        profissionais=[inserir(db,"age.profissionais",nome=nome,ativo=1) for nome in ["Ana Souza", "Bruno Mendes", "Carla Rocha"]]
        servicos=[]
        for nome,preco,duracao in [("Banho","50.00",30),("Banho e tosa","90.00",60),("Corte de unhas","25.00",15),("Higienizacao de ouvidos","30.00",30)]:
            sid=inserir(db,"age.servicos",nome=nome,descricao="Servico demonstrativo de cuidados pet",preco=preco,duracao_minutos=duracao,ativo=1)
            servicos.append((sid,preco,duracao))
        for profissional in profissionais:
            for dia in range(5):
                inserir(db,"age.disponibilidade",profissional_id=profissional,dia_semana=dia,hora_inicio="08:00:00.000000",hora_fim="18:00:00.000000")
        for i,(pid,cid) in enumerate(pets):
            sid,preco,duracao=servicos[i%4]
            inicio=datetime(2026,10,19+i//3,9+i%3*2)
            inserir(db,"age.agendamentos",pet_id=pid,cliente_id=cid,servico_id=sid,profissional_id=profissionais[i%3],inicio=inicio.isoformat(" "),fim=(inicio+timedelta(minutes=duracao)).isoformat(" "),valor=preco,status="agendado",observacoes="Agendamento ficticio vinculado ao pet e tutor em Cadastros",criado_em="2026-10-15 12:30:00")
        validar(db)
        db.commit()
        print("Adicionados: 6 clientes, 6 enderecos, 8 pets, 10 produtos, 8 pedidos, 16 itens, 8 pagamentos, 3 profissionais, 4 servicos, 15 disponibilidades e 8 agendamentos.")
        print("Projecoes locais prontas; 6 eventos de clientes pendentes na outbox para publicacao real.")
        print("Backup anterior:", backup)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

if __name__=="__main__":
    main()
