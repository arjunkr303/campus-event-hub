import os

os.environ["POSTGRESQL_URL"] = "sqlite:///test.db"

from fastapi.testclient import TestClient
from main import app
from app.databases.event_database import create_engine_and_table

create_engine_and_table()

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"message": "Event Service is healthy"}


def test_get_events():
    response = client.get("/event/events")
    assert response.status_code == 401
