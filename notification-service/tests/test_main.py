import os
import sys
from unittest.mock import MagicMock

sys.modules["app.messaging.consumer"] = MagicMock()

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"message": "Notification Service is healthy"}
