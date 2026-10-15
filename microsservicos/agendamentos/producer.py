
import json
import os
import pika


def publicar_agendamento(evento: dict):
    conexao = pika.BlockingConnection(
        pika.URLParameters(os.environ["RABBITMQ_URL"])
    )

    try:
        canal = conexao.channel()

        canal.queue_declare(
            queue="agendamentos_criados",
            durable=True
        )

        canal.confirm_delivery()
        canal.basic_publish(
            mandatory=True,
            exchange="",
            routing_key="agendamentos_criados",
            body=json.dumps(evento, default=str).encode("utf-8"),
            properties=pika.BasicProperties(
                delivery_mode=2,
                content_type="application/json"
            )
        )
    finally:
        conexao.close()
