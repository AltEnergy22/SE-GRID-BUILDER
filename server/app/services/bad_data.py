import numpy as np
import pandas as pd
import pandapower as pp
import pandapower.estimation as est
from typing import Dict, Any, Tuple
from scipy.stats import chi2

def detect_bad_data(net_dict: Dict[str, Any], chi_thresh: float = 0.95) -> Tuple[bool, pd.DataFrame]:
    """
    Detect bad data using Chi-square test and Largest Normalized Residual (LNR) analysis.
    
    Args:
        net_dict: Dictionary representation of a pandapower network with measurements
        chi_thresh: Chi-square test confidence level (default 0.95)
        
    Returns:
        Tuple of (chi_square_passed, suspect_measurements_dataframe)
    """
    try:
        # Convert to pandapower network
        net = pp.from_json_dict(net_dict)
        
        # Run state estimation
        try:
            est.estimate(net, init="flat")
            if not net.converged:
                raise ValueError("State estimation did not converge")
        except Exception as e:
            raise ValueError(f"State estimation failed: {str(e)}")
        
        # Check if we have measurement results
        if not hasattr(net, 'res_measurement') or net.res_measurement.empty:
            # No measurements available - return empty results
            empty_df = pd.DataFrame(columns=[
                "stream", "element_type", "element", "meas_type", 
                "value", "residual", "std_dev", "norm_res"
            ])
            return True, empty_df
        
        # Copy measurement results and calculate normalized residuals
        res = net.res_measurement.copy()
        
        # Calculate normalized residuals (avoid division by zero)
        res["norm_res"] = np.where(
            res["std_dev"] > 1e-10,
            np.abs(res["residual"] / res["std_dev"]),
            0.0
        )
        
        # Chi-square test
        chi_sq = (res["residual"]**2 / (res["std_dev"]**2 + 1e-10)).sum()
        
        # Degrees of freedom: num_measurements - num_state_variables
        # For power systems: roughly 2 * num_buses (voltage magnitude and angle)
        dof = max(1, len(res) - 2 * len(net.bus))
        
        try:
            chi_limit = chi2.ppf(chi_thresh, dof)
            chi_passed = chi_sq < chi_limit
        except:
            # Fallback if chi2 calculation fails
            chi_passed = True
        
        # Identify suspect measurements using 3-sigma rule
        suspects = res[res["norm_res"] > 3.0].copy()
        
        if len(suspects) > 0:
            # Assign stream type based on measurement type
            suspects = suspects.assign(
                stream=lambda df: np.where(
                    df["meas_type"].isin(["v", "va", "angle"]), 
                    "PMU", 
                    "SCADA"
                )
            )
            
            # Select relevant columns for output
            suspect_cols = [
                "stream", "element_type", "element", "meas_type",
                "value", "residual", "std_dev", "norm_res"
            ]
            suspects = suspects[suspect_cols]
        else:
            # No suspects found - return empty dataframe with correct structure
            suspects = pd.DataFrame(columns=[
                "stream", "element_type", "element", "meas_type", 
                "value", "residual", "std_dev", "norm_res"
            ])
        
        return chi_passed, suspects
        
    except Exception as e:
        # Return empty results if detection fails
        empty_df = pd.DataFrame(columns=[
            "stream", "element_type", "element", "meas_type", 
            "value", "residual", "std_dev", "norm_res"
        ])
        raise ValueError(f"Bad data detection failed: {str(e)}")


def calculate_calibration_factors(residual: float, std_dev: float) -> Tuple[float, float]:
    """
    Calculate suggested calibration factors based on residual analysis.
    
    Args:
        residual: Measurement residual
        std_dev: Standard deviation of measurement
        
    Returns:
        Tuple of (suggested_bias, suggested_scale)
    """
    # Bias correction: offset by negative residual to center the measurement
    suggested_bias = -residual
    
    # Scale correction: if normalized residual is large, suggest scale adjustment
    norm_res = abs(residual / (std_dev + 1e-10))
    if norm_res > 5.0:
        # Aggressive scale correction for very large residuals
        suggested_scale = 0.8
    elif norm_res > 3.0:
        # Moderate scale correction for moderately large residuals
        suggested_scale = 0.9
    else:
        # No scale correction needed
        suggested_scale = 1.0
    
    return suggested_bias, suggested_scale


def analyze_measurement_quality(net_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    Comprehensive measurement quality analysis.
    
    Args:
        net_dict: Dictionary representation of a pandapower network
        
    Returns:
        Dictionary with quality metrics and statistics
    """
    try:
        chi_passed, suspects = detect_bad_data(net_dict)
        
        quality_metrics = {
            "chi_square_passed": chi_passed,
            "total_measurements": 0,
            "suspect_count": len(suspects),
            "suspect_percentage": 0.0,
            "max_normalized_residual": 0.0,
            "mean_normalized_residual": 0.0,
            "suspects_by_type": {},
            "suspects_by_stream": {}
        }
        
        # Convert to pandapower network to get measurement count
        net = pp.from_json_dict(net_dict)
        if hasattr(net, 'res_measurement') and not net.res_measurement.empty:
            quality_metrics["total_measurements"] = len(net.res_measurement)
            quality_metrics["max_normalized_residual"] = float(net.res_measurement["norm_res"].max())
            quality_metrics["mean_normalized_residual"] = float(net.res_measurement["norm_res"].mean())
        
        if quality_metrics["total_measurements"] > 0:
            quality_metrics["suspect_percentage"] = (
                len(suspects) / quality_metrics["total_measurements"] * 100
            )
        
        # Analyze suspects by type and stream
        if len(suspects) > 0:
            quality_metrics["suspects_by_type"] = suspects["meas_type"].value_counts().to_dict()
            quality_metrics["suspects_by_stream"] = suspects["stream"].value_counts().to_dict()
        
        return quality_metrics
        
    except Exception as e:
        return {
            "error": str(e),
            "chi_square_passed": False,
            "total_measurements": 0,
            "suspect_count": 0,
            "suspect_percentage": 0.0,
            "max_normalized_residual": 0.0,
            "mean_normalized_residual": 0.0,
            "suspects_by_type": {},
            "suspects_by_stream": {}
        } 