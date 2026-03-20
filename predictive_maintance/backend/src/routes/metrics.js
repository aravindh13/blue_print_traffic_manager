import express from 'express';
import { PrismaClient } from '@prisma/client';
import { io } from '../index.js';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const { deviceId, limit = 100 } = req.query;
    const where = deviceId ? { deviceId } : {};
    const metrics = await prisma.metric.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit),
      include: { device: { select: { id: true, type: true, location: true } } }
    });
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/device/:deviceId', async (req, res) => {
  try {
    const metrics = await prisma.metric.findMany({
      where: { deviceId: req.params.deviceId },
      orderBy: { timestamp: 'desc' },
      take: 100
    });
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { deviceId, temperature, voltage, errorRate, uptime } = req.body;
    const metric = await prisma.metric.create({
      data: {
        deviceId,
        temperature,
        voltage,
        errorRate,
        uptime
      },
      include: { device: { select: { id: true, type: true, location: true } } }
    });
    io.emit('metric:created', metric);
    res.status(201).json(metric);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/batch', async (req, res) => {
  try {
    const { metrics } = req.body;
    const created = await prisma.metric.createMany({ data: metrics });
    io.emit('metrics:batch', { count: created.count });
    res.status(201).json({ count: created.count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/latest', async (req, res) => {
  try {
    const { deviceId } = req.query;
    const deviceWhere = deviceId ? { id: deviceId } : {};
    
    const devices = await prisma.device.findMany({
      where: deviceWhere,
      select: { id: true }
    });
    
    const latestMetrics = await Promise.all(
      devices.map(async (device) => {
        const metric = await prisma.metric.findFirst({
          where: { deviceId: device.id },
          orderBy: { timestamp: 'desc' },
          include: { device: true }
        });
        return metric;
      })
    );
    
    res.json(latestMetrics.filter(Boolean));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
