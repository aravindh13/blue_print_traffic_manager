const Ambulance = require('../models/Ambulance');
const { haversine } = require('./haversine');

/**
 * Returns the nearest available ambulance to a given lat/lng.
 */
async function findNearestAmbulance(lat, lng) {
  const available = await Ambulance.find({ status: 'available' });
  if (!available.length) return null;

  let nearest = null;
  let minDist = Infinity;

  for (const amb of available) {
    const dist = haversine(lat, lng, amb.lat, amb.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = amb;
    }
  }

  return { ambulance: nearest, distanceKm: minDist };
}

module.exports = { findNearestAmbulance };
