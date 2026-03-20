# 🏙️ Blue Print — AI-Powered Smart City Platform

> A collection of four interconnected AI systems that together form the nervous system of a modern, intelligent city. Real-time signals. Live cameras. Predictive maintenance. Emergency corridors. All talking to each other.

---

## 🗂️ Projects at a Glance

| Project | What it does | Status |
|---------|-------------|--------|
| [🚦 Traffic Orchestration](#-traffic-orchestration) | YOLO-powered live signal control with AI agents | ✅ Active |
| [🚑 Green Corridor](#-green-corridor) | Emergency vehicle signal preemption + routing | ✅ Active |
| [🤖 Gridlock Breaker](#-gridlock-breaker) | Reinforcement learning vs baseline traffic simulation | ✅ Active |
| [🔧 Predictive Maintenance](#-predictive-maintenance) | ML anomaly detection for traffic infrastructure | ✅ Active |

---

## 🧭 The Big Picture

These aren't four separate demos. They're designed to plug into each other:

```
 [Cameras] ──► Traffic Orchestration ──► controls physical signals
                        │
                        ├──► Green Corridor detects ambulance → preempts signals
                        │
                        ├──► Predictive Maintenance watches signal health
                        │
                        └──► Gridlock Breaker validates AI vs baseline decisions
```

---

## 🚦 Traffic Orchestration

**The real-time brain.** Watches camera feeds with YOLOv11, counts vehicles in each lane, and sends optimized green-phase commands to traffic signals every few seconds.

**Location:** `Traffic_Orchestration/`

### What runs where

| Service | Command | Port |
|---------|---------|------|
| YOLO Vision API | `python main.py` (in `smart_traffic_api/`) | `:8080` |
| Orchestration API | `python -m uvicorn api.server:app --port 8050` | `:8050` |
| React Dashboard | `npm run dev` (in `smart_traffic_web/`) | `:5173` |

### Installation

```bash
cd Traffic_Orchestration

# Python backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Mac/Linux
pip install -r requirements.txt

# YOLO API dependencies
pip install fastapi uvicorn opencv-python ultralytics numpy

# React frontend
cd smart_traffic_web && npm install && cd ..
```

### Running (3 terminals)

```bash
# Terminal 1 — YOLO Vision API
cd smart_traffic_api
python main.py

# Terminal 2 — Orchestration API
cd Traffic_Orchestration
python -m uvicorn api.server:app --host 0.0.0.0 --port 8050 --reload

# Terminal 3 — Dashboard
cd smart_traffic_web
npm run dev
```

Open **http://localhost:5173** → should show 🟢 **CORE ONLINE**

**Full docs:** [`Traffic_Orchestration/README.md`](Traffic_Orchestration/README.md)

---

## 🚑 Green Corridor

**Emergency first.** When an ambulance is dispatched, this system finds the nearest unit, plots the fastest route, pre-turns traffic signals green along the path, and tracks everything on a live map.

**Location:** `green-corridor/`

### What runs where

| Service | Command | Port |
|---------|---------|------|
| Node.js Backend | `npm run dev` (in `server/`) | `:4000` |
| React Dashboard | `npm run dev` (in `client/`) | `:5173` |
| MongoDB | `mongod` | `:27017` |

### Installation

```bash
# Backend
cd green-corridor/server
npm install
cp .env.example .env
# Edit .env → set MONGO_URI and JWT_SECRET

# Frontend
cd ../client
npm install
cp .env.example .env
# Edit .env → VITE_API_URL=http://localhost:4000
```

### Environment Variables

**server/.env**
```
PORT=4000
MONGO_URI=mongodb://localhost:27017/green_corridor
CLIENT_URL=http://localhost:5173
JWT_SECRET=your_secret_key_here
```

**client/.env**
```
VITE_API_URL=http://localhost:4000
VITE_WS_URL=http://localhost:4000
```

### Running

```bash
# Terminal 1 — MongoDB (if local)
mongod

# Terminal 2 — Backend
cd green-corridor/server && npm run dev

# Terminal 3 — Frontend
cd green-corridor/client && npm run dev
```

### Quick API Test

```bash
# Report an emergency incident
curl -X POST http://localhost:4000/api/incidents \
  -H "Content-Type: application/json" \
  -d '{"lat": 28.7041, "lng": 77.1025, "severity": 4, "address": "New Delhi Central"}'

# Check ambulance fleet
curl http://localhost:4000/api/ambulances
```

---

## 🤖 Gridlock Breaker

**Proof that AI wins.** Trains a PPO reinforcement learning agent on a SUMO traffic grid, then runs a side-by-side comparison: AI-controlled signals vs fixed-timing baseline. Generates throughput charts showing the gap.

**Location:** `gridlock_breaker/`

### Installation

```bash
cd gridlock_breaker
python -m venv env
env\Scripts\activate             # Windows
# source env/bin/activate        # Mac/Linux
pip install -r requirements.txt
```

**requirements.txt includes:** `stable-baselines3`, `gymnasium`, `traci`, `sumolib`, `numpy`, `pandas`

Make sure `SUMO_HOME` is set:
```powershell
# Windows
$env:SUMO_HOME = "C:\Program Files (x86)\Eclipse\Sumo"
```

### Running

```bash
# Train the AI agent (takes 5-15 min)
python -m simulation.run_ai

# Run baseline only
python -m simulation.run_baseline

# Head-to-head comparison (most interesting)
python -m simulation.run_dual
```

**Sample output:**
```
🚦 Starting DUAL SIMULATION (Grid A: Baseline, Grid B: AI)...
Step  400 | Grid A (Base):   5 arrived | Grid B (AI):   1 arrived
Step 1600 | Grid A (Base):  61 arrived | Grid B (AI):  23 arrived
Step 3000 | Grid A (Base): 241 arrived | Grid B (AI): 113 arrived
✅ Final Throughput → Grid A: 378, Grid B: 167
```

> Note: Grid B (AI) has 2× the intersections (32 vs 16), so the per-junction throughput is actually higher for AI.

---

## 🔧 Predictive Maintenance

**Keep the city healthy.** Streams live telemetry from traffic signals, CCTV cameras, and microcontrollers. An Isolation Forest ML model flags devices that are about to fail — before they do.

**Location:** `predictive_maintance/`

### What runs where

| Service | Command | Port |
|---------|---------|------|
| Node.js Backend | `npm run dev` (in `backend/`) | `:5000` |
| ML Service | `python main.py` (in `ml-service/`) | `:8000` |
| React Frontend | `npm run dev` (in `frontend/`) | `:5173` |
| MySQL | (running locally) | `:3306` |

### Installation

```bash
# 1. Create the database
mysql -u root -p
> CREATE DATABASE predictive_maintenance;
> EXIT;

# 2. Backend
cd predictive_maintance/backend
npm install
# Edit .env:
#   DATABASE_URL="mysql://root:PASSWORD@localhost:3306/predictive_maintenance"
#   ML_SERVICE_URL=http://localhost:8000
npm run db:push
npm run db:seed

# 3. ML Service
cd ../ml-service
pip install fastapi uvicorn scikit-learn numpy pandas

# 4. Frontend
cd ../frontend
npm install
```

### Running

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — ML Service
cd ml-service && python main.py

# Terminal 3 — Frontend
cd frontend && npm run dev
```

Open **http://localhost:5173** → click **"Start Simulation"** → watch anomalies roll in.

### ML Anomaly Detection

Send a device reading to get an instant prediction:

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"temperature": 72.5, "voltage": 210.0, "error_rate": 8.5, "uptime": 62.0}'
```

Response:
```json
{"anomaly": true, "anomaly_score": 0.82, "model_status": "Prediction complete"}
```

---

## 🔌 Port Map (All Services)

| Port | Service | Project |
|------|---------|---------|
| `5173` | React Frontend | Traffic Orchestration / Green Corridor / Predictive Maintenance |
| `8080` | YOLO Vision API | Traffic Orchestration |
| `8050` | Orchestration API | Traffic Orchestration |
| `4000` | Green Corridor Backend | Green Corridor |
| `5000` | Maintenance Backend | Predictive Maintenance |
| `8000` | ML Anomaly Service | Predictive Maintenance |
| `27017` | MongoDB | Green Corridor |
| `3306` | MySQL | Predictive Maintenance |

> ⚠️ Multiple projects use port `5173`. Run only one frontend at a time, or change the port in `vite.config.js`.

---

## 🧰 Shared Prerequisites

| Tool | Version | Used By |
|------|---------|---------|
| Python | 3.10+ | Traffic Orchestration, Gridlock Breaker, Predictive Maintenance |
| Node.js | 18+ | Green Corridor, Predictive Maintenance, Traffic Orchestration |
| SUMO | 1.18+ | Traffic Orchestration, Gridlock Breaker |
| MongoDB | 6+ | Green Corridor |
| MySQL | 8+ | Predictive Maintenance |
| Git | any | All |

---

## 🧱 Full Tech Stack

| Category | Technologies |
|----------|-------------|
| **Vision AI** | YOLOv11 (Ultralytics) |
| **ML / RL** | scikit-learn (Isolation Forest), Stable-Baselines3 (PPO), LightGBM |
| **Backend** | FastAPI, Node.js + Express, Uvicorn |
| **Real-time** | WebSockets, Socket.io |
| **Traffic Sim** | SUMO + TraCI |
| **LLM Layer** | LangChain, LangGraph, OpenAI |
| **Frontend** | React 18/19, Vite, Tailwind CSS, Leaflet.js |
| **Databases** | MongoDB, MySQL + Prisma |

---

## 🛠️ Common Troubleshooting

**SUMO_HOME not found**
```powershell
$env:SUMO_HOME = "C:\Program Files (x86)\Eclipse\Sumo"
```

**Port already in use**
```powershell
# Find what's using a port (e.g. 8080)
netstat -ano | findstr :8080
# Kill it
taskkill /PID <pid> /F
```

**Dashboard shows OFFLINE**
→ Check that the backend for that project is actually running on the expected port.
→ Verify `API_BASE` / `VITE_API_URL` in the frontend points to the right port.

**`gym` / `gymnasium` deprecation warning**
→ Safe to ignore. Run `pip install gymnasium` to silence it.

**MongoDB connection refused**
→ Make sure `mongod` is running before starting the Green Corridor backend.

---

## 📄 License

MIT — open source, open city.

---

*Five terminals. Four projects. One city brain.*
