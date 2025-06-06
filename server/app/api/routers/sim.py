from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Body, Query
from sse_starlette.sse import EventSourceResponse
from app.api.deps import get_settings
from app.models.simulation import PFResult
from app.models.se import SEResult, SEInputMeas
from app.models.rtca import RTCABatchResult
from app.models.telemetry import TelemetryFrame
from app.services.grid_store import GridStore
from app.services.powerflow import run_snapshot
from app.services.state_est import run_wls, default_measurements
from app.services.rtca import run_n1, iter_n1
from app.services.scada_stream import telemetry_generator
from app.services.job_registry import create_job, set_progress, set_results, get as get_job
from app.core.config import Settings
import pandapower as pp
import json
import logging

router = APIRouter()


@router.post("/{grid_id}/snapshot", response_model=PFResult)
async def run_powerflow(grid_id: str, settings: Settings = Depends(get_settings)):
    """Run powerflow analysis on a grid."""
    grid_store = GridStore(settings.grids_path)
    net_dict = grid_store.load_grid(grid_id)
    if net_dict is None:
        raise HTTPException(status_code=404, detail="Grid not found")
    
    try:
        result = run_snapshot(net_dict)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Powerflow failed: {str(e)}")


@router.post("/{grid_id}/state-estimator", response_model=SEResult)
async def run_state_estimator(
    grid_id: str,
    meas: Optional[List[SEInputMeas]] = Body(default=None),
    settings: Settings = Depends(get_settings)
):
    """Run WLS state estimator. If no measurements provided, generate default SCADA set (P, Q, V with 1% σ)."""
    grid_store = GridStore(settings.grids_path)
    net_dict = grid_store.load_grid(grid_id)
    if net_dict is None:
        raise HTTPException(status_code=404, detail="Grid not found")
    
    # If no measurements provided, generate default measurements
    if meas is None:
        try:
            net = pp.from_json_dict(net_dict)
            meas = default_measurements(net)
            if not meas:
                raise HTTPException(
                    status_code=400, 
                    detail="Could not generate default measurements. Please provide measurements manually."
                )
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error generating default measurements: {str(e)}")
    
    try:
        # Convert Pydantic models to dictionaries
        measurements_dict = [m.dict() for m in meas]
        result = run_wls(net_dict, measurements_dict)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"State estimation failed: {str(e)}")


@router.post("/{grid_id}/rtca", response_model=RTCABatchResult)
async def run_rtca_analysis(
    grid_id: str,
    top20_only: bool = Query(True, description="Return only top 20 critical outages"),
    settings: Settings = Depends(get_settings)
):
    """Run N-1 contingency analysis with loading, voltage, and angle violation detection."""
    grid_store = GridStore(settings.grids_path)
    net_dict = grid_store.load_grid(grid_id)
    if net_dict is None:
        raise HTTPException(status_code=404, detail="Grid not found")
    
    try:
        result = run_n1(net_dict, top20_only=top20_only)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RTCA analysis failed: {str(e)}")


@router.get("/{grid_id}/rtca/stream")
async def rtca_stream(
    grid_id: str,
    settings: Settings = Depends(get_settings)
):
    """Stream RTCA N-1 analysis progress via Server-Sent Events."""
    grid_store = GridStore(settings.grids_path)
    net_dict = grid_store.load_grid(grid_id)
    if net_dict is None:
        raise HTTPException(status_code=404, detail="Grid not found")
    
    # Create job for tracking
    jid = create_job()
    logger = logging.getLogger(__name__)
    
    async def publisher():
        try:
            logger.info(f"Starting RTCA job {jid} for grid {grid_id}")
            
            for progress in iter_n1(net_dict):
                if progress.get("done"):
                    # Final result - set in job registry and emit done event
                    set_results(jid, progress["results"])
                    logger.info(f"RTCA job {jid} completed with {len(progress['results'])} results")
                    yield {
                        "event": "done", 
                        "data": json.dumps({"job": jid})
                    }
                    break
                else:
                    # Progress update
                    idx = progress["idx"]
                    total = progress["total"]
                    set_progress(jid, idx + 1, total)
                    
                    logger.info(f"RTCA job {jid} progress {idx + 1}/{total}")
                    
                    yield {
                        "event": "progress",
                        "data": json.dumps({
                            "job": jid,
                            "done": idx + 1,
                            "total": total,
                            "last_outage": progress["outage_id"],
                            "loading_pct": progress["loading_pct"]
                        })
                    }
        except Exception as e:
            logger.error(f"RTCA job {jid} failed: {e}")
            yield {
                "event": "error",
                "data": json.dumps({"job": jid, "error": str(e)})
            }

    return EventSourceResponse(publisher())


@router.get("/rtca/jobs/{job_id}")
async def rtca_job_status(job_id: str):
    """Get RTCA job status and results."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/{grid_id}/telemetry/stream")
async def stream_telemetry(
    grid_id: str,
    scada_period: float = Query(2.0, gt=0, description="SCADA measurement period in seconds"),
    pmu_hz: int = Query(60, ge=10, le=120, description="PMU sampling frequency in Hz"),
    noise_pct: float = Query(0.01, ge=0, le=1.0, description="Gaussian noise percentage"),
    bad_rate: float = Query(0.005, ge=0, le=0.2, description="Gross error injection rate"),
    drift_per_min: float = Query(0.0002, ge=0, description="Calibration drift per minute"),
    settings: Settings = Depends(get_settings)
):
    """
    SSE endpoint emitting mixed SCADA & PMU TelemetryFrame JSONs.
    
    Streams real-time telemetry data with configurable noise injection,
    bad data simulation, and calibration drift.
    """
    grid_store = GridStore(settings.grids_path)
    net_dict = grid_store.load_grid(grid_id)
    if net_dict is None:
        raise HTTPException(status_code=404, detail="Grid not found")
    
    # Set up logging for this stream
    logger = logging.getLogger(__name__)
    logger.info(
        f"Starting telemetry stream for grid {grid_id}",
        extra={
            "scada_period": scada_period,
            "pmu_hz": pmu_hz,
            "noise_pct": noise_pct,
            "bad_rate": bad_rate,
            "drift_per_min": drift_per_min
        }
    )

    async def event_publisher():
        try:
            async for frame in telemetry_generator(
                net_dict,
                scada_period=scada_period,
                pmu_hz=pmu_hz,
                noise_pct=noise_pct,
                bad_rate=bad_rate,
                drift_per_min=drift_per_min,
            ):
                # Convert to TelemetryFrame for validation
                telemetry_frame = TelemetryFrame(**frame)
                yield {
                    "event": "telemetry", 
                    "data": json.dumps(telemetry_frame.dict())
                }
        except Exception as e:
            logger.error(f"Telemetry stream error: {e}")
            yield {"event": "error", "data": json.dumps({"error": str(e)})}

    return EventSourceResponse(event_publisher()) 