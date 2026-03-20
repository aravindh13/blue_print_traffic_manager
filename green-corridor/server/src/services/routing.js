const https = require('https');

/**
 * Get route from OSRM public API.
 * Returns array of [lat, lng] waypoints.
 */
async function getOSRMRoute(fromLat, fromLng, toLat, toLng) {
  return new Promise((resolve) => {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.code !== 'Ok' || !json.routes || !json.routes.length) {
            resolve(fallbackRoute(fromLat, fromLng, toLat, toLng));
            return;
          }
          const route = json.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
          console.log(`📍 OSRM Route fetched: ${route.length} waypoints`);
          resolve(route);
        } catch (e) {
          console.log('OSRM parse error, using fallback');
          resolve(fallbackRoute(fromLat, fromLng, toLat, toLng));
        }
      });
    }).on('error', () => {
      console.log('OSRM network error, using fallback');
      resolve(fallbackRoute(fromLat, fromLng, toLat, toLng));
    });
  });
}

/** Straight-line fallback with interpolated points */
function fallbackRoute(lat1, lng1, lat2, lng2) {
  const steps = 20;
  const route = [];
  for (let i = 0; i <= steps; i++) {
    route.push([
      lat1 + (lat2 - lat1) * (i / steps),
      lng1 + (lng2 - lng1) * (i / steps)
    ]);
  }
  return route;
}

module.exports = { getOSRMRoute, fallbackRoute };
