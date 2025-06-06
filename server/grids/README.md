# Grid Storage Directory

This directory contains saved grid models in JSON format.

## File Structure
- Each grid is stored as a separate JSON file
- Filename format: `{grid_id}.json`
- Files contain pandapower network dictionaries with metadata

## Metadata Format
Each grid file includes a `metadata` section with:
- `name`: Optional human-readable name
- `description`: Optional description
- `created_at`: ISO timestamp of creation
- Grid statistics (buses, lines, loads, generators) are computed dynamically

## Usage
Grids are managed through the REST API:
- `GET /grids` - List all grids
- `GET /grids/{grid_id}` - Get specific grid
- `POST /grids` - Save new grid

The grid data follows pandapower's JSON serialization format. 