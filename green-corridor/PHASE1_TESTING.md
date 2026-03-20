# 🚑 PHASE 1 - Incident & Ambulance System

## ✅ What's Implemented

### Backend APIs
```
POST   /api/incidents                    Create incident + auto-assign ambulance
GET    /api/incidents                    List all incidents
PATCH  /api/incidents/:id/resolve        Resolve incident + recommend hospital
GET    /api/ambulances                   List all ambulances
PATCH  /api/ambulances/:id/location      Update ambulance GPS (driver sends)
PATCH  /api/ambulances/:id/status        Change ambulance status
POST   /api/ambulances/:id/accept        Driver accepts incident
POST   /api/ambulances/:id/reject        Driver rejects incident
```

### Database Models
- ✅ Ambulance (5 in seed data)
- ✅ Incident (auto-populated on creation)
- ✅ Hospital (8 in seed data)
- ✅ TrafficSignal (20 in seed data)

### Services
- ✅ **assignment.js** — Finds nearest available ambulance using Haversine
- ✅ **hospitalService.js** — Recommends nearest hospital on incident resolve
- ✅ **routing.js** — Gets OSRM routes (or fallback straight-line)
- ✅ **haversine.js** — Distance calculation

### Frontend (NEW)
- ✅ **Control Center Dashboard** — Report incidents, monitor ambulances & incidents
- ✅ **Driver App** — Accept/reject requests, see assigned incident
- ✅ View toggle button to switch between apps
- ✅ Real-time data fetch (every 5 seconds)

### Key Business Logic
1. **Incident Creation** → Automatically finds & assigns nearest available ambulance
2. **Auto-Assignment** → Uses Haversine distance formula
3. **Driver Accept/Reject** → Ambulance can accept or reject assignment
4. **Incident Resolve** → On resolve, recommends nearest hospital
5. **Real-time Updates** → Socket.io broadcasts changes to all clients

---

## 🚀 Quick Start (3 Commands)

### Terminal 1: Setup Backend
```bash
cd server
npm install  # Skip if already done
cp .env.example .env  # Already done? Skip this
npm run seed  # ← MUST RUN ONCE to populate database
npm run dev
```

### Terminal 2: Setup Frontend
```bash
cd client
npm install  # Skip if already done
npm run dev
```

### Terminal 3: Optional - Check MongoDB
```bash
mongod  # If running locally
```

---

## 📝 Full Testing Workflow

### Step 1: Seed the Database (MUST DO ONCE)
```bash
cd server
npm run seed
```

**Output:**
```
✅ Connected to MongoDB
🧹 Cleared existing data
✅ Seeded 5 ambulances (password: password123)
✅ Seeded 8 hospitals
✅ Seeded 20 traffic signals
🎉 Seed complete!
Login credentials: email as listed, password: password123
```

**Seeded Ambulances:**
- KA-01-A-1001 - Arjun Sharma (arjun@gc.com)
- KA-01-A-1002 - Priya Nair (priya@gc.com)
- KA-01-A-1003 - Ravi Kumar (ravi@gc.com)
- KA-01-A-1004 - Deepa Menon (deepa@gc.com)
- KA-01-A-1005 - Suresh Pillai (suresh@gc.com)

---

### Step 2: Test Control Center (http://localhost:5173)

**View 1: Control Center Dashboard**

1. **Report an Incident:**
   - Fill in Latitude: `12.9753`
   - Fill in Longitude: `77.6069`
   - Set Severity: `4`
   - Click "Report Incident"
   - ✅ Should show ambulance assigned immediately

2. **Check Ambulances Panel:**
   - Should show 5 ambulances with status
   - After incident, one should turn "busy"

3. **Check Incidents Panel:**
   - Should show created incident
   - Status: "assigned"
   - Assigned ambulance displayed

---

### Step 3: Test Driver App

**View 2: Driver App (Switch Button)**

1. **Select an Ambulance:**
   - Choose the ambulance that got assigned
   - See its status, location, vehicle number

2. **See Incident Request:**
   - Should display the incident details
   - Severity, location, description

3. **Test Accept:**
   - Click ✅ **Accept**
   - Status should change to "enroute"
   - Back in Control Center, incident status → "enroute"

4. **Test Another (with Reject):**
   - From Control Center, report another incident
   - Switch to Driver App on a different ambulance
   - Click ❌ **Reject**
   - Incident reassigns to another ambulance

---

### Step 4: Test via cURL (For API Testing)

**Create Incident:**
```bash
curl -X POST http://localhost:4000/api/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 12.9753,
    "lng": 77.6069,
    "severity": 4,
    "address": "MG Road Junction",
    "description": "Traffic accident with injuries"
  }'
```

**Expected Response:**
```json
{
  "_id": "...",
  "lat": 12.9753,
  "lng": 77.6069,
  "severity": 4,
  "status": "assigned",
  "assignedAmbulance": {
    "_id": "...",
    "vehicleNumber": "KA-01-A-1001",
    "driverName": "Arjun Sharma"
  },
  "route": [[12.9753, 77.6069], ...],
  "createdAt": "2026-03-19..."
}
```

**Get All Incidents:**
```bash
curl http://localhost:4000/api/incidents
```

**Get All Ambulances:**
```bash
curl http://localhost:4000/api/ambulances
```

**Update Ambulance Location (Simulate Driver GPS):**
```bash
curl -X PATCH http://localhost:4000/api/ambulances/<AMBULANCE_ID>/location \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 12.9800,
    "lng": 77.6100
  }'
```

**Accept Incident:**
```bash
curl -X POST http://localhost:4000/api/ambulances/<AMBULANCE_ID>/accept \
  -H "Content-Type: application/json"
```

**Reject Incident:**
```bash
curl -X POST http://localhost:4000/api/ambulances/<AMBULANCE_ID>/reject \
  -H "Content-Type: application/json"
```

**Resolve Incident (Get Hospital Recommendation):**
```bash
curl -X PATCH http://localhost:4000/api/incidents/<INCIDENT_ID>/resolve \
  -H "Content-Type: application/json"
```

---

## 🧪 Example Workflow (End-to-End)

### Scenario: Accident at MG Road

```
1. Control Center reports incident
   Location: 12.9753, 77.6069
   Severity: 4 (High)

2. System finds nearest ambulance
   → KA-01-A-1001 (0.5 km away)
   → Status changes: available → busy

3. Driver notification
   Switch to Driver App
   → Ambulance: KA-01-A-1001
   → Incident appears: Severity 4, "Assigned"

4. Driver accepts
   Click ✅ Accept
   → Status: enroute
   → Control Center shows: incident status = enroute

5. Driver sends GPS updates (simulated)
   curl PATCH /ambulances/.../location {lat, lng}

6. Signal turns green (PHASE 4 - not yet)

7. Driver resolves incident
   From Control Center: PATCH /incidents/:id/resolve
   → Hospital recommended: nearest (Manipal, Apollo, etc.)
   → Ambulance status: available
   → Ready for next incident
```

---

## 📊 Database Schema (Actual Examples)

### Ambulance (After Seed)
```json
{
  "_id": "ObjectId",
  "vehicleNumber": "KA-01-A-1001",
  "driverName": "Arjun Sharma",
  "driverEmail": "arjun@gc.com",
  "driverPassword": "bcrypted",
  "status": "busy",
  "lat": 12.9753,
  "lng": 77.6069,
  "assignedIncident": "ObjectId_of_incident",
  "createdAt": "2026-03-19..."
}
```

### Incident (After Creation + Assignment)
```json
{
  "_id": "ObjectId",
  "lat": 12.9753,
  "lng": 77.6069,
  "severity": 4,
  "status": "enroute",
  "address": "MG Road",
  "description": "Traffic accident",
  "assignedAmbulance": {
    "_id": "ObjectId",
    "vehicleNumber": "KA-01-A-1001"
  },
  "route": [[lat, lng], [lat, lng], ...],
  "recommendedHospital": null,
  "createdAt": "2026-03-19..."
}
```

---

## 🔌 Real-time Events (Socket.io)

The frontend listens to these events:

```javascript
socket.on('incident:assigned', (data) => {
  // New incident assigned to ambulance
  console.log(data.incident, data.ambulance);
});

socket.on('incident:created', (incident) => {
  // Incident created but no ambulance available
  console.log(incident);
});

socket.on('incident:enroute', ({incidentId, ambulanceId}) => {
  // Driver accepted → ambulance en route
});

socket.on('incident:resolved', ({incidentId, hospitalRec}) => {
  // Incident resolved, hospital recommended
});

socket.on('ambulance:moved', ({id, lat, lng}) => {
  // Ambulance GPS updated (real-time location)
});

socket.on('ambulance:status', ({id, status}) => {
  // Ambulance status changed (available/busy/offline)
});

socket.on('incident:rejected', ({incidentId, ambulanceId}) => {
  // Driver rejected, incident reassigning
});
```

---

## ✅ Checklist for Phase 1 Testing

- [ ] Backend running on :4000
- [ ] Frontend running on :5173
- [ ] MongoDB running (mongod)
- [ ] Ran `npm run seed` in server/
- [ ] Database has 5 ambulances, 8 hospitals, 20 signals
- [ ] Can report incident from Control Center
- [ ] Ambulance gets assigned automatically
- [ ] Can switch to Driver App
- [ ] Driver can see assigned incident
- [ ] Driver can accept incident (status changes to "enroute")
- [ ] Driver can reject incident (reassigns to another)
- [ ] Refresh page, data persists (prove DB is working)
- [ ] Socket.io messages logged in console
- [ ] No errors in backend terminal

---

## 🐛 Troubleshooting

**Problem: "No ambulances found"**
→ Run `npm run seed` in server directory

**Problem: CORS error in console**
→ Check `CLIENT_URL` in server/.env (should be http://localhost:5173)

**Problem: Ambulance location not updating**
→ Use PATCH /ambulances/:id/location endpoint

**Problem: Incident not assigning**
→ Make sure at least one ambulance has status='available'

**Problem: "Cannot GET /api/incidents"**
→ Backend not running. Check `npm run dev` in server/

**Problem: "Cannot connect to server"**
→ Check `VITE_WS_URL` in client/.env (should be http://localhost:4000)

---

## 📚 Key Files for This Phase

- **Backend Routes:** `server/src/routes/incidents.js`, `ambulances.js`
- **Services:** `server/src/services/assignment.js`, `hospitalService.js`
- **Models:** `server/src/models/Ambulance.js`, `Incident.js`
- **Database Seed:** `server/src/seed.js`
- **Frontend Dashboard:** `client/src/components/Dashboard.jsx`
- **Driver App:** `client/src/components/DriverApp.jsx`

---

## 🎯 What Phase 1 Proves

✅ **Auto-Assignment Logic** — Nearest ambulance found correctly
✅ **Real-time Updates** — Socket.io broadcasts changes
✅ **Driver Workflow** — Accept/reject incidents
✅ **Database Persistence** — Data saved & retrieved correctly
✅ **API Endpoints** — All routes working
✅ **Distance Calculation** — Haversine formula accurate

---

## 📈 Next: PHASE 2

After confirming Phase 1 works:
- Driver login system (with JWT)
- Persistent driver session
- More robust incident tracking
- Hospital assignment workflow

---

## 🎉 🎉 🎉

**PHASE 1 READY FOR TESTING!**

Test this thoroughly, then confirm to proceed to PHASE 2 (Driver System) and beyond!
