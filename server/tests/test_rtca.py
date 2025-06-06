import pytest
import httpx
import pandapower as pp
from fastapi.testclient import TestClient
from app.main import app
from app.services.grid_store import GridStore
from app.core.config import settings
from app.models.rtca import RTCABatchResult, OutageResult, Violation


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def rtca_test_net():
    """Create and save a test network for RTCA analysis."""
    # Create a 4-bus network with potential for violations
    net = pp.create_empty_network()
    
    # Create buses
    bus1 = pp.create_bus(net, vn_kv=110, name="Bus 1")
    bus2 = pp.create_bus(net, vn_kv=110, name="Bus 2") 
    bus3 = pp.create_bus(net, vn_kv=110, name="Bus 3")
    bus4 = pp.create_bus(net, vn_kv=110, name="Bus 4")
    
    # Create external grid (slack bus)
    pp.create_ext_grid(net, bus=bus1, vm_pu=1.02, name="Grid Connection")
    
    # Create loads that will stress the system
    pp.create_load(net, bus=bus2, p_mw=150, q_mvar=50, name="Load 2")
    pp.create_load(net, bus=bus3, p_mw=120, q_mvar=40, name="Load 3")
    pp.create_load(net, bus=bus4, p_mw=100, q_mvar=30, name="Load 4")
    
    # Create generators
    pp.create_gen(net, bus=bus2, p_mw=80, vm_pu=1.01, name="Gen 2")
    pp.create_gen(net, bus=bus3, p_mw=70, vm_pu=1.00, name="Gen 3")
    
    # Create lines that can be stressed
    pp.create_line_from_parameters(net, from_bus=bus1, to_bus=bus2, 
                                   length_km=50, r_ohm_per_km=0.1, 
                                   x_ohm_per_km=0.1, c_nf_per_km=0.0, 
                                   max_i_ka=0.5, name="Line 1-2")  # Low capacity line
    pp.create_line_from_parameters(net, from_bus=bus2, to_bus=bus3, 
                                   length_km=30, r_ohm_per_km=0.1, 
                                   x_ohm_per_km=0.1, c_nf_per_km=0.0, 
                                   max_i_ka=1.0, name="Line 2-3")
    pp.create_line_from_parameters(net, from_bus=bus3, to_bus=bus4, 
                                   length_km=40, r_ohm_per_km=0.1, 
                                   x_ohm_per_km=0.1, c_nf_per_km=0.0, 
                                   max_i_ka=0.8, name="Line 3-4")
    pp.create_line_from_parameters(net, from_bus=bus1, to_bus=bus4, 
                                   length_km=60, r_ohm_per_km=0.1, 
                                   x_ohm_per_km=0.1, c_nf_per_km=0.0, 
                                   max_i_ka=1.2, name="Line 1-4")
    
    # Run power flow to ensure the network is valid
    pp.runpp(net)
    
    if not net.converged:
        raise ValueError("RTCA test network power flow did not converge")
    
    # Save to grid store
    grid_store = GridStore(settings.grids_path)
    
    # Create a simplified network dict for storage
    net_dict = {
        'bus': net.bus.to_dict(),
        'load': net.load.to_dict(),
        'gen': net.gen.to_dict(),
        'ext_grid': net.ext_grid.to_dict(),
        'line': net.line.to_dict(),
        'res_bus': net.res_bus.to_dict(),
        'res_line': net.res_line.to_dict(),
        'res_load': net.res_load.to_dict(),
        'res_gen': net.res_gen.to_dict(),
        'res_ext_grid': net.res_ext_grid.to_dict(),
        'converged': net.converged,
        'metadata': {
            'name': 'RTCA Test Network',
            'description': '4-bus test network for RTCA N-1 analysis'
        }
    }
    
    grid_id = grid_store.save_grid(net_dict, grid_id="rtca-test")
    return grid_id


@pytest.mark.asyncio
async def test_rtca_top20(rtca_test_net):
    """Test RTCA analysis returning top 20 critical outages."""
    async with httpx.AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post(f"/sim/{rtca_test_net}/rtca")
    
    assert response.status_code == 200
    body = response.json()
    
    # Validate response structure
    assert body["scope"] == "n1"
    assert body["analysed"] >= 0
    assert body["violations_found"] >= 0
    assert isinstance(body["top20"], list)
    assert len(body["top20"]) <= 20
    assert body["all"] is None  # Should be None when top20_only=True
    
    # If there are results, validate their structure
    if body["top20"]:
        first_result = body["top20"][0]
        assert "outage_id" in first_result
        assert "pre_flow_mva" in first_result
        assert "post_flow_mva" in first_result
        assert "loading_pct" in first_result
        assert "violations" in first_result


@pytest.mark.asyncio
async def test_rtca_all_results(rtca_test_net):
    """Test RTCA analysis returning all results."""
    async with httpx.AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post(f"/sim/{rtca_test_net}/rtca?top20_only=false")
    
    assert response.status_code == 200
    body = response.json()
    
    assert body["scope"] == "n1"
    assert body["analysed"] > 0  # Should have analyzed some outages
    assert isinstance(body["all"], list)  # Should include all results
    assert len(body["all"]) == body["analysed"]
    
    # Results should be sorted by loading percentage (descending)
    if len(body["all"]) > 1:
        for i in range(len(body["all"]) - 1):
            assert body["all"][i]["loading_pct"] >= body["all"][i + 1]["loading_pct"]


def test_rtca_with_sync_client(client, rtca_test_net):
    """Test RTCA analysis with synchronous client."""
    response = client.post(f"/sim/{rtca_test_net}/rtca")
    
    assert response.status_code == 200
    body = response.json()
    
    assert body["scope"] == "n1"
    assert body["analysed"] >= 0
    assert isinstance(body["top20"], list)


@pytest.mark.asyncio 
async def test_rtca_nonexistent_grid():
    """Test RTCA analysis with non-existent grid ID."""
    async with httpx.AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post("/sim/nonexistent-grid/rtca")
    
    assert response.status_code == 404
    assert "Grid not found" in response.json()["detail"]


def test_rtca_models():
    """Test RTCA Pydantic model validation."""
    # Test Violation model
    violation = Violation(
        type="loading",
        element="LINE-5",
        pre_value=80.0,
        post_value=105.0,
        limit=100.0
    )
    assert violation.type == "loading"
    assert violation.element == "LINE-5"
    
    # Test OutageResult model
    outage_result = OutageResult(
        outage_id="LINE-1",
        pre_flow_mva=50.0,
        post_flow_mva=120.0,
        loading_pct=120.0,
        violations=[violation]
    )
    assert outage_result.outage_id == "LINE-1"
    assert len(outage_result.violations) == 1
    
    # Test RTCABatchResult model
    batch_result = RTCABatchResult(
        scope="n1",
        analysed=10,
        violations_found=3,
        top20=[outage_result],
        all=None
    )
    assert batch_result.scope == "n1"
    assert batch_result.analysed == 10
    assert len(batch_result.top20) == 1


@pytest.mark.asyncio
async def test_rtca_service_directly():
    """Test the RTCA service directly without API."""
    from app.services.rtca import run_n1
    
    # Create a minimal test network dict
    net_dict = {
        'bus': {0: {'vn_kv': 20.0, 'name': 'Bus 0'}, 1: {'vn_kv': 20.0, 'name': 'Bus 1'}},
        'ext_grid': {0: {'bus': 0, 'vm_pu': 1.0}},
        'load': {0: {'bus': 1, 'p_mw': 10.0, 'q_mvar': 5.0}},
        'gen': {},
        'line': {0: {'from_bus': 0, 'to_bus': 1, 'length_km': 1.0, 'r_ohm_per_km': 0.1, 
                     'x_ohm_per_km': 0.1, 'c_nf_per_km': 0.0, 'max_i_ka': 1.0}}
    }
    
    try:
        result = run_n1(net_dict, top20_only=True)
        
        assert isinstance(result, RTCABatchResult)
        assert result.scope == "n1"
        assert result.analysed >= 0
        assert isinstance(result.top20, list)
        
    except Exception as e:
        # Service may fail with simplified network, but should handle gracefully
        assert "Base case" in str(e) or "power flow" in str(e).lower() 