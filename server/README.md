# Altichain Grid Simulation Engine

Python backend for hosting numerical engines (Power Flow, State Estimation, RTCA, SCADA/PMU streaming).

## Features

- **Power Flow Analysis**: Using pandapower for AC power flow calculations
- **Grid Management**: Store and retrieve grid models via REST API
- **State Estimation**: Weighted Least Squares (WLS) state estimator with measurement validation
- **RTCA Analysis**: N-1 contingency analysis with violation detection
- **SCADA/PMU Streaming**: Real-time telemetry with configurable noise and bad data
- **Bad Data Detection**: Chi-square and Largest Normalized Residual (LNR) tests for measurement validation
- **Sensor Calibration**: Persistent bias and scale factor corrections with SQLite storage

## Requirements

- Python ≥3.11
- Poetry for dependency management

## Setup

1. **Install Poetry** (if not already installed):
   ```bash
   curl -sSL https://install.python-poetry.org | python3 -
   ```

2. **Install dependencies**:
   ```bash
   cd server
   poetry install
   ```

3. **Set up pre-commit hooks**:
   ```bash
   poetry run pre-commit install
   ```

## Development

### Run the server
```bash
poetry run sim-dev
```
Server will be available at `http://localhost:8001`

### Run tests
```bash
poetry run pytest
```

### Code formatting
```bash
poetry run black .
poetry run isort .
```

## API Endpoints

### Health Check
- `GET /health` - Returns server status

### Grid Management
- `GET /grids` - List all saved grids
- `GET /grids/{grid_id}` - Get specific grid data
- `POST /grids` - Save new grid

### Simulation
- `POST /sim/{grid_id}/snapshot` - Run power flow analysis
- `POST /sim/{grid_id}/state-estimator` - Run WLS state estimation
- `POST /sim/{grid_id}/rtca` - Run N-1 contingency analysis
- `GET /sim/{grid_id}/telemetry/stream` - Stream real-time SCADA/PMU data (SSE)

### Calibration & Bad Data Detection
- `GET /calibration/{grid_id}/suspects` - Detect suspect measurements using Chi-square and LNR tests
- `GET /calibration/{grid_id}/quality` - Get comprehensive measurement quality analysis
- `POST /calibration/apply` - Apply calibration factors to a specific sensor
- `POST /calibration/clear` - Clear calibration factors for a specific sensor
- `GET /calibration/list` - List all active calibration factors
- `DELETE /calibration/clear-all` - Clear all calibration factors

### State Estimator Examples

**Run with auto-generated measurements:**
```bash
curl -X POST http://localhost:8001/sim/alberta-test/state-estimator
```

**Run with custom measurements:**
```bash
curl -X POST http://localhost:8001/sim/alberta-test/state-estimator \
  -H "Content-Type: application/json" \
  -d '[
    {
      "element_type": "bus",
      "element_id": 0,
      "meas_type": "v",
      "value": 1.02,
      "std_dev": 0.01
    },
    {
      "element_type": "line", 
      "element_id": 0,
      "meas_type": "p",
      "value": 50.0,
      "std_dev": 0.5
    }
  ]'
```

### RTCA (Real-Time Contingency Analysis) Examples

**Run N-1 analysis returning top 20 critical outages:**
```bash
curl -X POST "http://localhost:8001/sim/northern-alberta/rtca"
```

**Run N-1 analysis returning all results:**
```bash
curl -X POST "http://localhost:8001/sim/northern-alberta/rtca?top20_only=false"
```

**Stream RTCA progress in real-time:**
```bash
# Start stream
curl -N http://localhost:8001/sim/northern-alberta/rtca/stream

# Check status later  
curl http://localhost:8001/sim/rtca/jobs/<job_id>
```

**Front-end JavaScript connection:**
```javascript
const es = new EventSource(`/sim/${gridId}/rtca/stream`);
es.addEventListener("progress", ev => {
  const data = JSON.parse(ev.data);
  console.log(`Progress: ${data.done}/${data.total} - ${data.last_outage}`);
});
es.addEventListener("done", ev => {
  const {job} = JSON.parse(ev.data);
  fetch(`/sim/rtca/jobs/${job}`).then(r => r.json()).then(results => {
    console.log("RTCA complete:", results);
  });
});
```

RTCA performs N-1 contingency analysis by simulating the outage of each line and transformer individually. It identifies:
- **Loading violations**: Branch loading exceeding 100%
- **Voltage violations**: Bus voltages outside 0.95-1.05 p.u. range
- **Angle violations**: Voltage angle differences exceeding 30°

Results are ranked by severity (maximum loading percentage) with detailed violation information.

### Telemetry Streaming (SCADA & PMU)

**Stream real-time telemetry data with configurable parameters:**
```bash
# Stream telemetry data with default parameters
curl -N "http://localhost:8001/sim/northern-alberta/telemetry/stream"

# Stream with custom parameters
curl -N "http://localhost:8001/sim/northern-alberta/telemetry/stream?pmu_hz=30&scada_period=5&noise_pct=0.02&bad_rate=0.01&drift_per_min=0.001"
```

**Front-end JavaScript connection:**
```javascript
const es = new EventSource(
  `/sim/${gridId}/telemetry/stream?noise_pct=0.02&bad_rate=0.01`
);
es.addEventListener("telemetry", (ev) => {
  const frame = JSON.parse(ev.data);
  updateTelemetryStore(frame);
});
```

The telemetry stream provides:
- **PMU data**: High-rate voltage magnitude, angle, and frequency measurements (10-120 Hz)
- **SCADA data**: Slower power flow measurements (configurable period)
- **Noise injection**: Configurable Gaussian noise percentage
- **Bad data simulation**: Gross error injection with configurable rate
- **Calibration drift**: Gradual measurement drift over time

### Bad Data Detection & Calibration Examples

**Detect suspect measurements:**
```bash
# Run bad data detection with default 95% confidence threshold
curl "http://localhost:8001/calibration/northern-alberta/suspects"

# Run with custom confidence threshold
curl "http://localhost:8001/calibration/northern-alberta/suspects?thresh=0.99"
```

**Apply calibration to a suspect sensor:**
```bash
curl -X POST "http://localhost:8001/calibration/apply" \
  -H "Content-Type: application/json" \
  -d '{
    "stream": "SCADA",
    "element_type": "line",
    "element_id": 5,
    "meas_type": "p",
    "bias": -2.5,
    "scale": 1.05
  }'
```

**List all active calibrations:**
```bash
curl "http://localhost:8001/calibration/list"
```

**Get measurement quality analysis:**
```bash
curl "http://localhost:8001/calibration/northern-alberta/quality"
```

The calibration system provides:
- **Chi-square test**: Statistical validation of overall measurement consistency
- **LNR analysis**: Identification of individual suspect measurements (>3σ residuals)
- **Automatic calibration suggestions**: Bias and scale factors based on residual analysis
- **Persistent storage**: SQLite database for calibration factors
- **Real-time application**: Calibrations automatically applied to telemetry streams

## Project Structure

```
server/
├── app/
│   ├── api/
│   │   ├── routers/
│   │   │   ├── grids.py     # Grid CRUD operations
│   │   │   └── sim.py       # Simulation endpoints
│   │   └── deps.py          # Common dependencies
│   ├── core/
│   │   └── config.py        # Application settings
│   ├── models/              # Pydantic schemas
│   ├── services/            # Business logic
│   └── main.py              # FastAPI app
├── tests/                   # Test suite
├── grids/                   # Grid storage directory
└── pyproject.toml          # Poetry configuration
```

## Development Status

- ✅ Power Flow Analysis (pandapower integration)
- ✅ Grid storage and management
- ✅ Health check endpoint
- ✅ **State Estimation (WLS with measurement validation)**
- ✅ **RTCA Analysis (N-1 contingency with violation detection)**
- ✅ **SCADA/PMU Streaming (SSE with noise injection and bad data simulation)**
- ✅ **Bad Data Detection (Chi-square & LNR tests with suspect identification)**
- ✅ **Sensor Calibration (Persistent bias/scale factors with real-time application)** 