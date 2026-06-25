import json
from dotenv import load_dotenv
from kafka import KafkaProducer
import os

load_dotenv()
import socket

RAW_BROKER = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "127.0.0.1:9092")


# Smart resolver: If running on local Windows, "kafka" hostname won't resolve.
# We catch that and automatically fallback to "127.0.0.1:9092".
def get_resolvable_broker(broker_address: str) -> str:
    try:
        host, port = broker_address.split(":")
        socket.gethostbyname(host)
        return broker_address
    except Exception:
        return "127.0.0.1:9092"


KAFKA_BROKER = get_resolvable_broker(RAW_BROKER)
producer = None


def get_producer():
    global producer
    if producer is not None:
        return producer
    try:
        print(f"Connecting to Kafka at: {KAFKA_BROKER}...")
        producer = KafkaProducer(
            bootstrap_servers=[KAFKA_BROKER],
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        )
        print("Kafka Producer successfully created!")
        return producer
    except Exception as e:
        print(f"Could not connect to Kafka: {e}")
        return None


get_producer()


def send_message(topic: str, data: dict):
    active_producer = get_producer()
    if active_producer is None:
        print("Error: Producer is not connected. Cannot send message.")
        return False
    try:
        active_producer.send(topic, value=data)
        active_producer.flush()
        return True
    except Exception as e:
        print(f"Failed to send message: {e}")
        return False


def publish_registration_event(registration_data: dict):
    topic_name = "registration-events"
    print(f"Publishing registration event to topic '{topic_name}'...")

    success = send_message(topic=topic_name, data=registration_data)
    return success
