const router = require('express').Router();
const Hospital = require('../models/Hospital');
const { haversine } = require('../services/haversine');
const { recommendHospital } = require('../services/hospitalService');

// List all hospitals
router.get('/', async (_req, res) => {
  try {
    const hospitals = await Hospital.find();
    res.json(hospitals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get nearest hospital + route
router.get('/nearest', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });
    const result = await recommendHospital(parseFloat(lat), parseFloat(lng));
    if (!result) return res.status(404).json({ error: 'No hospitals found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
