// Force nodemon restart again
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const incidentRoutes = require('./routes/incidents');
const ambulanceRoutes = require('./routes/ambulances');
const hospitalRoutes = require('./routes/hospitals');
const authRoutes = require('./routes/auth');
const signalRoutes = require('./routes/signals');
const deadlockRoutes = require('./routes/deadlock');
const { initSocket } = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:5174',
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH']
  }
});

// Middleware
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// Attach io to request
app.use((req, _res, next) => { req.io = io; next(); });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/ambulances', ambulanceRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/signals', signalRoutes);
app.use('/api/deadlock', deadlockRoutes);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date() }));

// Socket
initSocket(io);

// Database + start
const PORT = process.env.PORT || 4000;
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/green_corridor')
  .then(() => {
    console.log('✅ MongoDB connected');
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => { console.error('❌ MongoDB error:', err); process.exit(1); });

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Kill the process and restart.`);
    console.error(`   Run: netstat -ano | findstr :${PORT}   then   taskkill /PID <pid> /F`);
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
});

module.exports = { io };
