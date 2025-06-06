from pydantic import BaseModel
from typing import List, Literal, Optional


class Violation(BaseModel):
    """A single contingency analysis violation."""
    type: Literal["loading", "undervolt", "overvolt", "angle"]
    element: str  # e.g. "LINE-447" or "BUS-33"
    pre_value: float
    post_value: float
    limit: float


class OutageResult(BaseModel):
    """Result of a single contingency (outage) analysis."""
    outage_id: str  # e.g. "LINE-447"
    pre_flow_mva: float
    post_flow_mva: float
    loading_pct: float
    violations: List[Violation]


class RTCABatchResult(BaseModel):
    """Batch result of N-1 contingency analysis."""
    scope: Literal["n1", "n2", "custom"]
    analysed: int
    violations_found: int
    top20: List[OutageResult]
    all: Optional[List[OutageResult]] = None  # omitted if client asks top20 only 