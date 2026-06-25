from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.databases.event_database import lifespan
from fastapi import Response
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from app.routes.event_router import router as event_router

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:8001",
        "http://127.0.0.1:8001",
        "http://localhost:8002",
        "http://127.0.0.1:8002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(event_router, prefix="/event", tags=["Events"])


@app.get("/")
def home():
    return {"message": "Welcome to Event Service server...."}


@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/health")
def health():
    return {"message": "Event Service is healthy"}
