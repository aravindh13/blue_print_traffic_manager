import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import devicesRouter from './routes/devices.js';
import metricsRouter from './routes/metrics.js';
import alertsRouter from './routes/alerts.js';
import { checkAnomaly, getMLHealth } from './services/mlService.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true
  }
});

export const prisma = new PrismaClient();
export { io };

app.use(cors());
app.use(express.json());

app.use('/api/devices', devicesRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/alerts', alertsRouter);

app.get('/api/health', async (req, res) => {
  const mlHealth = await getMLHealth();
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mlService: mlHealth
  });
});

app.get('/api/stats', async (req, res) => {
  try {
    const [totalDevices, healthy, warning, critical, totalAlerts, activeAlerts] = await Promise.all([
      prisma.device.count(),
      prisma.device.count({ where: { status: 'healthy' } }),
      prisma.device.count({ where: { status: 'warning' } }),
      prisma.device.count({ where: { status: 'critical' } }),
      prisma.alert.count(),
      prisma.alert.count({ where: { resolved: false } })
    ]);
    res.json({ totalDevices, healthy, warning, critical, totalAlerts, activeAlerts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

let simulatorInterval = null;
let isSimulatorRunning = false;
let mlEnabled = true;

app.post('/api/simulator/start', async (req, res) => {
  if (isSimulatorRunning) {
    return res.json({ status: 'already running' });
  }
  
  isSimulatorRunning = true;
  const devices = await prisma.device.findMany();
  
  simulatorInterval = setInterval(async () => {
    for (const device of devices) {
      const metrics = generateMetrics(device);
      
      let anomalyResult = { anomaly: false, anomaly_score: 0 };
      if (mlEnabled) {
        anomalyResult = await checkAnomaly(metrics);
      }
      
      const { anomaly, anomaly_score } = anomalyResult;
      
      await prisma.metric.create({
        data: {
          deviceId: device.id,
          temperature: metrics.temperature,
          voltage: metrics.voltage,
          errorRate: metrics.errorRate,
          uptime: metrics.uptime
        }
      });
      
      let newStatus = 'healthy';
      if (anomaly) {
        if (anomaly_score > 0.7) {
          newStatus = 'critical';
        } else if (anomaly_score > 0.4) {
          newStatus = 'warning';
        }
        
        const existingAlert = await prisma.alert.findFirst({
          where: { deviceId: device.id, resolved: false }
        });
        
        if (!existingAlert) {
          const alert = await prisma.alert.create({
            data: {
              deviceId: device.id,
              issue: anomaly_score > 0.7 ? 'Critical anomaly detected' : 'Potential anomaly detected',
              severity: anomaly_score > 0.7 ? 'critical' : 'warning',
              anomalyScore: anomaly_score
            },
            include: { device: true }
          });
          
          io.emit('alert:created', alert);
          io.emit('notification', {
            type: 'alert',
            title: `${alert.severity.toUpperCase()}: ${alert.issue}`,
            message: `${alert.device.location} - Score: ${anomaly_score.toFixed(2)}`
          });
        }
      }
      
      if (device.status !== newStatus) {
        await prisma.device.update({
          where: { id: device.id },
          data: { status: newStatus }
        });
        io.emit('device:updated', { ...device, status: newStatus });
      }
      
      io.to(`device:${device.id}`).emit('metrics:update', {
        deviceId: device.id,
        ...metrics,
        anomaly,
        anomalyScore: anomaly_score,
        timestamp: new Date().toISOString()
      });
      
      io.emit('device:metrics', {
        deviceId: device.id,
        ...metrics,
        anomaly,
        anomalyScore: anomaly_score,
        status: newStatus,
        timestamp: new Date().toISOString()
      });
    }
    
    io.emit('metrics:batch', { timestamp: new Date().toISOString() });
  }, 5000);
  
  res.json({ status: 'started', interval: 5000, devices: devices.length, mlEnabled });
});

app.post('/api/simulator/stop', (req, res) => {
  if (simulatorInterval) {
    clearInterval(simulatorInterval);
    simulatorInterval = null;
    isSimulatorRunning = false;
    return res.json({ status: 'stopped' });
  }
  res.json({ status: 'not running' });
});

app.get('/api/simulator/status', (req, res) => {
  res.json({ running: isSimulatorRunning, mlEnabled });
});

app.post('/api/ml/toggle', (req, res) => {
  mlEnabled = !mlEnabled;
  res.json({ mlEnabled });
});

function generateMetrics(device) {
  const isAnomaly = Math.random() < 0.1;
  
  const baseTemp = 35 + Math.random() * 20;
  const baseVoltage = 220 + Math.random() * 20;
  const baseErrorRate = Math.random() * 3;
  const baseUptime = 95 + Math.random() * 5;
  
  if (isAnomaly) {
    return {
      temperature: baseTemp + (Math.random() * 30),
      voltage: baseVoltage + (Math.random() * 50 - 25),
      errorRate: baseErrorRate + (Math.random() * 10 + 5),
      uptime: baseUptime - (Math.random() * 20)
    };
  }
  
  return {
    temperature: baseTemp,
    voltage: baseVoltage,
    errorRate: baseErrorRate,
    uptime: baseUptime
  };
}

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });

  socket.on('join:device', (deviceId) => {
    socket.join(`device:${deviceId}`);
    console.log(`Socket ${socket.id} joined device:${deviceId}`);
  });

  socket.on('leave:device', (deviceId) => {
    socket.leave(`device:${deviceId}`);
  });

  socket.on('subscribe:all', () => {
    socket.join('all-devices');
    console.log(`Socket ${socket.id} subscribed to all devices`);
  });
});

const PORT = process.env.PORT || 5000;

async function main() {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }

  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`WebSocket ready for connections`);
    console.log(`ML Service: ${process.env.ML_SERVICE_URL || 'http://localhost:8000'}`);
    console.log(`\nSimulator endpoints:`);
    console.log(`  POST /api/simulator/start  - Start device simulation`);
    console.log(`  POST /api/simulator/stop   - Stop simulation`);
    console.log(`  GET  /api/simulator/status - Check status`);
    console.log(`  POST /api/ml/toggle        - Toggle ML detection`);
  });
}

main().catch((e) => {
  console.error('Failed to start server:', e);
  process.exit(1);
});

process.on('SIGINT', async () => {
  if (simulatorInterval) clearInterval(simulatorInterval);
  await prisma.$disconnect();
  process.exit(0);
});
