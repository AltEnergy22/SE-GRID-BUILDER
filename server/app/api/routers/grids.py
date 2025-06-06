from typing import List
from fastapi import APIRouter, HTTPException, Depends
from app.api.deps import get_settings
from app.models.grid import GridMeta
from app.services.grid_store import GridStore
from app.core.config import Settings

router = APIRouter()


@router.get("/", response_model=List[GridMeta])
async def list_grids(settings: Settings = Depends(get_settings)):
    """List all available grids."""
    grid_store = GridStore(settings.grids_path)
    return grid_store.list_grids()


@router.get("/{grid_id}")
async def get_grid(grid_id: str, settings: Settings = Depends(get_settings)):
    """Get a specific grid by ID."""
    grid_store = GridStore(settings.grids_path)
    net_dict = grid_store.load_grid(grid_id)
    if net_dict is None:
        raise HTTPException(status_code=404, detail="Grid not found")
    return net_dict


@router.post("/")
async def save_grid(net_dict: dict, settings: Settings = Depends(get_settings)):
    """Save a new grid."""
    grid_store = GridStore(settings.grids_path)
    grid_id = grid_store.save_grid(net_dict)
    return {"grid_id": grid_id, "message": "Grid saved successfully"} 