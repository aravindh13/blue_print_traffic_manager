from pydantic import BaseModel
from typing import Optional


class MetricsInput(BaseModel):
    temperature: float
    voltage: float
    error_rate: float
    uptime: float


class PredictionOutput(BaseModel):
    anomaly: bool
    anomaly_score: float
