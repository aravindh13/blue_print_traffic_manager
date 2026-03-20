import 'dotenv/config';
import axios from 'axios';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export async function checkAnomaly(metrics) {
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/predict`, {
      temperature: metrics.temperature,
      voltage: metrics.voltage,
      error_rate: metrics.errorRate,
      uptime: metrics.uptime
    });
    return response.data;
  } catch (error) {
    console.error('ML Service error:', error.message);
    return { anomaly: false, anomaly_score: 0, model_status: 'error' };
  }
}

export async function getMLHealth() {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/health`);
    return response.data;
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

export async function retrainModel() {
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/retrain`);
    return response.data;
  } catch (error) {
    console.error('ML retrain error:', error.message);
    return { status: 'error', error: error.message };
  }
}
