# 🔧 Predictive Maintenance AI
### *Don't wait for things to break. Know before they do.*

---

A traffic signal that goes dark at 8 AM is a crisis. An ML model that caught it at 2 AM is a win. This system streams live telemetry from every device in the network — traffic signals, CCTV cameras, microcontrollers — and uses an Isolation Forest anomaly detector to flag anything that looks like it's about to fail, before it actually does.

The dashboard shows it all in real time: device health, live metrics, active alerts, and a one-click maintenance queue to close the loop.

---

## 🗂️ What's Inside

```
predictive_maintance/
│
├── backend/                  ← Node.js + Express + Socket.io API
│   ├── prisma/
│   │   └── schema.prisma         → Database models
│   ├── src/
│   │   ├── routes/               → REST API endpoints
│   │   ├── services/             → ML client, device simulator
│   │   └── index.js              → Server entry point
│   └── .env                      → Your config lives here
│
├── frontend/                 ← React + Vite + Tailwind dashboard
│   └── src/
│       ├── components/           → Cards, charts, alert panels
│       ├── hooks/                → useSocket, useDevices
│       ├── pages/                → Control view, Maintenance view
│       └── services/             → API client
│
├── ml-service/               ← FastAPI anomaly detection service
│   └── main.py                   → Isolation Forest model
│
└── README.md
```

---

## ⚙️ Prerequisites

| Tool | Version | Why |
|------|---------|-----|
| **Node.js** | 18+ | Backend + frontend |
| **Python** | 3.9+ | ML service |
| **MySQL** | 8.0+ | Device metrics storage |

---

## 🚀 Installation

### Step 1 — Create the Database

```sql
-- In your MySQL client:
CREATE DATABASE predictive_maintenance;
```

### Step 2 — Configure the Backend

```bash
cd predictive_maintance/backend
npm install
```

Edit `backend/.env`:
```
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/predictive_maintenance"
PORT=5000
ML_SERVICE_URL=http://localhost:8000
```

Then push the schema and seed sample devices:
```bash
npm run db:push
npm run db:seed
```

### Step 3 — Set Up the ML Service

```bash
cd ../ml-service
pip install fastapi uvicorn scikit-learn numpy pandas
```

### Step 4 — Set Up the Frontend

```bash
cd ../frontend
npm install
```

---

## ▶️ Running

Open **three terminals** — one per service.

```bash
# Terminal 1 — Backend API
cd backend && npm run dev
# Runs on http://localhost:5000

# Terminal 2 — ML Anomaly Service
cd ml-service && python main.py
# Runs on http://localhost:8000

# Terminal 3 — React Dashboard
cd frontend && npm run dev
# Runs on http://localhost:5173
```

Open **http://localhost:5173**, click **"Start Simulation"**, and watch device telemetry stream in live. When a device shows unusual temperature, voltage spikes, or degraded uptime — the ML model flags it instantly and an alert appears.

---

## 📡 API Reference

### Backend (`:5000`)

| Method | Endpoint | What it does |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/devices` | List all monitored devices |
| `GET` | `/api/metrics/latest` | Latest readings from all devices |
| `GET` | `/api/alerts` | Active anomaly alerts |
| `GET` | `/api/stats` | Dashboard summary stats |
| `POST` | `/api/simulator/start` | Start the telemetry simulator |
| `POST` | `/api/simulator/stop` | Stop the simulator |
| `POST` | `/api/ml/toggle` | Enable / disable ML detection |

### ML Service (`:8000`)

| Method | Endpoint | What it does |
|--------|----------|-------------|
| `GET` | `/health` | ML service health |
| `POST` | `/predict` | Run anomaly detection on a reading |
| `POST` | `/retrain` | Retrain the model on new data |
| `GET` | `/docs` | Interactive API explorer |

### Anomaly Detection in Action

Send a suspicious device reading:

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"temperature": 72.5, "voltage": 210.0, "error_rate": 8.5, "uptime": 62.0}'
```

Response:
```json
{
  "anomaly": true,
  "anomaly_score": 0.82,
  "model_status": "Prediction complete"
}
```

A score above `0.5` means something's wrong. Above `0.75` means go fix it now.

---

## 🔌 WebSocket Events (Socket.io)

The dashboard connects to the backend via Socket.io for live updates — no polling, no refreshing.

```javascript
// Server → Client (broadcasts automatically)
io.emit('device:metrics',   { deviceId, temperature, voltage, uptime })
io.emit('alert:created',    { device, score, timestamp })
io.emit('alert:resolved',   { alertId })

// Client → Server
socket.on('driver:location', { ambulanceId, lat, lng })
```

---

## 📋 Resolving Alerts

1. Open **http://localhost:5173**
2. Click **"Maintenance Dashboard"** tab
3. Review the list of flagged devices — each shows the anomaly score and affected metrics
4. Click **"Mark Resolved"** once the physical issue is fixed
5. The alert clears from the active queue and is logged to history

---

## 🛠️ Troubleshooting

**Backend won't start?**
→ Check MySQL is running and `DATABASE_URL` in `.env` is correct.
→ Run `npm run db:push` to sync the schema if it's a fresh database.

**Frontend shows blank page?**
→ Open browser DevTools → Console. Look for a Socket.io connection error.
→ Confirm the backend is running on port `5000`.

**ML predictions not coming through?**
→ Make sure `python main.py` is running in `ml-service/`.
→ Visit **http://localhost:8000/docs** and test `/predict` directly.

**"Table doesn't exist" errors?**
→ Run `npm run db:push` from the `backend/` folder. Prisma will create the tables.

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express + Socket.io |
| Database | MySQL + Prisma ORM |
| ML Service | Python + FastAPI + scikit-learn |
| Algorithm | Isolation Forest (unsupervised anomaly detection) |

---

*The best maintenance call is the one that never becomes an emergency.*
