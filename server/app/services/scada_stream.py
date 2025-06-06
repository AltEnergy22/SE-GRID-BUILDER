import asyncio
import itertools
import random
import time
import logging
from typing import Dict, Any, AsyncGenerator

import pandapower as pp

from app.models.telemetry import TelemetryFrame, StreamConfig
from app.services import calib_store

# Set up logging
logger = logging.getLogger(__name__)


def _create_network_from_dict(net_dict: Dict[str, Any]) -> pp.pandapowerNet:
    """Create pandapower network from dictionary, handling both formats."""
    try:
        return pp.from_json_dict(net_dict)
    except:
        # Fallback: reconstruct network from simplified dict
        net = pp.create_empty_network()
        
        if 'bus' in net_dict:
            for idx_str, bus_data in net_dict['bus'].items():
                pp.create_bus(net, vn_kv=bus_data['vn_kv'], name=bus_data.get('name', f'Bus {idx_str}'))
        
        if 'ext_grid' in net_dict:
            for idx_str, eg_data in net_dict['ext_grid'].items():
                pp.create_ext_grid(net, bus=eg_data['bus'], vm_pu=eg_data['vm_pu'])
        
        if 'load' in net_dict:
            for idx_str, load_data in net_dict['load'].items():
                pp.create_load(net, bus=load_data['bus'], p_mw=load_data['p_mw'], q_mvar=load_data['q_mvar'])
        
        if 'gen' in net_dict:
            for idx_str, gen_data in net_dict['gen'].items():
                pp.create_gen(net, bus=gen_data['bus'], p_mw=gen_data['p_mw'], vm_pu=gen_data['vm_pu'])
        
        if 'line' in net_dict:
            for idx_str, line_data in net_dict['line'].items():
                pp.create_line_from_parameters(
                    net, 
                    from_bus=line_data['from_bus'], 
                    to_bus=line_data['to_bus'],
                    length_km=line_data['length_km'],
                    r_ohm_per_km=line_data['r_ohm_per_km'],
                    x_ohm_per_km=line_data['x_ohm_per_km'],
                    c_nf_per_km=line_data['c_nf_per_km'],
                    max_i_ka=line_data['max_i_ka']
                )
        
        return net


def _gauss_noise(val: float, pct: float) -> float:
    """Apply Gaussian noise to a value."""
    if abs(val) < 1e-6:
        return val
    return random.gauss(val, pct * abs(val))


def _inject_gross_error(val: float, pct: float) -> float:
    """Inject a gross error (large deviation)."""
    if abs(val) < 1e-6:
        return val + random.uniform(-1.0, 1.0)
    
    magnitude = random.uniform(5, 20) * pct * abs(val)
    return val + random.choice([-magnitude, magnitude])


async def _apply_calibration(frame: Dict[str, Any]) -> Dict[str, Any]:
    """Apply calibration factors to a measurement frame if available."""
    try:
        bias_scale = await calib_store.get(
            frame["stream"],
            frame["element_type"],
            frame["element_id"],
            frame["meas_type"]
        )
        
        if bias_scale:
            bias, scale = bias_scale
            # Apply calibration: value = original_value * scale + bias
            frame["value"] = frame["value"] * scale + bias
    except Exception as e:
        # Silently continue if calibration lookup fails
        logger.debug(f"Calibration lookup failed: {e}")
    
    return frame


async def telemetry_generator(
    net_dict: Dict[str, Any],
    scada_period: float = 2.0,
    pmu_hz: int = 60,
    noise_pct: float = 0.01,
    bad_rate: float = 0.005,
    drift_per_min: float = 0.0002
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Generate telemetry frames with configurable noise, bad data, and drift.
    
    Yields TelemetryFrame dictionaries for both SCADA and PMU measurements.
    """
    # Initialize network
    try:
        net = _create_network_from_dict(net_dict)
        pp.runpp(net, verbose=False)
        if not net.converged:
            raise ValueError("Initial power flow did not converge")
    except Exception as e:
        logger.error(f"Failed to initialize network for streaming: {e}")
        raise
    
    # Initialize timing and drift
    stream_start = time.time()
    last_pf_update = stream_start
    drift_factor = 1.0
    pmu_interval = 1.0 / pmu_hz
    scada_countdown = scada_period
    
    try:
        for cycle in itertools.count():
            current_time = time.time()
            
            # Update power flow periodically (every SCADA period)
            if current_time - last_pf_update >= scada_period:
                try:
                    # Add small load variations to simulate dynamic conditions
                    for load_idx in net.load.index:
                        base_p = net.load.loc[load_idx, 'p_mw']
                        variation = random.gauss(0, 0.02)  # ±2% load variation
                        net.load.loc[load_idx, 'p_mw'] = base_p * (1 + variation)
                    
                    pp.runpp(net, init="results", verbose=False)
                    last_pf_update = current_time
                except Exception as e:
                    logger.warning(f"Power flow update failed: {e}")
            
            # Update calibration drift gradually
            drift_factor += drift_per_min * pmu_interval / 60.0
            
            # Generate PMU measurements (high-rate bus data)
            if not net.res_bus.empty:
                for bus_idx, bus_data in net.res_bus.iterrows():
                    # Voltage magnitude measurement
                    true_vm = float(bus_data['vm_pu'])
                    vm_with_drift = true_vm * drift_factor
                    
                    std_dev = noise_pct * abs(true_vm) if abs(true_vm) > 1e-6 else 0.001
                    vm_noisy = _gauss_noise(vm_with_drift, noise_pct)
                    
                    is_bad = random.random() < bad_rate
                    if is_bad:
                        vm_noisy = _inject_gross_error(vm_with_drift, noise_pct)
                    
                    frame = {
                        "ts": current_time,
                        "stream": "PMU",
                        "element_type": "bus",
                        "element_id": int(bus_idx),
                        "meas_type": "v",
                        "true_value": true_vm,
                        "value": vm_noisy,
                        "std_dev": std_dev,
                        "is_bad": is_bad
                    }
                    yield await _apply_calibration(frame)
                    
                    # Voltage angle measurement
                    true_va = float(bus_data['va_degree'])
                    va_with_drift = true_va * drift_factor
                    
                    std_dev = noise_pct * max(abs(true_va), 1.0)
                    va_noisy = _gauss_noise(va_with_drift, noise_pct)
                    
                    is_bad = random.random() < bad_rate
                    if is_bad:
                        va_noisy = _inject_gross_error(va_with_drift, noise_pct)
                    
                    frame = {
                        "ts": current_time,
                        "stream": "PMU",
                        "element_type": "bus",
                        "element_id": int(bus_idx),
                        "meas_type": "angle",
                        "true_value": true_va,
                        "value": va_noisy,
                        "std_dev": std_dev,
                        "is_bad": is_bad
                    }
                    yield await _apply_calibration(frame)
            
            # Generate frequency measurement (PMU)
            base_freq = 60.0
            freq = base_freq + random.gauss(0, 0.02)
            freq_with_drift = freq * drift_factor
            freq_std = 0.005
            freq_noisy = _gauss_noise(freq_with_drift, freq_std / freq)
            
            is_bad_freq = random.random() < bad_rate
            if is_bad_freq:
                freq_noisy = _inject_gross_error(freq_with_drift, freq_std / freq)
            
            frame = {
                "ts": current_time,
                "stream": "PMU",
                "element_type": "bus",
                "element_id": 0,
                "meas_type": "f",
                "true_value": freq,
                "value": freq_noisy,
                "std_dev": freq_std,
                "is_bad": is_bad_freq
            }
            yield await _apply_calibration(frame)
            
            # Generate SCADA measurements (slower rate)
            scada_countdown -= pmu_interval
            if scada_countdown <= 0:
                scada_countdown = scada_period
                
                # Line power measurements
                if not net.res_line.empty:
                    for line_idx, line_data in net.res_line.iterrows():
                        # Active power from-side
                        true_p = float(line_data['p_from_mw'])
                        p_with_drift = true_p * drift_factor
                        
                        std_dev = max(noise_pct * abs(true_p), 0.1) if abs(true_p) > 1e-6 else 0.1
                        p_noisy = _gauss_noise(p_with_drift, noise_pct)
                        
                        is_bad = random.random() < bad_rate
                        if is_bad:
                            p_noisy = _inject_gross_error(p_with_drift, noise_pct)
                        
                        frame = {
                            "ts": current_time,
                            "stream": "SCADA",
                            "element_type": "line",
                            "element_id": int(line_idx),
                            "meas_type": "p",
                            "true_value": true_p,
                            "value": p_noisy,
                            "std_dev": std_dev,
                            "is_bad": is_bad
                        }
                        yield await _apply_calibration(frame)
                        
                        # Reactive power from-side
                        true_q = float(line_data['q_from_mvar'])
                        q_with_drift = true_q * drift_factor
                        
                        std_dev = max(noise_pct * abs(true_q), 0.1) if abs(true_q) > 1e-6 else 0.1
                        q_noisy = _gauss_noise(q_with_drift, noise_pct)
                        
                        is_bad = random.random() < bad_rate
                        if is_bad:
                            q_noisy = _inject_gross_error(q_with_drift, noise_pct)
                        
                        frame = {
                            "ts": current_time,
                            "stream": "SCADA",
                            "element_type": "line",
                            "element_id": int(line_idx),
                            "meas_type": "q",
                            "true_value": true_q,
                            "value": q_noisy,
                            "std_dev": std_dev,
                            "is_bad": is_bad
                        }
                        yield await _apply_calibration(frame)
            
            # Wait for next PMU cycle
            await asyncio.sleep(pmu_interval)
            
    except asyncio.CancelledError:
        logger.info(f"Telemetry stream stopped after {time.time() - stream_start:.1f} seconds")
        raise
    except Exception as e:
        logger.error(f"Telemetry stream error: {e}")
        raise 