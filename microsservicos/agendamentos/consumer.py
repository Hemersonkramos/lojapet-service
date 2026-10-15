import json
import os
import database
import pika
import service


def receber_mensagem(ch, method, properties, body):
    try:
        evento = json.loads(body.decode("utf-8"))

        print("\nMensagem recebida do RabbitMQ!")
        print("Tipo do evento:", evento.get("tipo"))
        print("Dados:", evento.get("dados"))

        service.processar_evento_agendamento(evento)

        ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as erro:
        print("Erro ao processar mensagem:", erro)
        ch.basic_nack(
            delivery_tag=method.delivery_tag,
            requeue=False
        )

def iniciar_consumidor():
    conexao = pika.BlockingConnection(
        pika.URLParameters(os.environ["RABBITMQ_URL"])
    )

    canal = conexao.channel()

    canal.queue_declare(
        queue="agendamentos_criados",
        durable=True
    )

    canal.basic_qos(prefetch_count=1)

    canal.basic_consume(
        queue="agendamentos_criados",
        on_message_callback=receber_mensagem
    )

    print("Aguardando mensagens de agendamentos...")
    print("Pressione Ctrl+C para encerrar.")

    try:
        canal.start_consuming()
    except KeyboardInterrupt:
        canal.stop_consuming()
    finally:
        conexao.close()


if __name__ == "__main__":
    iniciar_consumidor()