const router = require('express').Router();
const Ambulance = require('../models/Ambulance');
const Incident = require('../models/Incident');
const { authMiddleware } = require('../middleware/auth');
const { getOSRMRoute } = require('../services/routing');

// List all ambulances
router.get('/', async (_req, res) => {
  try {
    const ambulances = await Ambulance.find().populate('assignedIncident');
    res.json(ambulances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current logged-in driver's ambulance
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const ambulance = await Ambulance.findById(req.user.id).populate('assignedIncident');
    if (!ambulance) return res.status(404).json({ error: 'Ambulance not found' });
    res.json(ambulance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update GPS location (driver sends this)
router.patch('/:id/location', authMiddleware, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const ambulance = await Ambulance.findByIdAndUpdate(
      req.params.id, { lat, lng }, { new: true }
    );
    if (!ambulance) return res.status(404).json({ error: 'Not found' });
    req.io.emit('ambulance:moved', { id: ambulance._id, lat, lng });
    res.json(ambulance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle availability
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const ambulance = await Ambulance.findByIdAndUpdate(
      req.params.id, { status }, { new: true }
    );
    if (!ambulance) return res.status(404).json({ error: 'Not found' });
    req.io.emit('ambulance:status', { id: ambulance._id, status });
    res.json(ambulance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Driver accepts incident
router.post('/:id/accept', authMiddleware, async (req, res) => {
  try {
    const ambulance = await Ambulance.findById(req.params.id).populate('assignedIncident');
    if (!ambulance || !ambulance.assignedIncident) return res.status(404).json({ error: 'No assigned incident' });

    const incident = ambulance.assignedIncident;
    incident.status = 'enroute';
    await incident.save();

    req.io.emit('incident:enroute', { incidentId: incident._id, ambulanceId: ambulance._id });
    
    // Emit route if available
    if (incident.route && incident.route.length > 0) {
      req.io.emit('route:update', { ambulanceId: ambulance._id.toString(), route: incident.route });
    }
    
    res.json({ message: 'Accepted', incident });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Driver resolves incident (arrived at scene / delivered to hospital)
router.post('/:id/resolve', async (req, res) => {
  try {
    const ambulance = await Ambulance.findById(req.params.id);
    if (!ambulance) return res.status(404).json({ error: 'Not found' });

    const incidentId = ambulance.assignedIncident;
    ambulance.status = 'available';
    ambulance.assignedIncident = null;
    await ambulance.save();

    if (incidentId) {
      await Incident.findByIdAndUpdate(incidentId, { status: 'resolved', resolvedAt: new Date() });
      const io = req.io || req.app.get('io');
      if (io) io.emit('incident:resolved', { incidentId, ambulanceId: ambulance._id });
    }
    res.json({ message: 'Resolved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Driver rejects incident
router.post('/:id/reject', authMiddleware, async (req, res) => {
  try {
    const ambulance = await Ambulance.findById(req.params.id);
    if (!ambulance) return res.status(404).json({ error: 'Not found' });

    const incidentId = ambulance.assignedIncident;
    ambulance.status = 'available';
    ambulance.assignedIncident = null;
    await ambulance.save();

    if (incidentId) {
      const incident = await Incident.findById(incidentId);
      if (incident) {
        incident.status = 'open';
        incident.assignedAmbulance = null;
        await incident.save();
        req.io.emit('incident:rejected', { incidentId, ambulanceId: ambulance._id });
      }
    }
    res.json({ message: 'Rejected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
