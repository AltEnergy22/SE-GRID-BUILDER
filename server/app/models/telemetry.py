from pydantic import BaseModel, Field
from typing import Literal, Optional


class TelemetryFrame(BaseModel):
    """A single telemetry measurement frame."""
    ts: float  # unix epoch-seconds with ms precision
    stream: Literal["SCADA", "PMU"]
    element_type: Literal["bus", "line", "trafo"]
    element_id: int
    meas_type: Literal["v", "p", "q", "f", "angle"]
    true_value: float  # The actual/true value before corruption
    value: float  # The measured value (with noise/errors)
    std_dev: float  # Standard deviation of the measurement
    is_bad: bool = False  # Whether this is a gross error/bad data


class StreamConfig(BaseModel):
    """Configuration for telemetry stream parameters."""
    scada_period: float = Field(default=2.0, gt=0, description="SCADA measurement period in seconds")
    pmu_hz: int = Field(default=60, ge=10, le=120, description="PMU sampling frequency in Hz")
    noise_pct: float = Field(default=0.01, ge=0, le=1.0, description="Gaussian noise percentage")
    bad_rate: float = Field(default=0.005, ge=0, le=0.2, description="Gross error injection rate")
    drift_per_min: float = Field(default=0.0002, ge=0, description="Calibration drift per minute")


class StreamStats(BaseModel):
    """Statistics about the telemetry stream."""
    frames_sent: int = 0
    scada_frames: int = 0
    pmu_frames: int = 0
    bad_data_count: int = 0
    stream_duration_sec: float = 0.0
    avg_noise_level: float = 0.0 