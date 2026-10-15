import os
import pika
from dotenv import load_dotenv
from dtos.evento_dto import ClienteEventoDTO
load_dotenv()
EXCHANGE = "cadastros.clientes.v1"
def publicar_evento_cadastro(payload: str):
    evento = ClienteEventoDTO.model_validate_json(payload)
    params = pika.URLParameters(os.environ["RABBITMQ_URL"])
    params.socket_timeout = 5
    params.blocked_connection_timeout = 5
    params.connection_attempts = 1
    connection = pika.BlockingConnection(params)
    try:
        channel = connection.channel()
        channel.exchange_declare(exchange=EXCHANGE, exchange_type="fanout", durable=True)
        channel.confirm_delivery()
        channel.basic_publish(exchange=EXCHANGE, routing_key="", body=evento.model_dump_json(),
            mandatory=True, properties=pika.BasicProperties(delivery_mode=2,
                content_type="application/json", message_id=str(evento.event_id)))
    finally:
        connection.close()
