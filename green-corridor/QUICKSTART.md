# 🚑 Green Corridor AI - Phase 0 Summary

## ✅ What's Ready

### Frontend (React + Vite + Tailwind)
```
✅ React 19 with Vite bundler
✅ TailwindCSS for styling
✅ Leaflet.js for maps
✅ Socket.io client for real-time
✅ Clean Dashboard UI with:
   - Header
   - Interactive map placeholder
   - Incident report form
   - Ambulance status list
   - Active incidents display
```

### Backend (Node.js + Express)
```
✅ Express server on port 4000
✅ Socket.io for real-time WebSocket
✅ MongoDB connection ready
✅ CORS configured

ROUTES READY:
  POST   /api/incidents           → Create incident + auto-assign ambulance
  GET    /api/incidents           → List all incidents
  GET    /api/ambulances          → List ambulances
  PATCH  /api/ambulances/:id/location  → Update GPS

MODELS READY:
  📦 Ambulance      (driver, location, status)
  📦 Incident       (location, severity, status)
  📦 Hospital       (location, capacity, specialties)
  📦 TrafficSignal (location, state, locking)

SERVICES READY:
  🔹 assignment.js        → findNearestAmbulance()
  🔹 haversine.js         → Distance calculation
  🔹 signalPreemption.js  → Traffic signal control
  🔹 hospitalService.js   → Hospital recommendations
  🔹 routing.js           → Route generation
```

## 📊 Architecture at a Glance

```
┌─────────────────────────────────────────────────────────┐
│                    CONTROL CENTER                        │
│  (React Dashboard - http://localhost:5173)              │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Report Incident (lat, lng, severity)      │     │  │
│  │  View Ambulances & Status                  │     │  │
│  │  See Real-time Updates                     │     │  │
│  └──────────────────────────────────────────────────┘  │
│                        ↑                                 │
│               Socket.io (WebSocket)                      │
│                        ↓                                 │
├─────────────────────────────────────────────────────────┤
│              EXPRESS BACKEND (Port 4000)                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │  POST /incidents    → Create + Auto-Assign       │  │
│  │  GET  /ambulances   → List ambulances            │  │
│  │  PATCH /ambulance/:id/location → GPS Update      │  │
│  └──────────────────────────────────────────────────┘  │
│                        ↓                                 │
│            ┌──────────────────────┐                     │
│            │   MONGODB DATABASE   │                     │
│            │  ├─ Ambulances       │                     │
│            │  ├─ Incidents        │                     │
│            │  ├─ Hospitals        │                     │
│            │  └─ TrafficSignals   │                     │
│            └──────────────────────┘                     │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start (3 Steps)

### Step 1: Backend
```bash
cd server
npm install
cp .env.example .env
npm run dev
# Server on http://localhost:4000
```

### Step 2: Frontend
```bash
cd client
npm install
cp .env.example .env
npm run dev
# Frontend on http://localhost:5173
```

### Step 3: MongoDB (Optional, if local)
```bash
mongod
# Runs on mongodb://localhost:27017
```

## 📝 Environment Variables

### Server (.env)
```
PORT=4000
MONGO_URI=mongodb://localhost:27017/green_corridor
CLIENT_URL=http://localhost:5173
JWT_SECRET=your_secret_key_here
```

### Client (.env)
```
VITE_API_URL=http://localhost:4000
VITE_WS_URL=http://localhost:4000
```

## 🧪 Test API Endpoints (After Backend & MongoDB Running)

### Create an Incident
```bash
curl -X POST http://localhost:4000/api/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 28.7041,
    "lng": 77.1025,
    "severity": 4,
    "address": "New Delhi Central",
    "description": "Traffic accident"
  }'
```

### Get All Incidents
```bash
curl http://localhost:4000/api/incidents
```

### Get All Ambulances
```bash
curl http://localhost:4000/api/ambulances
```

### Check Server Health
```bash
curl http://localhost:4000/health
```

## 📂 File Changes Made

### Created Files:
- `client/tailwind.config.js`
- `client/postcss.config.js`
- `client/.env.example`
- `client/src/components/Dashboard.jsx` — Main dashboard UI
- `client/src/components/Map.jsx` — Leaflet map component
- `server/.env.example`
- `PHASE0_COMPLETE.md` — Detailed setup guide

### Modified Files:
- `client/package.json` — Added: Tailwind, Leaflet, Socket.io
- `client/src/App.jsx` — Socket.io setup + Dashboard import
- `client/src/index.css` — Tailwind directives

### Existing (Already in Place):
- Backend: Express, routes, models, services
- Socket.io handler
- All data models
- API endpoints

## 🔌 WebSocket Events (Socket.io)

### Server → Client Broadcasts:
```javascript
io.emit('ambulance:moved', { id, lat, lng })
io.emit('incident:assigned', { incident, ambulance })
io.emit('incident:created', incident)
io.emit('signal:changed', { id, state, lat, lng })
```

### Client → Server Events:
```javascript
socket.on('driver:location', { ambulanceId, lat, lng })
```

## 📋 Data Models

### Ambulance
```javascript
{
  _id: ObjectId,
  driverName: String,
  driverEmail: String (unique),
  driverPassword: String (bcrypted),
  vehicleNumber: String,
  status: 'available' | 'busy' | 'offline',
  lat: Number,
  lng: Number,
  assignedIncident: ObjectId (ref: Incident),
  timestamps: true
}
```

### Incident
```javascript
{
  _id: ObjectId,
  lat: Number,
  lng: Number,
  address: String,
  description: String,
  severity: 1-5,
  status: 'open' | 'assigned' | 'enroute' | 'resolved',
  assignedAmbulance: ObjectId (ref: Ambulance),
  route: [[lat, lng], ...],
  recommendedHospital: ObjectId (ref: Hospital),
  timestamps: true
}
```

### TrafficSignal
```javascript
{
  _id: ObjectId,
  lat: Number,
  lng: Number,
  name: String,
  state: 'red' | 'green' | 'yellow',
  lockedBy: ObjectId (ref: Ambulance) | null,
  lockedByPriority: Number,
  resetAt: Date | null,
  timestamps: true
}
```

### Hospital
```javascript
{
  _id: ObjectId,
  name: String,
  lat: Number,
  lng: Number,
  capacity: Number,
  specialties: [String],
  timestamps: true
}
```

## 🎯 What's Next (PHASE 1)

1. **Seed Database** — Add sample ambulances, hospitals, traffic signals
2. **Test Incident Creation** — Try POST /incidents and see auto-assignment
3. **Real-time Map** — Wire up Socket.io to show live ambulance markers
4. **Driver App** → Accept/reject requests
5. **Signal Preemption** → Turn signals green when ambulance near

## 🛠️ Troubleshooting

**Frontend won't connect to backend?**
→ Check `VITE_WS_URL` in client/.env matches backend PORT

**MongoDB connection error?**
→ Ensure mongod is running, or update `MONGO_URI` in server/.env

**Build errors with Tailwind?**
→ Delete `node_modules` & `package-lock.json`, run `npm install`

**Port already in use?**
→ Change `PORT` in server/.env or close other apps

## 📞 Support

All core infrastructure is ready.
Clean code structure. Zero technical debt.
Ready to build PHASE 1! 🚀

---
**PHASE 0 COMPLETE** ✅
**Waiting for your confirmation to proceed to PHASE 1**
