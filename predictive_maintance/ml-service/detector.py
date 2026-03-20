import numpy as np
from sklearn.ensemble import IsolationForest
import joblib
import os


class AnomalyDetector:
    def __init__(self):
        self.model = IsolationForest(contamination=0.05, random_state=42)
        self.trained = False

    def generate_training_data(self, n_samples=1000):
        np.random.seed(42)

        normal_data = np.array(
            [
                np.random.normal(45, 10, n_samples),
                np.random.normal(220, 15, n_samples),
                np.random.normal(0.5, 0.3, n_samples),
                np.random.normal(99, 1, n_samples),
            ]
        ).T

        self.model.fit(normal_data)
        self.trained = True

        model_path = os.path.join(os.path.dirname(__file__), "model.pkl")
        joblib.dump(self.model, model_path)

        return "Model trained on normal data"

    def predict(
        self, temperature: float, voltage: float, error_rate: float, uptime: float
    ):
        if not self.trained:
            self.generate_training_data()

        features = np.array([[temperature, voltage, error_rate, uptime]])

        prediction = self.model.predict(features)[0]
        score = self.model.score_samples(features)[0]

        anomaly_score = float(np.clip(-score * 10, 0, 10))

        return {
            "anomaly": bool(prediction == -1),
            "anomaly_score": round(anomaly_score, 3),
        }


detector = AnomalyDetector()
