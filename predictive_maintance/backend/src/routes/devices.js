import express from 'express';
import { PrismaClient } from '@prisma/client';
import { io } from '../index.js';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const devices = await prisma.device.findMany({
      include: {
        _count: {
          select: { alerts: true, metrics: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const device = await prisma.device.findUnique({
      where: { id: req.params.id },
      include: {
        metrics: {
          orderBy: { timestamp: 'desc' },
          take: 100
        },
        alerts: {
          orderBy: { createdAt: 'desc' },
          take: 50
        }
      }
    });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    res.json(device);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { type, latitude, longitude, location } = req.body;
    const device = await prisma.device.create({
      data: { type, latitude, longitude, location }
    });
    io.emit('device:created', device);
    res.status(201).json(device);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const device = await prisma.device.update({
      where: { id: req.params.id },
      data: { status }
    });
    io.emit('device:updated', device);
    res.json(device);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.device.delete({ where: { id: req.params.id } });
    io.emit('device:deleted', { id: req.params.id });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
