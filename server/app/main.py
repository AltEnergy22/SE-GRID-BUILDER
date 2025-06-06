from fastapi import FastAPI

from app.api.routers import grids, sim, calib
from app.services import calib_store

app = FastAPI(title="Altichain Grid Sim Engine", version="0.1.0")


@app.on_event("startup")
async def startup_event():
    """Initialize the database on startup."""
    await calib_store.init()


@app.get("/health")
async def health():
    return {"status": "ok"}


app.include_router(grids.router, prefix="/grids")
app.include_router(sim.router, prefix="/sim")
app.include_router(calib.router) 