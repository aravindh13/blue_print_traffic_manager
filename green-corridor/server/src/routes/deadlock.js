const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const {
  lockResourceForAmbulance,
  releaseResourceForAmbulance,
  checkConflictsForAmbulance,
  getDeadlockStatus,
  preventDeadlocks,
  lockManager
} = require('../services/deadlockPrevention');

router.get('/status', async (req, res) => {
  try {
    const status = getDeadlockStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/lock', authMiddleware, async (req, res) => {
  try {
    const { lat, lng, priority } = req.body;
    const ambulanceId = req.user.id;
    
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }
    
    const result = lockResourceForAmbulance(ambulanceId, lat, lng, priority || 5, req.io);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/release', authMiddleware, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const ambulanceId = req.user.id;
    
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }
    
    const result = releaseResourceForAmbulance(ambulanceId, lat, lng, req.io);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/check-conflicts/:ambulanceId', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    const { ambulanceId } = req.params;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng query params required' });
    }
    
    const conflicts = checkConflictsForAmbulance(ambulanceId, parseFloat(lat), parseFloat(lng));
    res.json({ conflicts, count: conflicts.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/check-deadlock', async (req, res) => {
  try {
    const result = await preventDeadlocks(req.io);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/locks', async (req, res) => {
  try {
    const status = getDeadlockStatus();
    res.json(status.activeLocks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/queues', async (req, res) => {
  try {
    const status = getDeadlockStatus();
    res.json(status.waitQueues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
