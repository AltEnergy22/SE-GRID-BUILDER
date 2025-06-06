import pytest
import httpx
import pandapower as pp
import pandapower.networks as pn
from fastapi.testclient import TestClient
from app.main import app
from app.services.grid_store import GridStore
from app.core.config import settings
from app.models.se import SEInputMeas


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def alberta_net():
    """Create and save a sample 3-bus Alberta network for testing."""
    # Create a simple 3-bus test network
    net = pp.create_empty_network()
    
    # Create buses
    bus1 = pp.create_bus(net, vn_kv=110, name="Bus 1")
    bus2 = pp.create_bus(net, vn_kv=110, name="Bus 2") 
    bus3 = pp.create_bus(net, vn_kv=110, name="Bus 3")
    
    # Create external grid (slack bus)
    pp.create_ext_grid(net, bus=bus1, vm_pu=1.02, name="Grid Connection")
    
    # Create loads
    pp.create_load(net, bus=bus2, p_mw=90, q_mvar=30, name="Load 2")
    pp.create_load(net, bus=bus3, p_mw=100, q_mvar=35, name="Load 3")
    
    # Create generators
    pp.create_gen(net, bus=bus2, p_mw=80, vm_pu=1.01, name="Gen 2")
    
    # Create lines
    pp.create_line(net, from_bus=bus1, to_bus=bus2, length_km=30, 
                   std_type="NAYY 4x50 SE", name="Line 1-2")
    pp.create_line(net, from_bus=bus2, to_bus=bus3, length_km=20, 
                   std_type="NAYY 4x50 SE", name="Line 2-3")
    pp.create_line(net, from_bus=bus1, to_bus=bus3, length_km=40, 
                   std_type="NAYY 4x50 SE", name="Line 1-3")
    
    # Run power flow to ensure the network is valid
    pp.runpp(net)
    
    # Save to grid store
    grid_store = GridStore(settings.grids_path)
    net_dict = pp.to_json_dict(net)
    net_dict['metadata'] = {
        'name': 'Alberta Test Network',
        'description': '3-bus test network for state estimation testing'
    }
    
    grid_id = grid_store.save_grid(net_dict, grid_id="alberta-test")
    return grid_id


@pytest.mark.asyncio
async def test_se_converges_with_default_measurements(alberta_net):
    """Test that state estimation converges with default measurements."""
    async with httpx.AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post(f"/sim/{alberta_net}/state-estimator")
    
    assert response.status_code == 200
    body = response.json()
    
    assert body["converged"] is True
    assert body["iterations"] >= 0
    assert body["elapsed_ms"] > 0
    assert len(body["bus_vm_pu"]) > 0
    assert len(body["bus_va_degree"]) > 0
    assert len(body["residuals"]) > 0
    
    # Check that we have reasonable voltage magnitudes
    for vm in body["bus_vm_pu"]:
        assert 0.9 <= vm <= 1.1  # Reasonable per-unit voltage range


@pytest.mark.asyncio
async def test_se_with_custom_measurements(alberta_net):
    """Test state estimation with custom measurements."""
    # Define custom measurements
    measurements = [
        {
            "element_type": "bus",
            "element_id": 0,
            "meas_type": "v",
            "value": 1.02,
            "std_dev": 0.01
        },
        {
            "element_type": "line",
            "element_id": 0,
            "meas_type": "p",
            "value": 50.0,
            "std_dev": 0.5
        },
        {
            "element_type": "line",
            "element_id": 0,
            "meas_type": "q",
            "value": 15.0,
            "std_dev": 0.5
        }
    ]
    
    async with httpx.AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post(
            f"/sim/{alberta_net}/state-estimator",
            json=measurements
        )
    
    assert response.status_code == 200
    body = response.json()
    
    assert body["converged"] is True
    assert len(body["residuals"]) == len(measurements)


def test_se_with_sync_client(client, alberta_net):
    """Test state estimation with synchronous client."""
    response = client.post(f"/sim/{alberta_net}/state-estimator")
    
    assert response.status_code == 200
    body = response.json()
    
    assert body["converged"] is True
    assert body["iterations"] <= 10  # Should converge quickly
    assert len(body["bus_vm_pu"]) > 0


@pytest.mark.asyncio 
async def test_se_nonexistent_grid():
    """Test state estimation with non-existent grid ID."""
    async with httpx.AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post("/sim/nonexistent-grid/state-estimator")
    
    assert response.status_code == 404
    assert "Grid not found" in response.json()["detail"]


@pytest.mark.asyncio
async def test_se_invalid_measurements(alberta_net):
    """Test state estimation with invalid measurements."""
    # Invalid measurement with negative standard deviation
    invalid_measurements = [
        {
            "element_type": "bus",
            "element_id": 0,
            "meas_type": "v",
            "value": 1.02,
            "std_dev": -0.01  # Invalid negative std_dev
        }
    ]
    
    async with httpx.AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post(
            f"/sim/{alberta_net}/state-estimator",
            json=invalid_measurements
        )
    
    assert response.status_code == 422  # Validation error


def test_se_input_meas_validation():
    """Test SEInputMeas model validation."""
    # Valid measurement
    valid_meas = SEInputMeas(
        element_type="bus",
        element_id=0,
        meas_type="v",
        value=1.0,
        std_dev=0.01
    )
    assert valid_meas.std_dev == 0.01
    
    # Invalid measurement with negative std_dev
    with pytest.raises(ValueError):
        SEInputMeas(
            element_type="bus",
            element_id=0,
            meas_type="v",
            value=1.0,
            std_dev=-0.01
        ) 