import express from 'express';
import { PrismaClient } from '@prisma/client';
import { io } from '../index.js';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const { resolved, severity, deviceId } = req.query;
    const where = {};
    if (resolved !== undefined) where.resolved = resolved === 'true';
    if (severity) where.severity = severity;
    if (deviceId) where.deviceId = deviceId;

    const alerts = await prisma.alert.findMany({
      where,
      include: {
        device: { select: { id: true, type: true, location: true, latitude: true, longitude: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const [total, critical, warning, resolved] = await Promise.all([
      prisma.alert.count(),
      prisma.alert.count({ where: { severity: 'critical', resolved: false } }),
      prisma.alert.count({ where: { severity: 'warning', resolved: false } }),
      prisma.alert.count({ where: { resolved: true } })
    ]);
    res.json({ total, critical, warning, resolved });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const alert = await prisma.alert.findUnique({
      where: { id: req.params.id },
      include: {
        device: true
      }
    });
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    res.json(alert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { deviceId, issue, severity, anomalyScore } = req.body;
    const alert = await prisma.alert.create({
      data: { deviceId, issue, severity, anomalyScore },
      include: {
        device: { select: { id: true, type: true, location: true, latitude: true, longitude: true } }
      }
    });
    
    io.emit('alert:created', alert);
    io.emit('notification', {
      type: 'alert',
      title: `${severity.toUpperCase()}: ${issue}`,
      message: `${alert.device.location} - Score: ${anomalyScore.toFixed(2)}`
    });
    
    res.status(201).json(alert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/resolve', async (req, res) => {
  try {
    const alert = await prisma.alert.update({
      where: { id: req.params.id },
      data: { resolved: true },
      include: {
        device: { select: { id: true, type: true, location: true } }
      }
    });
    io.emit('alert:resolved', alert);
    res.json(alert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/unresolve', async (req, res) => {
  try {
    const alert = await prisma.alert.update({
      where: { id: req.params.id },
      data: { resolved: false }
    });
    io.emit('alert:unresolved', alert);
    res.json(alert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.alert.delete({ where: { id: req.params.id } });
    io.emit('alert:deleted', { id: req.params.id });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
