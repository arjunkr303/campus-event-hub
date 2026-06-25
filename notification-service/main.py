import threading
from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.messaging.consumer import start_consumer
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting background Kafka consumer......")

    consumer_thread = threading.Thread(target=start_consumer, daemon=True)
    consumer_thread.start()
    yield
    print("Notification Service shutting down....")


app = FastAPI(lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "Welcome to the Notification Service!"}


@app.get("/health")
def health():
    return {"message": "Notification Service is healthy"}
