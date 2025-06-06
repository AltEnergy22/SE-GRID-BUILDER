from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel

from app.api.deps import get_settings
from app.core.config import Settings
from app.services.grid_store import GridStore
from app.services.bad_data import detect_bad_data, analyze_measurement_quality, calculate_calibration_factors
from app.services import calib_store

router = APIRouter(prefix="/calibration", tags=["calibration"])


class CalibPayload(BaseModel):
    """Payload for calibration operations."""
    stream: str
    element_type: str
    element_id: int
    meas_type: str
    bias: float = 0.0
    scale: float = 1.0


class SuspectMeasurement(BaseModel):
    """Suspect measurement with suggested calibration."""
    stream: str
    element_type: str
    element: int
    meas_type: str
    value: float
    residual: float
    std_dev: float
    norm_res: float
    suggested_bias: Optional[float] = None
    suggested_scale: Optional[float] = None


class BadDataResult(BaseModel):
    """Bad data detection result."""
    chi_square_passed: bool
    suspect_count: int
    total_measurements: int
    suspects: List[SuspectMeasurement]
    quality_metrics: dict


@router.get("/{grid_id}/suspects", response_model=BadDataResult)
async def list_suspects(
    grid_id: str,
    thresh: float = Query(0.95, ge=0.5, le=0.999, description="Chi-square confidence threshold"),
    settings: Settings = Depends(get_settings)
):
    """
    Detect suspect measurements using Chi-square and LNR tests.
    
    Analyzes the latest state estimation solution to identify sensors
    with abnormally large residuals that may indicate bad data or
    calibration issues.
    """
    grid_store = GridStore(settings.grids_path)
    net_dict = grid_store.load_grid(grid_id)
    if net_dict is None:
        raise HTTPException(status_code=404, detail="Grid not found")
    
    try:
        chi_passed, suspects_df = detect_bad_data(net_dict, chi_thresh=thresh)
        quality_metrics = analyze_measurement_quality(net_dict)
        
        # Convert DataFrame to list of SuspectMeasurement objects
        suspects = []
        for _, row in suspects_df.iterrows():
            # Calculate suggested calibration factors
            suggested_bias, suggested_scale = calculate_calibration_factors(
                row["residual"], row["std_dev"]
            )
            
            suspect = SuspectMeasurement(
                stream=row["stream"],
                element_type=row["element_type"],
                element=int(row["element"]),
                meas_type=row["meas_type"],
                value=float(row["value"]),
                residual=float(row["residual"]),
                std_dev=float(row["std_dev"]),
                norm_res=float(row["norm_res"]),
                suggested_bias=suggested_bias,
                suggested_scale=suggested_scale
            )
            suspects.append(suspect)
        
        return BadDataResult(
            chi_square_passed=chi_passed,
            suspect_count=len(suspects),
            total_measurements=quality_metrics.get("total_measurements", 0),
            suspects=suspects,
            quality_metrics=quality_metrics
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bad data detection failed: {str(e)}")


@router.post("/apply")
async def apply_calibration(payload: CalibPayload):
    """
    Apply calibration factors to a specific sensor.
    
    The calibration factors will be persisted and automatically applied
    to future measurements from this sensor in the telemetry stream.
    """
    try:
        await calib_store.upsert(
            payload.stream,
            payload.element_type,
            payload.element_id,
            payload.meas_type,
            payload.bias,
            payload.scale
        )
        return {
            "status": "applied",
            "message": f"Calibration applied to {payload.stream} {payload.element_type}-{payload.element_id} {payload.meas_type}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to apply calibration: {str(e)}")


@router.post("/clear")
async def clear_calibration(payload: CalibPayload):
    """
    Clear calibration factors for a specific sensor.
    
    This removes any existing calibration and returns the sensor
    to its original measurement values.
    """
    try:
        await calib_store.clear(
            payload.stream,
            payload.element_type,
            payload.element_id,
            payload.meas_type
        )
        return {
            "status": "cleared",
            "message": f"Calibration cleared for {payload.stream} {payload.element_type}-{payload.element_id} {payload.meas_type}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear calibration: {str(e)}")


@router.get("/list")
async def list_calibrations():
    """
    List all active calibration factors.
    
    Returns all sensors that currently have calibration factors applied.
    """
    try:
        calibrations = await calib_store.list_all()
        return {
            "calibrations": calibrations,
            "count": len(calibrations)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list calibrations: {str(e)}")


@router.delete("/clear-all")
async def clear_all_calibrations():
    """
    Clear all calibration factors.
    
    This removes all calibrations and returns all sensors to their
    original measurement values. Use with caution.
    """
    try:
        deleted_count = await calib_store.clear_all()
        return {
            "status": "cleared",
            "message": f"Cleared {deleted_count} calibrations"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear all calibrations: {str(e)}")


@router.get("/{grid_id}/quality")
async def measurement_quality(
    grid_id: str,
    settings: Settings = Depends(get_settings)
):
    """
    Get comprehensive measurement quality analysis.
    
    Provides detailed statistics about measurement quality including
    chi-square test results, residual statistics, and suspect analysis.
    """
    grid_store = GridStore(settings.grids_path)
    net_dict = grid_store.load_grid(grid_id)
    if net_dict is None:
        raise HTTPException(status_code=404, detail="Grid not found")
    
    try:
        quality_metrics = analyze_measurement_quality(net_dict)
        return quality_metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quality analysis failed: {str(e)}") 