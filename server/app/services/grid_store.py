import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any

from app.models.grid import GridMeta


class GridStore:
    """Service for storing and retrieving grid data."""
    
    def __init__(self, grids_path: Path):
        self.grids_path = Path(grids_path)
        self.grids_path.mkdir(exist_ok=True)
    
    def list_grids(self) -> List[GridMeta]:
        """List all available grids."""
        grids = []
        for grid_file in self.grids_path.glob("*.json"):
            try:
                with open(grid_file, 'r') as f:
                    grid_data = json.load(f)
                    
                # Extract metadata
                grid_id = grid_file.stem
                metadata = grid_data.get('metadata', {})
                
                # Count elements if available
                num_buses = len(grid_data.get('bus', {})) if 'bus' in grid_data else None
                num_lines = len(grid_data.get('line', {})) if 'line' in grid_data else None
                num_loads = len(grid_data.get('load', {})) if 'load' in grid_data else None
                num_generators = len(grid_data.get('gen', {})) if 'gen' in grid_data else None
                
                grid_meta = GridMeta(
                    grid_id=grid_id,
                    name=metadata.get('name'),
                    description=metadata.get('description'),
                    created_at=datetime.fromisoformat(metadata.get('created_at', datetime.now().isoformat())),
                    num_buses=num_buses,
                    num_lines=num_lines,
                    num_loads=num_loads,
                    num_generators=num_generators
                )
                grids.append(grid_meta)
            except Exception as e:
                print(f"Error reading grid file {grid_file}: {e}")
                continue
        
        return grids
    
    def load_grid(self, grid_id: str) -> Optional[Dict[str, Any]]:
        """Load a specific grid by ID."""
        grid_file = self.grids_path / f"{grid_id}.json"
        if not grid_file.exists():
            return None
        
        try:
            with open(grid_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading grid {grid_id}: {e}")
            return None
    
    def save_grid(self, net_dict: Dict[str, Any], grid_id: Optional[str] = None) -> str:
        """Save a grid to storage."""
        if grid_id is None:
            grid_id = str(uuid.uuid4())
        
        # Ensure grid_id is a string
        grid_id = str(grid_id)
        
        # Add metadata if not present
        if 'metadata' not in net_dict:
            net_dict['metadata'] = {}
        
        net_dict['metadata']['created_at'] = datetime.now().isoformat()
        
        grid_file = self.grids_path / f"{grid_id}.json"
        with open(grid_file, 'w') as f:
            json.dump(net_dict, f, indent=2)
        
        return grid_id 