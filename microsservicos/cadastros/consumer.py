import pika
import json

def callback(ch, method, properties, body):
    evento = json.loads(body)
    print(f" [x] Evento recebido com sucesso de forma assíncrona: {evento}")

    # Aqui o consumidor processaria a lógica de negócio local dele (ex: atualizar outros registos)

    # Confirma o processamento da mensagem para o RabbitMQ retirá-la da fila
    ch.basic_ack(delivery_tag=method.delivery_tag)

def iniciar_consumidor():
    connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
    channel = connection.channel()

    channel.queue_declare(queue='fila_cadastro_clientes', durable=True)
    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue='fila_cadastro_clientes', on_message_callback=callback)

    print(" [*] A aguardar mensagens na fila 'fila_cadastro_clientes'. Pressione CTRL+C para sair.")
    channel.start_consuming()

if __name__ == '__main__':
    iniciar_consumidor()
