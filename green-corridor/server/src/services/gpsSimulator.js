const { getOSRMRoute } = require('./routing');
const { runSignalPreemption } = require('./signalPreemption');
const { recommendHospital } = require('./hospitalService');
const Ambulance = require('../models/Ambulance');
const Incident = require('../models/Incident');

const activeSimulations = new Map();

async function startGPSSimulation({ ambulanceId, incidentLat, incidentLng, severity = 3, io, type = 'toIncident', incidentId }) {
  stopGPSSimulation(ambulanceId);

  try {
    const ambulance = await Ambulance.findById(ambulanceId);
    if (!ambulance) return;

    const fromLat = ambulance.lat;
    const fromLng = ambulance.lng;
    const targetIncidentId = incidentId;

    console.log('[GPS] Starting from', fromLat, fromLng, 'to', incidentLat, incidentLng);

    const route = await getOSRMRoute(fromLat, fromLng, incidentLat, incidentLng);

    if (!route || route.length < 2) {
      console.log('[GPS] No route found, using fallback');
      return;
    }

    console.log('[GPS] Route found with', route.length, 'points');
    
    io.emit('route:update', { ambulanceId, route, type });
    io.emit('sim:started', { ambulanceId, type });

    let step = 0;
    const totalSteps = route.length;

    const interval = setInterval(async () => {
      if (step >= totalSteps) {
        try {
          const finalLat = route[totalSteps - 1][0];
          const finalLng = route[totalSteps - 1][1];
          
          await Ambulance.findByIdAndUpdate(ambulanceId, { lat: finalLat, lng: finalLng });
          io.emit('ambulance:moved', { ambulanceId, lat: finalLat, lng: finalLng });
          
          if (type === 'toIncident') {
            console.log('[GPS] Reached incident');
            io.emit('incident:arrived', { incidentId: targetIncidentId, ambulanceId });
            
            const hospitalRec = await recommendHospital(incidentLat, incidentLng);
            if (hospitalRec) {
              io.emit('hospital:recommended', { hospitalRec, route: hospitalRec.route });
              
              console.log('[GPS] Auto-navigating to hospital:', hospitalRec.hospital.name);
              await startGPSSimulation({
                ambulanceId,
                incidentLat: hospitalRec.hospital.lat,
                incidentLng: hospitalRec.hospital.lng,
                severity: 1,
                io,
                type: 'toHospital',
                incidentId: null
              });
            }
          } else if (type === 'toHospital') {
            console.log('[GPS] Reached hospital');
            io.emit('hospital:arrived', { ambulanceId });
            
            if (targetIncidentId) {
              await Incident.findByIdAndUpdate(targetIncidentId, { status: 'resolved', resolvedAt: new Date() });
              io.emit('incident:resolved', { incidentId: targetIncidentId, ambulanceId });
            }
          }
          
          clearInterval(interval);
          activeSimulations.delete(ambulanceId.toString());
          io.emit('sim:stopped', { ambulanceId });
          return;
        } catch (e) {
          console.log('[GPS] Error on finish:', e.message);
        }
        return;
      }

      const [lat, lng] = route[step];
      step++;

      await Ambulance.findByIdAndUpdate(ambulanceId, { lat, lng });
      io.emit('ambulance:moved', { ambulanceId, lat, lng });

      try {
        await runSignalPreemption({ ambulanceId, lat, lng, severity, io });
      } catch (_) {}
    }, 200);

    activeSimulations.set(ambulanceId.toString(), { interval, route, type });
  } catch (err) {
    console.error('[GPS] Error:', err.message);
  }
}

function stopGPSSimulation(ambulanceId) {
  const sim = activeSimulations.get(ambulanceId.toString());
  if (sim) {
    clearInterval(sim.interval);
    activeSimulations.delete(ambulanceId.toString());
  }
}

function getActiveRoute(ambulanceId) {
  const sim = activeSimulations.get(ambulanceId.toString());
  return sim ? sim.route : null;
}

module.exports = { startGPSSimulation, stopGPSSimulation, getActiveRoute };
