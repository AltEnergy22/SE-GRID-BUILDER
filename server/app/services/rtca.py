import time
from typing import Dict, Any, List, Tuple, Generator
import pandapower as pp
import pandapower.topology as top
import numpy as np
from tqdm import tqdm

from app.models.rtca import RTCABatchResult, OutageResult, Violation
from app.services.powerflow import run_snapshot

# RTCA analysis limits
LOADING_LIMIT = 100.0  # %
VOLT_LOW_PU = 0.95
VOLT_HIGH_PU = 1.05
ANGLE_LIMIT = 30  # deg diff between neighbours


def _all_branch_outages(net: pp.pandapowerNet) -> List[Tuple[str, int]]:
    """Get all possible branch outages for N-1 analysis."""
    outages = []
    
    # Line outages
    if not net.line.empty:
        outages.extend([("line", i) for i in net.line.index])
    
    # Transformer outages
    if hasattr(net, 'trafo') and not net.trafo.empty:
        outages.extend([("trafo", i) for i in net.trafo.index])
    
    return outages


def _create_network_from_dict(net_dict: Dict[str, Any]) -> pp.pandapowerNet:
    """Create pandapower network from dictionary, handling both formats."""
    try:
        # Try pandapower's JSON format first
        return pp.from_json_dict(net_dict)
    except:
        # Fallback: reconstruct network from simplified dict
        net = pp.create_empty_network()
        
        # Reconstruct basic network structure
        if 'bus' in net_dict:
            for idx_str, bus_data in net_dict['bus'].items():
                idx = int(idx_str)
                pp.create_bus(net, vn_kv=bus_data['vn_kv'], name=bus_data.get('name', f'Bus {idx}'))
        
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


def iter_n1(net_dict: Dict[str, Any]) -> Generator[Dict[str, Any], None, None]:
    """
    Yields tuple (idx, total, outage_result_dict) each iteration.
    Final yield has key 'done': True and includes full sorted list.
    """
    # Get base case results
    try:
        base = run_snapshot(net_dict)
        if not base.converged:
            raise ValueError("Base case power flow did not converge")
    except Exception as e:
        raise ValueError(f"Base case analysis failed: {str(e)}")
    
    # Create base network for outage enumeration
    net0 = _create_network_from_dict(net_dict)
    
    # Get all possible outages
    outages = _all_branch_outages(net0)
    
    if not outages:
        yield {
            "done": True,
            "results": []
        }
        return
    
    results: List[OutageResult] = []
    total = len(outages)
    
    # Analyze each contingency
    for idx, (etype, element_idx) in enumerate(outages):
        try:
            # Create contingency network
            net = _create_network_from_dict(net_dict)
            
            # Apply outage
            if etype in net and element_idx in net[etype].index:
                net[etype].at[element_idx, 'in_service'] = False
            else:
                continue  # Skip if element doesn't exist
            
            # Run power flow for contingency
            try:
                pp.runpp(net, init="flat")
                if not net.converged:
                    continue  # Skip non-converged cases
            except:
                continue  # Skip failed power flows
            
            # Analyze violations
            violations = _analyze_violations(net, base, etype, element_idx)
            
            # Calculate loading metrics
            max_loading = 0.0
            if not net.res_line.empty and 'loading_percent' in net.res_line:
                max_loading = max(max_loading, float(net.res_line['loading_percent'].max()))
            if hasattr(net, 'res_trafo') and not net.res_trafo.empty and 'loading_percent' in net.res_trafo:
                max_loading = max(max_loading, float(net.res_trafo['loading_percent'].max()))
            
            # Create outage result
            outage_result = OutageResult(
                outage_id=f"{etype.upper()}-{element_idx}",
                pre_flow_mva=getattr(base, 'max_loading', 0.0),
                post_flow_mva=max_loading,
                loading_pct=max_loading,
                violations=violations
            )
            
            results.append(outage_result)
            
            # Yield progress update
            yield {
                "idx": idx,
                "total": total,
                "outage_id": f"{etype.upper()}-{element_idx}",
                "loading_pct": max_loading,
                "violations_count": len(violations)
            }
            
        except Exception as e:
            print(f"Error analyzing outage {etype}-{element_idx}: {e}")
            continue
    
    # Sort by severity (loading percentage)
    results.sort(key=lambda r: r.loading_pct, reverse=True)
    
    # Final yield with complete results
    yield {
        "done": True,
        "results": results
    }


def run_n1(net_dict: Dict[str, Any], top20_only: bool = True) -> RTCABatchResult:
    """Run N-1 contingency analysis.
    
    Args:
        net_dict: Dictionary representation of a pandapower network
        top20_only: If True, only return top 20 critical outages
        
    Returns:
        RTCABatchResult: Complete N-1 analysis results
    """
    # Use the iterator and collect results
    results = []
    for progress in iter_n1(net_dict):
        if progress.get("done"):
            results = progress["results"]
            break
    
    # Calculate statistics
    total_violations = sum(len(r.violations) for r in results)
    top20 = results[:20]
    
    return RTCABatchResult(
        scope="n1",
        analysed=len(results),
        violations_found=total_violations,
        top20=top20,
        all=None if top20_only else results
    )


def _analyze_violations(net: pp.pandapowerNet, base, etype: str, idx: int) -> List[Violation]:
    """Analyze violations for a contingency case."""
    violations = []
    
    # Branch loading violations
    max_loading = 0.0
    if not net.res_line.empty and 'loading_percent' in net.res_line:
        line_loading = net.res_line['loading_percent']
        max_loading = max(max_loading, float(line_loading.max()))
        
        overloaded_lines = line_loading[line_loading > LOADING_LIMIT]
        for line_idx, loading in overloaded_lines.items():
            violations.append(Violation(
                type="loading",
                element=f"LINE-{line_idx}",
                pre_value=getattr(base, 'max_loading', 0.0),
                post_value=float(loading),
                limit=LOADING_LIMIT
            ))
    
    if hasattr(net, 'res_trafo') and not net.res_trafo.empty and 'loading_percent' in net.res_trafo:
        trafo_loading = net.res_trafo['loading_percent']
        max_loading = max(max_loading, float(trafo_loading.max()))
        
        overloaded_trafos = trafo_loading[trafo_loading > LOADING_LIMIT]
        for trafo_idx, loading in overloaded_trafos.items():
            violations.append(Violation(
                type="loading",
                element=f"TRAFO-{trafo_idx}",
                pre_value=getattr(base, 'max_loading', 0.0),
                post_value=float(loading),
                limit=LOADING_LIMIT
            ))
    
    # Voltage violations
    if not net.res_bus.empty and 'vm_pu' in net.res_bus:
        vm_pu = net.res_bus['vm_pu']
        
        # Undervoltage violations
        undervolt_buses = vm_pu[vm_pu < VOLT_LOW_PU]
        for bus_idx, voltage in undervolt_buses.items():
            base_voltage = base.buses[bus_idx].vm_pu if bus_idx < len(base.buses) else 1.0
            violations.append(Violation(
                type="undervolt",
                element=f"BUS-{bus_idx}",
                pre_value=base_voltage,
                post_value=float(voltage),
                limit=VOLT_LOW_PU
            ))
        
        # Overvoltage violations
        overvolt_buses = vm_pu[vm_pu > VOLT_HIGH_PU]
        for bus_idx, voltage in overvolt_buses.items():
            base_voltage = base.buses[bus_idx].vm_pu if bus_idx < len(base.buses) else 1.0
            violations.append(Violation(
                type="overvolt",
                element=f"BUS-{bus_idx}",
                pre_value=base_voltage,
                post_value=float(voltage),
                limit=VOLT_HIGH_PU
            ))
    
    # Voltage angle violations
    if not net.res_bus.empty and 'va_degree' in net.res_bus:
        va_degree = net.res_bus['va_degree'].sort_values()
        if len(va_degree) > 1:
            angle_diffs = np.abs(np.diff(va_degree.values))
            max_angle_diff = float(angle_diffs.max())
            
            if max_angle_diff > ANGLE_LIMIT:
                violations.append(Violation(
                    type="angle",
                    element="SYSTEM",
                    pre_value=0.0,
                    post_value=max_angle_diff,
                    limit=ANGLE_LIMIT
                ))
    
    return violations 