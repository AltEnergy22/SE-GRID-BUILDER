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


@app.get("/realtime")
async def get_realtime_data():
    """Get simulated real-time grid data for dashboard."""
    import random
    import time
    
    # Simulate real-time grid data
    current_time = int(time.time())
    base_time = current_time - 300  # 5 minutes of history
    
    # Generate historical data points
    history_length = 60
    freq_history = []
    ace_history = []
    load_history = []
    renewable_history = []
    
    for i in range(history_length):
        timestamp = base_time + (i * 5)  # 5-second intervals
        freq_history.append({
            "timestamp": timestamp * 1000,  # Convert to milliseconds
            "value": 50.0 + random.uniform(-0.02, 0.02)
        })
        ace_history.append({
            "timestamp": timestamp * 1000,
            "value": random.uniform(-15, 15)
        })
        load_history.append({
            "timestamp": timestamp * 1000,
            "value": 1200 + random.uniform(-50, 50)
        })
        renewable_history.append({
            "timestamp": timestamp * 1000,
            "value": random.uniform(15, 35)
        })
    
    # Generate bus voltage data
    bus_voltages = {}
    for bus_id in range(1, 11):  # 10 buses
        voltage = random.uniform(0.95, 1.05)
        angle = random.uniform(-10, 10)
        delta_v = random.uniform(-0.02, 0.02)
        bus_voltages[f"Bus_{bus_id}"] = {
            "voltage": voltage,
            "angle": angle,
            "delta_v": delta_v
        }
    
    # Generate recent events
    recent_events = [
        {
            "id": f"evt_{current_time}_{i}",
            "timestamp": current_time - (i * 30) * 1000,  # milliseconds
            "type": random.choice(["alarm", "event", "warning"]),
            "severity": random.choice(["low", "medium", "high"]),
            "message": f"Simulated event {i+1}",
            "source": f"Bus_{random.randint(1, 10)}"
        }
        for i in range(5)
    ]
    
    return {
        "frequency": 50.0 + random.uniform(-0.01, 0.01),
        "ace": random.uniform(-10, 10),
        "total_load": 1200 + random.uniform(-30, 30),
        "renewable_pct": random.uniform(20, 30),
        "violations": random.randint(0, 3),
        "active_alarms": random.randint(0, 2),
        "se_convergence": random.choice([True, True, True, False]),  # 75% chance of convergence
        "rtca_jobs": random.randint(0, 1),
        "bus_voltages": bus_voltages,
        "freq_history": freq_history,
        "ace_history": ace_history,
        "load_history": load_history,
        "renewable_history": renewable_history,
        "recent_events": recent_events
    }


@app.get("/realtime/topology")
async def get_realtime_topology(grid: str = "alberta-test"):
    """Get real-time topology data for voltage and loading updates."""
    import random
    import time
    
    # Generate simulated live voltage data for buses
    vm_pu_by_bus = {}
    for bus_id in range(1, 51):  # 50 buses
        # Simulate voltage variations around 1.0 p.u.
        base_voltage = 1.0
        variation = random.uniform(-0.08, 0.08)  # ±8% variation
        vm_pu_by_bus[f"BUS-{bus_id}"] = base_voltage + variation
    
    # Generate simulated loading data for branches
    loading_by_branch = {}
    for branch_id in range(1, 76):  # 75 branches
        # Simulate loading percentages
        loading_by_branch[f"LINE-{branch_id}"] = random.uniform(10, 95)
    
    return {
        "vm_pu_by_bus": vm_pu_by_bus,
        "loading_by_branch": loading_by_branch,
        "timestamp": time.time()
    }


app.include_router(grids.router, prefix="/grids")
app.include_router(sim.router, prefix="/sim")
app.include_router(calib.router) 