import time
from typing import Dict, Any, List
import pandapower as pp
import pandapower.estimation as est
import numpy as np
from app.models.se import SEResult, SEResidual, SEInputMeas


def run_wls(net_dict: Dict[str, Any], measurements: List[Dict[str, Any]]) -> SEResult:
    """Run weighted least squares state estimation.
    
    Args:
        net_dict: Dictionary representation of a pandapower network
        measurements: List of measurement dictionaries
        
    Returns:
        SEResult: State estimation results
    """
    # Convert to pandapower network
    try:
        net = pp.from_json_dict(net_dict)
    except:
        # Fallback: reconstruct network from simplified dict
        net = pp.create_empty_network()
        
        # Reconstruct basic network structure
        if 'bus' in net_dict:
            for idx, bus_data in net_dict['bus'].items():
                pp.create_bus(net, vn_kv=bus_data['vn_kv'], name=bus_data.get('name', f'Bus {idx}'))
        
        if 'ext_grid' in net_dict:
            for idx, eg_data in net_dict['ext_grid'].items():
                pp.create_ext_grid(net, bus=eg_data['bus'], vm_pu=eg_data['vm_pu'])
        
        if 'load' in net_dict:
            for idx, load_data in net_dict['load'].items():
                pp.create_load(net, bus=load_data['bus'], p_mw=load_data['p_mw'], q_mvar=load_data['q_mvar'])
        
        if 'gen' in net_dict:
            for idx, gen_data in net_dict['gen'].items():
                pp.create_gen(net, bus=gen_data['bus'], p_mw=gen_data['p_mw'], vm_pu=gen_data['vm_pu'])
        
        if 'line' in net_dict:
            for idx, line_data in net_dict['line'].items():
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
    
    start_time = time.perf_counter()
    
    # Clear existing measurements and inject new ones
    if not net.measurement.empty:
        net.measurement.drop(net.measurement.index, inplace=True)
    
    for m in measurements:
        # Add side parameter for line/trafo measurements
        kwargs = {
            "net": net,
            "meas_type": m["meas_type"],
            "element_type": m["element_type"],
            "value": m["value"],
            "std_dev": m["std_dev"],
            "element": m["element_id"]
        }
        
        # Add side parameter for line and trafo measurements
        if m["element_type"] in ["line", "trafo"]:
            kwargs["side"] = "from"
        
        pp.create_measurement(**kwargs)
    
    # Run state estimation
    try:
        result = est.estimate(net, init="flat")
        # Handle different return formats
        if isinstance(result, dict):
            converged = result.get('success', False)
            iterations = result.get('num_iterations', 0)
        else:
            converged = bool(result)
            iterations = 0
    except Exception as e:
        print(f"State estimation failed: {e}")
        converged = False
        iterations = 0
    
    elapsed_ms = (time.perf_counter() - start_time) * 1000
    
    # Extract results
    bus_vm_pu = net.res_bus.vm_pu.tolist() if converged else []
    bus_va_degree = net.res_bus.va_degree.tolist() if converged else []
    
    # Extract residuals
    residuals = []
    if converged and hasattr(net, 'res_measurement') and not net.res_measurement.empty:
        for _, row in net.res_measurement.iterrows():
            residual = SEResidual(
                element_type=str(row.element_type),
                element_id=int(row.element),
                meas_type=str(row.meas_type),
                residual=float(row.residual),
                std_dev=float(row.std_dev)
            )
            residuals.append(residual)
    
    # iterations is already set above
    
    return SEResult(
        converged=converged,
        iterations=iterations,
        elapsed_ms=elapsed_ms,
        bus_vm_pu=bus_vm_pu,
        bus_va_degree=bus_va_degree,
        residuals=residuals
    )


def default_measurements(net: pp.pandapowerNet) -> List[SEInputMeas]:
    """Generate default SCADA measurements for a network.
    
    Creates measurements for:
    - Bus voltage magnitudes (all buses)
    - Line/trafo active and reactive power at from-end
    
    Uses power flow results as "true" values with 1% standard deviation.
    
    Args:
        net: pandapower network
        
    Returns:
        List of SEInputMeas objects
    """
    measurements = []
    
    # Run power flow to get "true" values
    try:
        pp.runpp(net, verbose=False)
        if not net.converged:
            raise ValueError("Power flow did not converge")
    except Exception as e:
        print(f"Warning: Could not run power flow for default measurements: {e}")
        return measurements
    
    # Bus voltage measurements (all buses)
    for bus_idx in net.bus.index:
        if bus_idx in net.res_bus.index:
            vm_pu = net.res_bus.loc[bus_idx, 'vm_pu']
            std_dev = max(0.01, 0.01 * abs(vm_pu))  # 1% or minimum 0.01 pu
            
            measurements.append(SEInputMeas(
                element_type="bus",
                element_id=int(bus_idx),
                meas_type="v",
                value=float(vm_pu),
                std_dev=std_dev
            ))
    
    # Line power measurements (from-end)
    for line_idx in net.line.index:
        if line_idx in net.res_line.index:
            p_from_mw = net.res_line.loc[line_idx, 'p_from_mw']
            q_from_mvar = net.res_line.loc[line_idx, 'q_from_mvar']
            
            # Active power measurement
            p_std_dev = max(0.1, 0.01 * abs(p_from_mw))  # 1% or minimum 0.1 MW
            measurements.append(SEInputMeas(
                element_type="line",
                element_id=int(line_idx),
                meas_type="p",
                value=float(p_from_mw),
                std_dev=p_std_dev
            ))
            
            # Reactive power measurement
            q_std_dev = max(0.1, 0.01 * abs(q_from_mvar))  # 1% or minimum 0.1 MVAr
            measurements.append(SEInputMeas(
                element_type="line",
                element_id=int(line_idx),
                meas_type="q",
                value=float(q_from_mvar),
                std_dev=q_std_dev
            ))
    
    # Transformer power measurements (from-end)
    if hasattr(net, 'trafo') and not net.trafo.empty:
        for trafo_idx in net.trafo.index:
            if hasattr(net, 'res_trafo') and trafo_idx in net.res_trafo.index:
                p_from_mw = net.res_trafo.loc[trafo_idx, 'p_hv_mw']
                q_from_mvar = net.res_trafo.loc[trafo_idx, 'q_hv_mvar']
                
                # Active power measurement
                p_std_dev = max(0.1, 0.01 * abs(p_from_mw))
                measurements.append(SEInputMeas(
                    element_type="trafo",
                    element_id=int(trafo_idx),
                    meas_type="p",
                    value=float(p_from_mw),
                    std_dev=p_std_dev
                ))
                
                # Reactive power measurement
                q_std_dev = max(0.1, 0.01 * abs(q_from_mvar))
                measurements.append(SEInputMeas(
                    element_type="trafo",
                    element_id=int(trafo_idx),
                    meas_type="q",
                    value=float(q_from_mvar),
                    std_dev=q_std_dev
                ))
    
    return measurements 