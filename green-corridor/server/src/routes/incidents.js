const router = require('express').Router();
const Incident = require('../models/Incident');
const Ambulance = require('../models/Ambulance');
const { findNearestAmbulance } = require('../services/assignment');
const { getOSRMRoute } = require('../services/routing');
const { recommendHospital } = require('../services/hospitalService');

// Create incident + auto-assign nearest ambulance
router.post('/', async (req, res) => {
  try {
    const { lat, lng, severity, address, description } = req.body;
    const incident = await Incident.create({ lat, lng, severity, address, description });

    const result = await findNearestAmbulance(lat, lng);
    if (result) {
      const { ambulance } = result;
      const route = await getOSRMRoute(ambulance.lat, ambulance.lng, lat, lng);
      incident.assignedAmbulance = ambulance._id;
      incident.status = 'assigned';
      incident.route = route;
      await incident.save();

      ambulance.status = 'busy';
      ambulance.assignedIncident = incident._id;
      await ambulance.save();

      const populated = await incident.populate('assignedAmbulance');
      req.io.emit('incident:assigned', { incident: populated, ambulance });
      
      // Also emit the route so map can display it
      if (route && route.length > 0) {
        req.io.emit('route:update', { ambulanceId: ambulance._id.toString(), route });
      }
      
      return res.status(201).json(populated);
    }

    req.io.emit('incident:created', incident);
    res.status(201).json(incident);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all incidents
router.get('/', async (_req, res) => {
  try {
    const incidents = await Incident.find()
      .populate('assignedAmbulance')
      .populate('recommendedHospital')
      .sort({ createdAt: -1 });
    res.json(incidents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Resolve incident + recommend hospital
router.patch('/:id/resolve', async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id).populate('assignedAmbulance');
    if (!incident) return res.status(404).json({ error: 'Not found' });

    const hospitalRec = await recommendHospital(incident.lat, incident.lng);
    incident.status = 'resolved';
    if (hospitalRec) incident.recommendedHospital = hospitalRec.hospital._id;
    await incident.save();

    if (incident.assignedAmbulance) {
      await Ambulance.findByIdAndUpdate(incident.assignedAmbulance._id, {
        status: 'available', assignedIncident: null
      });
    }

    req.io.emit('incident:resolved', { incidentId: incident._id, hospitalRec });
    res.json({ incident, hospitalRec });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
