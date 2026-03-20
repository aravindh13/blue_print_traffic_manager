# Predictive Maintenance System

A real-time monitoring and anomaly detection system for traffic signals, CCTV cameras, and microcontrollers using ML (Isolation Forest).

## Features

- **Real-time Monitoring**: Live device metrics via WebSocket
- **ML Anomaly Detection**: Isolation Forest algorithm predicts failures
- **Interactive Dashboard**: Control & Maintenance views with maps
- **Alert System**: Instant notifications for anomalies
- **Dark Mode UI**: Modern, responsive design

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite + TailwindCSS |
| Backend | Node.js + Express + Socket.io |
| Database | MySQL + Prisma ORM |
| ML Service | Python + FastAPI + scikit-learn |

## Quick Start

### 1. Prerequisites

- Node.js 18+
- Python 3.9+
- MySQL 8.0+

### 2. Database Setup

```sql
-- Create database
CREATE DATABASE predictive_maintenance;
```

### 3. Configure Backend

Edit `backend/.env`:
```
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/predictive_maintenance"
PORT=5000
ML_SERVICE_URL=http://localhost:8000
```

### 4. Start All Services

```bash
# Backend (terminal 1)
cd backend
npm install
npm run db:push
npm run db:seed
npm run dev

# Frontend (terminal 2)
cd frontend
npm install
npm run dev

# ML Service (terminal 3)
cd ml-service
pip install -r requirements.txt
python main.py
```

### 5. Access Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **ML API Docs**: http://localhost:8000/docs

## Usage

### Starting Simulation

1. Open http://localhost:5173
2. Click "Start Simulation" button
3. Watch real-time metrics flowing
4. ML will detect anomalies and create alerts

### Resolving Alerts

1. Go to Maintenance Dashboard
2. View active alerts
3. Click "Mark Resolved" to clear alerts

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Health check |
| GET | /api/stats | Dashboard statistics |
| GET | /api/devices | List all devices |
| GET | /api/metrics/latest | Latest metrics |
| GET | /api/alerts | List alerts |
| POST | /api/simulator/start | Start simulation |
| POST | /api/simulator/stop | Stop simulation |
| POST | /api/ml/toggle | Toggle ML detection |

## ML Service

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | ML service health |
| POST | /predict | Predict anomaly |
| POST | /retrain | Retrain model |

### Input Format
```json
{
  "temperature": 45.5,
  "voltage": 225.0,
  "error_rate": 2.5,
  "uptime": 95.0
}
```

### Output Format
```json
{
  "anomaly": true,
  "anomaly_score": 0.75,
  "model_status": "Prediction complete"
}
```

## Project Structure

```
predictive_maintance/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   ├── src/
│   │   ├── routes/          # API routes
│   │   ├── services/        # ML service client
│   │   └── index.js         # Main server
│   └── .env                 # Environment config
├── frontend/
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── hooks/           # React hooks
│   │   ├── pages/           # Dashboard pages
│   │   └── services/        # API client
│   └── ...
├── ml-service/
│   └── main.py              # FastAPI ML service
└── README.md
```

## Development Phases

- [x] Phase 0: Setup
- [x] Phase 1: Database + Models
- [x] Phase 2: Real-time Device Stream
- [x] Phase 3: ML Integration
- [x] Phase 4: Alert System
- [x] Phase 5: Control Dashboard UI
- [x] Phase 6: Maintenance Dashboard UI
- [x] Phase 7: Final Polish

## Troubleshooting

### Backend won't start?
- Check MySQL is running
- Verify DATABASE_URL in .env
- Run `npm run db:push` to sync schema

### Frontend shows blank page?
- Check browser console for errors
- Ensure backend is running on port 5000
- Check Socket.io connection

### ML predictions not working?
- Ensure Python dependencies installed
- Check ML service is running on port 8000
- Visit http://localhost:8000/docs for API testing

## License

MIT
