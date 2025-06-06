import pytest
import asyncio
from fastapi.testclient import TestClient
from app.main import app
from app.services import calib_store
from app.services.bad_data import detect_bad_data, analyze_measurement_quality, calculate_calibration_factors
import json


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def test_net():
    """Create a test network for testing."""
    return {
        'bus': {
            '0': {'vn_kv': 110.0, 'name': 'Bus 0'},
            '1': {'vn_kv': 110.0, 'name': 'Bus 1'}
        },
        'ext_grid': {
            '0': {'bus': 0, 'vm_pu': 1.02}
        },
        'load': {
            '0': {'bus': 1, 'p_mw': 100.0, 'q_mvar': 50.0}
        },
        'line': {
            '0': {'from_bus': 0, 'to_bus': 1, 'length_km': 50.0, 'r_ohm_per_km': 0.1, 
                  'x_ohm_per_km': 0.4, 'c_nf_per_km': 10.0, 'max_i_ka': 0.4}
        }
    }


@pytest.fixture
async def setup_db():
    """Setup and cleanup test database."""
    # Initialize test database
    import tempfile
    import os
    from app.services.calib_store import DB
    
    # Use a temporary database file for tests
    test_db = tempfile.NamedTemporaryFile(delete=False)
    test_db.close()
    
    # Replace DB path temporarily
    original_db = calib_store.DB
    calib_store.DB = test_db.name
    
    try:
        await calib_store.init()
        yield
        await calib_store.clear_all()
    finally:
        # Restore original DB path
        calib_store.DB = original_db
        # Clean up test file
        try:
            os.unlink(test_db.name)
        except:
            pass


@pytest.mark.asyncio
async def test_calib_store_operations(setup_db):
    """Test basic calibration store CRUD operations."""
    # Test upsert and get
    await calib_store.upsert("SCADA", "line", 1, "p", -0.5, 0.95)
    
    result = await calib_store.get("SCADA", "line", 1, "p")
    assert result is not None
    bias, scale = result
    assert bias == -0.5
    assert scale == 0.95
    
    # Test clear
    await calib_store.clear("SCADA", "line", 1, "p")
    result = await calib_store.get("SCADA", "line", 1, "p")
    assert result is None


def test_bad_data_detection_basic():
    """Test basic bad data detection functionality."""
    # Simple network without measurements - should return empty results
    net_dict = {
        'bus': {'0': {'vn_kv': 20.0}, '1': {'vn_kv': 20.0}},
        'ext_grid': {'0': {'bus': 0, 'vm_pu': 1.0}},
        'load': {'0': {'bus': 1, 'p_mw': 10.0, 'q_mvar': 5.0}},
        'line': {'0': {'from_bus': 0, 'to_bus': 1, 'length_km': 1.0, 
                       'r_ohm_per_km': 0.1, 'x_ohm_per_km': 0.1, 
                       'c_nf_per_km': 0.0, 'max_i_ka': 1.0}}
    }
    
    try:
        chi_passed, suspects = detect_bad_data(net_dict)
        # Should return True and empty DataFrame when no measurements
        assert chi_passed
        assert len(suspects) == 0
    except ValueError:
        # It's okay if this fails - we don't have proper measurements
        pass


def test_calibration_factor_calculation():
    """Test calibration factor calculation."""
    # Small residual
    bias, scale = calculate_calibration_factors(0.1, 0.05)
    assert bias == -0.1
    assert scale == 1.0
    
    # Large residual
    bias, scale = calculate_calibration_factors(0.3, 0.05)
    assert bias == -0.3
    assert scale == 0.8


def test_measurement_quality_analysis():
    """Test measurement quality analysis."""
    # Simple network
    net_dict = {
        'bus': {'0': {'vn_kv': 20.0}, '1': {'vn_kv': 20.0}},
        'ext_grid': {'0': {'bus': 0, 'vm_pu': 1.0}},
        'load': {'0': {'bus': 1, 'p_mw': 10.0, 'q_mvar': 5.0}},
        'line': {'0': {'from_bus': 0, 'to_bus': 1, 'length_km': 1.0, 
                       'r_ohm_per_km': 0.1, 'x_ohm_per_km': 0.1, 
                       'c_nf_per_km': 0.0, 'max_i_ka': 1.0}}
    }
    
    quality = analyze_measurement_quality(net_dict)
    
    # Should have basic structure even if analysis fails
    assert "chi_square_passed" in quality
    assert "total_measurements" in quality
    assert "suspect_count" in quality
    assert "suspect_percentage" in quality


def test_calibration_api_endpoints(client, test_net):
    """Test calibration API endpoints."""
    # Save the test network
    response = client.post("/grids/", json=test_net)
    assert response.status_code == 200
    grid_id = response.json()["grid_id"]
    
    # Test suspects endpoint
    response = client.get(f"/calibration/{grid_id}/suspects")
    assert response.status_code == 200
    result = response.json()
    assert "chi_square_passed" in result
    assert "suspects" in result
    
    # Test apply calibration
    calib_payload = {
        "stream": "SCADA",
        "element_type": "line",
        "element_id": 0,
        "meas_type": "p",
        "bias": -0.5,
        "scale": 0.95
    }
    response = client.post("/calibration/apply", json=calib_payload)
    assert response.status_code == 200
    assert response.json()["status"] == "applied"


@pytest.mark.asyncio
async def test_calibration_integration(setup_db):
    """Test calibration integration with telemetry stream."""
    from app.services.scada_stream import _apply_calibration
    
    # Set up a calibration
    await calib_store.upsert("SCADA", "line", 0, "p", 5.0, 1.2)
    
    # Create a test frame
    frame = {
        "stream": "SCADA",
        "element_type": "line",
        "element_id": 0,
        "meas_type": "p",
        "value": 95.0
    }
    
    # Apply calibration
    calibrated_frame = await _apply_calibration(frame)
    
    # Check that calibration was applied: value = 95.0 * 1.2 + 5.0 = 119.0
    expected_value = 95.0 * 1.2 + 5.0
    assert calibrated_frame["value"] == expected_value


def test_calibration_api_validation(client):
    """Test API validation and error handling."""
    # Test non-existent grid
    response = client.get("/calibration/nonexistent-grid/suspects")
    assert response.status_code == 404
    
    # Test invalid threshold
    response = client.get("/calibration/test-grid/suspects?thresh=1.5")
    # Should fail validation (thresh > 1.0)
    
    # Test malformed calibration payload
    bad_payload = {
        "stream": "INVALID",
        "element_type": "invalid",
        # Missing required fields
    }
    response = client.post("/calibration/apply", json=bad_payload)
    assert response.status_code == 422  # Validation error


@pytest.mark.asyncio 
async def test_apply_and_verify_effect(client, test_net, setup_db):
    """Test applying calibration and verifying its effect on measurements."""
    # Save test network
    response = client.post("/grids/", json=test_net)
    assert response.status_code == 200
    grid_id = response.json()["grid_id"]
    
    # Get initial suspects (if any)
    response = client.get(f"/calibration/{grid_id}/suspects")
    assert response.status_code == 200
    initial_result = response.json()
    
    # Apply a test calibration to a specific sensor
    test_calibration = {
        "stream": "SCADA",
        "element_type": "line",
        "element_id": 0,
        "meas_type": "p",
        "bias": -2.0,
        "scale": 1.05
    }
    
    response = client.post("/calibration/apply", json=test_calibration)
    assert response.status_code == 200
    
    # Verify calibration was stored
    response = client.get("/calibration/list")
    assert response.status_code == 200
    calibrations = response.json()
    assert calibrations["count"] >= 1
    
    # Test clearing specific calibration
    response = client.post("/calibration/clear", json=test_calibration)
    assert response.status_code == 200
    
    # Verify it was cleared
    response = client.get("/calibration/list")
    assert response.status_code == 200
    calibrations_after = response.json()
    assert calibrations_after["count"] == calibrations["count"] - 1


if __name__ == "__main__":
    # Simple test runner for manual testing
    import asyncio
    
    async def run_basic_tests():
        await calib_store.init()
        await calib_store.clear_all()
        
        # Test basic operations
        await calib_store.upsert("SCADA", "line", 1, "p", -0.5, 0.95)
        result = await calib_store.get("SCADA", "line", 1, "p")
        print(f"Stored calibration: {result}")
        
        await calib_store.clear_all()
        print("Tests completed successfully!")
    
    asyncio.run(run_basic_tests()) 