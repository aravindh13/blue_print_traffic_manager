const express = require('express');
const TrafficSignal = require('../models/TrafficSignal');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/signals
 * Fetch all traffic signals
 */
router.get('/', async (req, res) => {
  try {
    const signals = await TrafficSignal.find({})
      .populate('lockedBy', 'driverName vehicleNumber');
    
    res.json(signals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/signals/:id
 * Fetch single traffic signal
 */
router.get('/:id', async (req, res) => {
  try {
    const signal = await TrafficSignal.findById(req.params.id)
      .populate('lockedBy', 'driverName vehicleNumber');
    
    if (!signal) {
      return res.status(404).json({ error: 'Signal not found' });
    }
    
    res.json(signal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/signals/:id/state
 * Manually set signal state (for testing/admin only)
 * Protected: requires JWT
 */
router.put('/:id/state', authMiddleware, async (req, res) => {
  try {
    const { state } = req.body;
    
    if (!['red', 'green', 'yellow'].includes(state)) {
      return res.status(400).json({ error: 'Invalid state. Must be red, green, or yellow' });
    }
    
    const signal = await TrafficSignal.findByIdAndUpdate(
      req.params.id,
      {
        state,
        // Clear lock when manually setting state
        ...(state !== 'green' && { lockedBy: null, lockedByPriority: 0, resetAt: null })
      },
      { new: true }
    ).populate('lockedBy', 'driverName vehicleNumber');
    
    if (!signal) {
      return res.status(404).json({ error: 'Signal not found' });
    }
    
    // Broadcast the change
    if (req.io) {
      req.io.emit('signal:changed', {
        id: signal._id,
        state: signal.state,
        lat: signal.lat,
        lng: signal.lng,
        lockedBy: signal.lockedBy,
      });
    }
    
    res.json(signal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
