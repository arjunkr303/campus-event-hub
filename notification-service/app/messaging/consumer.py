import json
import os
from kafka import KafkaConsumer
from app.service.notification_service import send_notifcation
from dotenv import load_dotenv

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


def start_consumer():
    print(f"Connecting to Kafka at: {KAFKA_BROKER}...")
    try:
        consumer = KafkaConsumer(
            "registration-created",
            bootstrap_servers=[KAFKA_BROKER],
            group_id="notification-group",
            auto_offset_reset="earliest",
            value_deserializer=lambda m: json.loads(m.decode("utf-8")),
        )

        for message in consumer:
            event_payload = message.value

            send_notifcation(event_payload)

    except Exception as e:
        import traceback

        print(f"Error: {e}")
        traceback.print_exc()


if __name__ == "__main__":
    start_consumer()
