import time
from typing import Dict, Any

import pandapower as pp
from app.models.simulation import PFResult, BusResult, LineResult


def run_snapshot(net_dict: Dict[str, Any]) -> PFResult:
    """Run power flow analysis on a pandapower network.
    
    Args:
        net_dict: Dictionary representation of a pandapower network
        
    Returns:
        PFResult: Power flow analysis results
    """
    start_time = time.time()
    
    # Convert dictionary to pandapower network
    try:
        net = pp.from_json_dict(net_dict)
    except:
        # Fallback: reconstruct network from simplified dict
        net = pp.create_empty_network()
        
        # Reconstruct basic network structure
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
    
    # Run power flow
    pp.runpp(net, verbose=False)
    
    execution_time_ms = (time.time() - start_time) * 1000
    
    # Check convergence
    converged = net.converged
    
    # Extract bus results
    bus_results = []
    for idx, bus_data in net.res_bus.iterrows():
        bus_result = BusResult(
            bus_id=int(idx),
            vm_pu=float(bus_data['vm_pu']),
            va_degree=float(bus_data['va_degree']),
            p_mw=float(bus_data.get('p_mw', 0.0)),
            q_mvar=float(bus_data.get('q_mvar', 0.0))
        )
        bus_results.append(bus_result)
    
    # Extract line results
    line_results = []
    for idx, line_data in net.res_line.iterrows():
        line_result = LineResult(
            line_id=int(idx),
            from_bus=int(net.line.loc[idx, 'from_bus']),
            to_bus=int(net.line.loc[idx, 'to_bus']),
            p_from_mw=float(line_data['p_from_mw']),
            q_from_mvar=float(line_data['q_from_mvar']),
            p_to_mw=float(line_data['p_to_mw']),
            q_to_mvar=float(line_data['q_to_mvar']),
            loading_percent=float(line_data['loading_percent'])
        )
        line_results.append(line_result)
    
    # Calculate total losses
    total_losses_mw = float(net.res_line['pl_mw'].sum()) if 'pl_mw' in net.res_line else 0.0
    total_losses_mvar = float(net.res_line['ql_mvar'].sum()) if 'ql_mvar' in net.res_line else 0.0
    
    # Calculate maximum loading for RTCA use
    max_loading = 0.0
    if not net.res_line.empty and 'loading_percent' in net.res_line:
        max_loading = max(max_loading, float(net.res_line['loading_percent'].max()))
    if hasattr(net, 'res_trafo') and not net.res_trafo.empty and 'loading_percent' in net.res_trafo:
        max_loading = max(max_loading, float(net.res_trafo['loading_percent'].max()))
    
    result = PFResult(
        converged=converged,
        buses=bus_results,
        lines=line_results,
        total_losses_mw=total_losses_mw,
        total_losses_mvar=total_losses_mvar,
        execution_time_ms=execution_time_ms,
        max_loading=max_loading
    )
    
    return result 