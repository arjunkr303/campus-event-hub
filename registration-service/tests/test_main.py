import os

os.environ["POSTGRESQL_URL"] = "sqlite:///test.db"

from fastapi.testclient import TestClient
from main import app
from app.database.connection import create_db_and_tables

create_db_and_tables()

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"message": "Registration Service is healthy"}
