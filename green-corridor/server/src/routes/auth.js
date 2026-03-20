const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Ambulance = require('../models/Ambulance');
const { authMiddleware } = require('../middleware/auth');

// Driver login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const ambulance = await Ambulance.findOne({ driverEmail: email });
    if (!ambulance) return res.status(404).json({ error: 'Driver not found' });

    const valid = await bcrypt.compare(password, ambulance.driverPassword);
    if (!valid) return res.status(401).json({ error: 'Invalid password' });

    const token = jwt.sign(
      { id: ambulance._id, name: ambulance.driverName },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '12h' }
    );

    res.json({
      token,
      ambulance: {
        id: ambulance._id,
        name: ambulance.driverName,
        vehicleNumber: ambulance.vehicleNumber,
        email: ambulance.driverEmail,
        status: ambulance.status
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current driver info
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const ambulance = await Ambulance.findById(req.user.id).populate('assignedIncident');
    if (!ambulance) return res.status(404).json({ error: 'Driver not found' });

    res.json({
      ambulance: {
        id: ambulance._id,
        name: ambulance.driverName,
        vehicleNumber: ambulance.vehicleNumber,
        email: ambulance.driverEmail,
        status: ambulance.status,
        lat: ambulance.lat,
        lng: ambulance.lng,
        assignedIncident: ambulance.assignedIncident
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout (client-side mainly, but can be used to notify backend)
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    // In a real system, you might invalidate tokens here
    // For now, just confirm logout
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
