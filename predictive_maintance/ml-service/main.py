from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
from sklearn.ensemble import IsolationForest
import joblib
import os

app = FastAPI(title="Predictive Maintenance ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = "isolation_forest_model.pkl"


class MetricsInput(BaseModel):
    temperature: float
    voltage: float
    error_rate: float
    uptime: float


class PredictionResult(BaseModel):
    anomaly: bool
    anomaly_score: float
    model_status: str


model = None


def create_and_train_model():
    print("Training Isolation Forest model...")
    X = np.random.randn(1000, 4)
    X[:, 0] = 30 + np.random.randn(1000) * 15  # temperature
    X[:, 1] = 220 + np.random.randn(1000) * 15  # voltage
    X[:, 2] = np.random.exponential(2, 1000)  # error_rate
    X[:, 3] = 90 + np.random.randn(1000) * 10  # uptime

    model = IsolationForest(contamination=0.05, random_state=42, n_estimators=100)
    model.fit(X)
    print("Model trained successfully")
    return model


def load_or_create_model():
    global model
    if os.path.exists(MODEL_PATH):
        print(f"Loading model from {MODEL_PATH}")
        model = joblib.load(MODEL_PATH)
    else:
        model = create_and_train_model()
        joblib.dump(model, MODEL_PATH)
        print(f"Model saved to {MODEL_PATH}")


@app.on_event("startup")
async def startup_event():
    load_or_create_model()


@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": model is not None}


@app.post("/predict", response_model=PredictionResult)
async def predict(metrics: MetricsInput):
    if model is None:
        return PredictionResult(
            anomaly=False, anomaly_score=0.0, model_status="Model not loaded"
        )

    features = np.array(
        [[metrics.temperature, metrics.voltage, metrics.error_rate, metrics.uptime]]
    )

    prediction = model.predict(features)[0]
    scores = model.decision_function(features)[0]

    normalized_score = (scores + 0.5) / 1.5
    normalized_score = max(0, min(1, normalized_score))

    anomaly_score = float(1 - normalized_score)
    is_anomaly = bool(prediction == -1)

    return PredictionResult(
        anomaly=is_anomaly,
        anomaly_score=round(anomaly_score, 4),
        model_status="Prediction complete",
    )


@app.post("/retrain")
async def retrain():
    global model
    model = create_and_train_model()
    joblib.dump(model, MODEL_PATH)
    return {"status": "Model retrained and saved"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
