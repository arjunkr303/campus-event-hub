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
    assert response.json() == {"message": "User Service is healthy"}


def test_register_and_login():
    reg_payload = {
        "name": "Test User",
        "email": "testci@gmail.com",
        "password": "cipassword123",
        "role": "user",
    }
    reg_response = client.post("/auth/register", json=reg_payload)
    assert reg_response.status_code == 200
    assert "User Register Sucessfully!" in reg_response.json()["message"]

    login_payload = {"username": "testci@gmail.com", "password": "cipassword123"}
    login_response = client.post("/auth/login", data=login_payload)
    assert login_response.status_code == 200
    assert "access_token" in login_response.json()
