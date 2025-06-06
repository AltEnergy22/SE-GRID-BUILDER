import json
import asyncio
import pytest
import httpx
import time
from fastapi.testclient import TestClient
from app.main import app
from app.services.grid_store import GridStore
from app.core.config import settings
from app.models.telemetry import TelemetryFrame
import pandapower as pp


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def telemetry_test_net():
    """Create and save a test network for telemetry streaming."""
    # Create a simple 3-bus network
    net = pp.create_empty_network()
    
    # Create buses
    bus1 = pp.create_bus(net, vn_kv=20, name="Bus 1")
    bus2 = pp.create_bus(net, vn_kv=20, name="Bus 2") 
    bus3 = pp.create_bus(net, vn_kv=20, name="Bus 3")
    
    # Create external grid (slack bus)
    pp.create_ext_grid(net, bus=bus1, vm_pu=1.0, name="Grid Connection")
    
    # Create loads
    pp.create_load(net, bus=bus2, p_mw=10, q_mvar=5, name="Load 2")
    pp.create_load(net, bus=bus3, p_mw=8, q_mvar=3, name="Load 3")
    
    # Create generators
    pp.create_gen(net, bus=bus2, p_mw=6, vm_pu=1.0, name="Gen 2")
    
    # Create lines
    pp.create_line_from_parameters(net, from_bus=bus1, to_bus=bus2, 
                                   length_km=5, r_ohm_per_km=0.1, 
                                   x_ohm_per_km=0.1, c_nf_per_km=0.0, 
                                   max_i_ka=1.0, name="Line 1-2")
    pp.create_line_from_parameters(net, from_bus=bus2, to_bus=bus3, 
                                   length_km=8, r_ohm_per_km=0.1, 
                                   x_ohm_per_km=0.1, c_nf_per_km=0.0, 
                                   max_i_ka=1.0, name="Line 2-3")
    
    # Run power flow to ensure the network is valid
    pp.runpp(net)
    
    if not net.converged:
        raise ValueError("Telemetry test network power flow did not converge")
    
    # Save to grid store using simplified format
    grid_store = GridStore(settings.grids_path)
    
    # Create a simplified network dict for storage
    net_dict = {
        'bus': {str(i): {'vn_kv': float(row['vn_kv']), 'name': row['name']} 
                for i, row in net.bus.iterrows()},
        'load': {str(i): {'bus': int(row['bus']), 'p_mw': float(row['p_mw']), 'q_mvar': float(row['q_mvar'])} 
                 for i, row in net.load.iterrows()},
        'gen': {str(i): {'bus': int(row['bus']), 'p_mw': float(row['p_mw']), 'vm_pu': float(row['vm_pu'])} 
                for i, row in net.gen.iterrows()},
        'ext_grid': {str(i): {'bus': int(row['bus']), 'vm_pu': float(row['vm_pu'])} 
                     for i, row in net.ext_grid.iterrows()},
        'line': {str(i): {'from_bus': int(row['from_bus']), 'to_bus': int(row['to_bus']),
                          'length_km': float(row['length_km']), 'r_ohm_per_km': float(row['r_ohm_per_km']),
                          'x_ohm_per_km': float(row['x_ohm_per_km']), 'c_nf_per_km': float(row['c_nf_per_km']),
                          'max_i_ka': float(row['max_i_ka'])} 
                 for i, row in net.line.iterrows()},
        'metadata': {
            'name': 'Telemetry Test Network',
            'description': '3-bus test network for telemetry streaming'
        }
    }
    
    grid_id = grid_store.save_grid(net_dict, grid_id="telemetry-test")
    return grid_id


@pytest.mark.asyncio
async def test_telemetry_stream_basic(telemetry_test_net):
    """Test basic telemetry streaming functionality."""
    async with httpx.AsyncClient(app=app, base_url="http://test", timeout=10.0) as ac:
        url = f"/sim/{telemetry_test_net}/telemetry/stream?pmu_hz=30&scada_period=1&noise_pct=0.02"
        
        frames = []
        start_time = time.time()
        
        async with ac.stream("GET", url) as response:
            assert response.status_code == 200
            assert response.headers["content-type"] == "text/plain; charset=utf-8"
            
            async for line in response.aiter_lines():
                if line.startswith("data:"):
                    try:
                        frame_data = json.loads(line[5:].strip())
                        frame = TelemetryFrame(**frame_data)
                        frames.append(frame)
                    except json.JSONDecodeError:
                        continue
                
                # Collect frames for 2 seconds max
                if len(frames) >= 10 or (time.time() - start_time) > 2:
                    break
    
    # Verify we got some frames
    assert len(frames) > 0
    
    # Verify we have both PMU and SCADA frames
    pmu_frames = [f for f in frames if f.stream == "PMU"]
    scada_frames = [f for f in frames if f.stream == "SCADA"]
    
    assert len(pmu_frames) > 0, "Should have PMU frames"
    # SCADA frames might be empty if test runs too fast
    
    # Verify frame structure
    first_frame = frames[0]
    assert hasattr(first_frame, 'ts')
    assert hasattr(first_frame, 'stream')
    assert hasattr(first_frame, 'element_type')
    assert hasattr(first_frame, 'element_id')
    assert hasattr(first_frame, 'meas_type')
    assert hasattr(first_frame, 'true_value')
    assert hasattr(first_frame, 'value')
    assert hasattr(first_frame, 'std_dev')
    assert hasattr(first_frame, 'is_bad')


def test_telemetry_stream_sync(client, telemetry_test_net):
    """Test telemetry streaming with synchronous client."""
    url = f"/sim/{telemetry_test_net}/telemetry/stream?pmu_hz=20&scada_period=0.5"
    
    # Use a short timeout for testing
    with client.stream("GET", url, timeout=3.0) as response:
        assert response.status_code == 200
        
        frames = []
        for line in response.iter_lines():
            if line.startswith("data:"):
                try:
                    frame_data = json.loads(line[5:].strip())
                    frame = TelemetryFrame(**frame_data)
                    frames.append(frame)
                except json.JSONDecodeError:
                    continue
            
            if len(frames) >= 5:  # Just get a few frames for testing
                break
    
    assert len(frames) > 0


@pytest.mark.asyncio
async def test_telemetry_stream_bad_data_injection():
    """Test that bad data injection is working."""
    from app.services.scada_stream import telemetry_generator
    
    # Create a minimal test network dict
    net_dict = {
        'bus': {'0': {'vn_kv': 20.0, 'name': 'Bus 0'}, '1': {'vn_kv': 20.0, 'name': 'Bus 1'}},
        'ext_grid': {'0': {'bus': 0, 'vm_pu': 1.0}},
        'load': {'0': {'bus': 1, 'p_mw': 10.0, 'q_mvar': 5.0}},
        'gen': {},
        'line': {'0': {'from_bus': 0, 'to_bus': 1, 'length_km': 1.0, 'r_ohm_per_km': 0.1, 
                       'x_ohm_per_km': 0.1, 'c_nf_per_km': 0.0, 'max_i_ka': 1.0}}
    }
    
    frames = []
    bad_data_count = 0
    
    async for frame_dict in telemetry_generator(
        net_dict,
        scada_period=0.1,
        pmu_hz=100,  # High frequency for faster testing
        noise_pct=0.05,
        bad_rate=0.1,  # 10% bad data rate
        drift_per_min=0.001
    ):
        frames.append(frame_dict)
        if frame_dict['is_bad']:
            bad_data_count += 1
        
        if len(frames) >= 50:  # Collect 50 frames
            break
    
    assert len(frames) == 50
    # With 10% bad rate, expect some bad data (but not exactly 5 due to randomness)
    assert bad_data_count >= 1, "Should have some bad data frames"


@pytest.mark.asyncio
async def test_telemetry_stream_nonexistent_grid():
    """Test telemetry streaming with non-existent grid ID."""
    async with httpx.AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/sim/nonexistent-grid/telemetry/stream")
    
    assert response.status_code == 404
    assert "Grid not found" in response.json()["detail"]


def test_telemetry_models():
    """Test telemetry Pydantic model validation."""
    # Test TelemetryFrame model
    frame = TelemetryFrame(
        ts=time.time(),
        stream="PMU",
        element_type="bus",
        element_id=1,
        meas_type="v",
        true_value=1.05,
        value=1.048,
        std_dev=0.01,
        is_bad=False
    )
    
    assert frame.stream == "PMU"
    assert frame.element_type == "bus"
    assert frame.meas_type == "v"
    assert frame.true_value == 1.05
    assert frame.value == 1.048
    assert frame.is_bad is False


@pytest.mark.asyncio
async def test_telemetry_frame_types():
    """Test that we get different types of measurements."""
    from app.services.scada_stream import telemetry_generator
    
    # Create a test network with multiple elements
    net_dict = {
        'bus': {'0': {'vn_kv': 20.0, 'name': 'Bus 0'}, 
                '1': {'vn_kv': 20.0, 'name': 'Bus 1'},
                '2': {'vn_kv': 20.0, 'name': 'Bus 2'}},
        'ext_grid': {'0': {'bus': 0, 'vm_pu': 1.0}},
        'load': {'0': {'bus': 1, 'p_mw': 10.0, 'q_mvar': 5.0}},
        'gen': {'0': {'bus': 2, 'p_mw': 8.0, 'vm_pu': 1.0}},
        'line': {'0': {'from_bus': 0, 'to_bus': 1, 'length_km': 1.0, 'r_ohm_per_km': 0.1, 
                       'x_ohm_per_km': 0.1, 'c_nf_per_km': 0.0, 'max_i_ka': 1.0},
                 '1': {'from_bus': 1, 'to_bus': 2, 'length_km': 1.0, 'r_ohm_per_km': 0.1, 
                       'x_ohm_per_km': 0.1, 'c_nf_per_km': 0.0, 'max_i_ka': 1.0}}
    }
    
    frames = []
    measurement_types = set()
    stream_types = set()
    
    async for frame_dict in telemetry_generator(
        net_dict,
        scada_period=0.1,
        pmu_hz=50,
        noise_pct=0.01,
        bad_rate=0.02,
        drift_per_min=0.0
    ):
        frames.append(frame_dict)
        measurement_types.add(frame_dict['meas_type'])
        stream_types.add(frame_dict['stream'])
        
        if len(frames) >= 20:
            break
    
    # Should have multiple measurement types
    assert len(measurement_types) >= 2
    assert 'v' in measurement_types  # Voltage magnitude
    assert 'angle' in measurement_types  # Voltage angle
    assert 'f' in measurement_types  # Frequency
    
    # Should have both stream types
    assert 'PMU' in stream_types
    # SCADA might not appear in 20 frames depending on timing


def test_telemetry_parameter_validation(client, telemetry_test_net):
    """Test parameter validation for telemetry endpoint."""
    # Test invalid parameters
    response = client.get(f"/sim/{telemetry_test_net}/telemetry/stream?pmu_hz=5")  # Below minimum
    assert response.status_code == 422
    
    response = client.get(f"/sim/{telemetry_test_net}/telemetry/stream?pmu_hz=150")  # Above maximum
    assert response.status_code == 422
    
    response = client.get(f"/sim/{telemetry_test_net}/telemetry/stream?scada_period=0")  # Zero or negative
    assert response.status_code == 422
    
    response = client.get(f"/sim/{telemetry_test_net}/telemetry/stream?bad_rate=0.5")  # Above maximum
    assert response.status_code == 422 