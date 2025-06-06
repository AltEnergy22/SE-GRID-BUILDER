import pytest
import httpx
from fastapi.testclient import TestClient
from app.main import app


def test_health_endpoint():
    """Test the health endpoint returns expected response."""
    client = TestClient(app)
    response = client.get("/health")
    
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_health_endpoint_async():
    """Test the health endpoint using async client."""
    async with httpx.AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/health")
    
    assert response.status_code == 200
    assert response.json() == {"status": "ok"} 