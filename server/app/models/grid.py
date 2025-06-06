from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class GridMeta(BaseModel):
    """Metadata for a grid."""
    grid_id: str
    name: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime
    num_buses: Optional[int] = None
    num_lines: Optional[int] = None
    num_loads: Optional[int] = None
    num_generators: Optional[int] = None 