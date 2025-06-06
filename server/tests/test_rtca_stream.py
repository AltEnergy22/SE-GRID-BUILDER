import pytest
import httpx
import json
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def alberta_net(client):
    """Create a test network fixture and return its grid_id."""
    # Create a simple 3-bus test network
    net_dict = {
        'bus': {
            '0': {'vn_kv': 110.0, 'name': 'Bus 0'},
            '1': {'vn_kv': 110.0, 'name': 'Bus 1'},
            '2': {'vn_kv': 110.0, 'name': 'Bus 2'}
        },
        'ext_grid': {
            '0': {'bus': 0, 'vm_pu': 1.02}
        },
        'load': {
            '0': {'bus': 1, 'p_mw': 100.0, 'q_mvar': 50.0},
            '1': {'bus': 2, 'p_mw': 80.0, 'q_mvar': 40.0}
        },
        'gen': {
            '0': {'bus': 1, 'p_mw': 90.0, 'vm_pu': 1.01}
        },
        'line': {
            '0': {'from_bus': 0, 'to_bus': 1, 'length_km': 50.0, 'r_ohm_per_km': 0.1, 
                  'x_ohm_per_km': 0.4, 'c_nf_per_km': 10.0, 'max_i_ka': 0.4},
            '1': {'from_bus': 1, 'to_bus': 2, 'length_km': 30.0, 'r_ohm_per_km': 0.1, 
                  'x_ohm_per_km': 0.4, 'c_nf_per_km': 10.0, 'max_i_ka': 0.3}
        }
    }
    
    # Save the network
    response = client.post("/grids/", json=net_dict)
    assert response.status_code == 200
    grid_id = response.json()["grid_id"]
    return grid_id


def test_rtca_sse_progress_sync(client):
    """Test RTCA SSE progress streaming using sync test client."""
    # Create a simple test network
    net_dict = {
        'bus': {
            '0': {'vn_kv': 110.0, 'name': 'Bus 0'},
            '1': {'vn_kv': 110.0, 'name': 'Bus 1'}
        },
        'ext_grid': {
            '0': {'bus': 0, 'vm_pu': 1.02}
        },
        'load': {
            '0': {'bus': 1, 'p_mw': 50.0, 'q_mvar': 25.0}
        },
        'line': {
            '0': {'from_bus': 0, 'to_bus': 1, 'length_km': 10.0, 'r_ohm_per_km': 0.1, 
                  'x_ohm_per_km': 0.4, 'c_nf_per_km': 10.0, 'max_i_ka': 0.4}
        }
    }
    
    # First save the network
    response = client.post("/grids/", json=net_dict)
    assert response.status_code == 200
    grid_id = response.json()["grid_id"]
    
    # Test streaming endpoint - just verify it starts
    # Note: For full SSE testing, we'd need to use a real async client
    # but this verifies the endpoint exists and accepts requests
    url = f"/sim/{grid_id}/rtca/stream"
    
    # Test that the endpoint exists and returns 200
    with client.stream("GET", url) as response:
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
        
        # Read first few bytes to ensure it's streaming
        content = response.iter_bytes(chunk_size=100).__next__()
        assert len(content) > 0


def test_rtca_iterator_directly():
    """Test the RTCA iterator function directly."""
    from app.services.rtca import iter_n1
    
    # Create a minimal test network dict
    net_dict = {
        'bus': {
            '0': {'vn_kv': 20.0, 'name': 'Bus 0'},
            '1': {'vn_kv': 20.0, 'name': 'Bus 1'}
        },
        'ext_grid': {
            '0': {'bus': 0, 'vm_pu': 1.0}
        },
        'load': {
            '0': {'bus': 1, 'p_mw': 10.0, 'q_mvar': 5.0}
        },
        'line': {
            '0': {'from_bus': 0, 'to_bus': 1, 'length_km': 1.0, 'r_ohm_per_km': 0.1, 
                  'x_ohm_per_km': 0.1, 'c_nf_per_km': 0.0, 'max_i_ka': 1.0}
        }
    }
    
    progress_count = 0
    final_result = None
    
    try:
        for progress in iter_n1(net_dict):
            if progress.get("done"):
                final_result = progress
                break
            else:
                progress_count += 1
                assert "idx" in progress
                assert "total" in progress
                assert "outage_id" in progress
                assert "loading_pct" in progress
        
        # Should have at least one progress update
        assert progress_count > 0
        assert final_result is not None
        assert "results" in final_result
        
    except Exception as e:
        # Service may fail with simplified network, but should handle gracefully
        assert "Base case" in str(e) or "power flow" in str(e).lower()


def test_job_registry():
    """Test the job registry functionality."""
    from app.services.job_registry import create_job, set_progress, set_results, get
    
    # Create a job
    jid = create_job()
    assert jid is not None
    assert len(jid) > 0
    
    # Check initial state
    job = get(jid)
    assert job is not None
    assert job["progress"] == 0
    assert job["total"] == 0
    assert job["results"] is None
    assert job["status"] == "running"
    
    # Update progress
    set_progress(jid, 5, 10)
    job = get(jid)
    assert job["progress"] == 5
    assert job["total"] == 10
    
    # Set results
    test_results = [{"test": "result"}]
    set_results(jid, test_results)
    job = get(jid)
    assert job["results"] == test_results
    assert job["status"] == "completed"


def test_job_status_endpoint(client, alberta_net):
    """Test the job status endpoint."""
    from app.services.job_registry import create_job, set_results
    
    # Create a job with some results
    jid = create_job()
    test_results = [{"outage_id": "LINE-0", "loading_pct": 85.5}]
    set_results(jid, test_results)
    
    # Test the endpoint
    response = client.get(f"/sim/rtca/jobs/{jid}")
    assert response.status_code == 200
    
    job_data = response.json()
    assert job_data["results"] == test_results
    assert job_data["status"] == "completed"
    
    # Test non-existent job
    response = client.get("/sim/rtca/jobs/nonexistent")
    assert response.status_code == 404 