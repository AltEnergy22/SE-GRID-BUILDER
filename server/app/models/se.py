from pydantic import BaseModel, Field
from typing import List, Literal


class SEInputMeas(BaseModel):
    """Input measurement for state estimation."""
    element_type: Literal["bus", "line", "trafo"]
    element_id: int
    meas_type: Literal["v", "p", "q"]
    value: float
    std_dev: float = Field(..., gt=0, description="Standard deviation must be positive")


class SEResidual(BaseModel):
    """State estimation residual for a measurement."""
    element_type: str
    element_id: int
    meas_type: str
    residual: float
    std_dev: float


class SEResult(BaseModel):
    """Weighted Least Squares state estimation result."""
    converged: bool
    iterations: int
    elapsed_ms: float
    bus_vm_pu: List[float]
    bus_va_degree: List[float]
    residuals: List[SEResidual] 