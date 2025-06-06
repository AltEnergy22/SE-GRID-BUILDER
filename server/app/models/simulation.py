from pydantic import BaseModel
from typing import Dict, List, Any, Optional


class BusResult(BaseModel):
    """Power flow result for a bus."""
    bus_id: int
    vm_pu: float  # Voltage magnitude in per unit
    va_degree: float  # Voltage angle in degrees
    p_mw: float  # Active power in MW
    q_mvar: float  # Reactive power in MVAr


class LineResult(BaseModel):
    """Power flow result for a line."""
    line_id: int
    from_bus: int
    to_bus: int
    p_from_mw: float  # Active power from 'from_bus' side
    q_from_mvar: float  # Reactive power from 'from_bus' side
    p_to_mw: float  # Active power from 'to_bus' side
    q_to_mvar: float  # Reactive power from 'to_bus' side
    loading_percent: float  # Line loading percentage


class PFResult(BaseModel):
    """Power flow analysis result."""
    converged: bool
    buses: List[BusResult]
    lines: List[LineResult]
    total_losses_mw: float
    total_losses_mvar: float
    execution_time_ms: float
    max_loading: float = 0.0  # Maximum loading percentage across all branches


class SEPlaceholder(BaseModel):
    """Placeholder for state estimation results."""
    message: str = "State estimation not implemented yet"
    status: str = "placeholder"


class RTCANotImplemented(BaseModel):
    """Placeholder for RTCA analysis results."""
    message: str = "RTCA analysis not implemented yet"
    status: str = "placeholder" 