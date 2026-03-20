const Hospital = require('../models/Hospital');
const { haversine } = require('./haversine');
const { getOSRMRoute } = require('./routing');

/**
 * Given a pickup location, return the nearest hospital and route to it.
 */
async function recommendHospital(pickupLat, pickupLng) {
  const hospitals = await Hospital.find({});
  if (!hospitals.length) return null;

  let nearest = null;
  let minDist = Infinity;

  for (const h of hospitals) {
    const dist = haversine(pickupLat, pickupLng, h.lat, h.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = h;
    }
  }

  const route = await getOSRMRoute(pickupLat, pickupLng, nearest.lat, nearest.lng);
  return { hospital: nearest, distanceKm: minDist, route };
}

module.exports = { recommendHospital };
