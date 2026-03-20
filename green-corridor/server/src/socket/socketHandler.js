const Ambulance = require('../models/Ambulance');
const Incident = require('../models/Incident');
const { runSignalPreemption, cleanupExpiredSignals, randomizeSignals } = require('../services/signalPreemption');
const { startGPSSimulation, stopGPSSimulation, getActiveRoute } = require('../services/gpsSimulator');
const { lockResourceForAmbulance, releaseResourceForAmbulance, checkConflictsForAmbulance, preventDeadlocks } = require('../services/deadlockPrevention');

function initSocket(io) {
  // Periodic cleanup every 10 seconds
  setInterval(() => {
    cleanupExpiredSignals(io);
    preventDeadlocks(io);
    randomizeSignals(io);
  }, 10000);

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Driver sends live GPS update (manual mode)
    socket.on('driver:location', async ({ ambulanceId, lat, lng }) => {
      try {
        const ambulance = await Ambulance.findByIdAndUpdate(
          ambulanceId, { lat, lng }, { new: true }
        ).populate('assignedIncident');

        if (!ambulance) return;

        // Broadcast location
        io.emit('ambulance:moved', { ambulanceId, lat, lng });

        // Lock resource for deadlock prevention
        const priority = ambulance.assignedIncident?.severity || 5;
        await lockResourceForAmbulance(ambulanceId, lat, lng, priority, io);

        // Check for conflicts and broadcast
        const conflicts = checkConflictsForAmbulance(ambulanceId, lat, lng);
        if (conflicts.length > 0) {
          io.emit('conflict:detected', { ambulanceId, conflicts });
        }

        // Run signal preemption if ambulance is on duty
        if (ambulance.assignedIncident) {
          const severity = ambulance.assignedIncident.severity || 3;
          await runSignalPreemption({ ambulanceId, lat, lng, severity, io });
        }
      } catch (err) {
        console.error('driver:location error:', err.message);
      }
    });

    // Driver starts GPS simulation (auto-drive to incident)
    socket.on('driver:simulate', async ({ ambulanceId }) => {
      try {
        const ambulance = await Ambulance.findById(ambulanceId).populate('assignedIncident');
        if (!ambulance?.assignedIncident) {
          socket.emit('sim:error', { message: 'No assigned incident to simulate toward' });
          return;
        }

        const incident = ambulance.assignedIncident;
        io.emit('incident:enroute', { incidentId: incident._id, ambulanceId });

        await startGPSSimulation({
          ambulanceId,
          incidentLat: incident.lat,
          incidentLng: incident.lng,
          severity: incident.severity || 3,
          io,
          incidentId: incident._id
        });

        socket.emit('sim:started', { ambulanceId, incidentId: incident._id });
      } catch (err) {
        console.error('driver:simulate error:', err.message);
        socket.emit('sim:error', { message: err.message });
      }
    });

    // Driver stops GPS simulation
    socket.on('driver:stop', ({ ambulanceId }) => {
      stopGPSSimulation(ambulanceId);
      io.emit('sim:stopped', { ambulanceId });
    });

    // Driver simulates to hospital
    socket.on('driver:simulateHospital', async ({ ambulanceId, hospitalLat, hospitalLng }) => {
      try {
        const ambulance = await Ambulance.findById(ambulanceId);
        if (!ambulance) return;

        io.emit('sim:started', { ambulanceId, type: 'toHospital' });

        await startGPSSimulation({
          ambulanceId,
          incidentLat: hospitalLat,
          incidentLng: hospitalLng,
          severity: 1,
          io,
          type: 'toHospital'
        });

        socket.emit('sim:started', { ambulanceId, type: 'toHospital' });
      } catch (err) {
        console.error('driver:simulateHospital error:', err.message);
        socket.emit('sim:error', { message: err.message });
      }
    });

    // Auto-simulate to hospital after reaching incident
    socket.on('sim:autoToHospital', async ({ ambulanceId, route, hospital }) => {
      try {
        io.emit('route:update', { ambulanceId, route, type: 'toHospital' });
        
        await startGPSSimulation({
          ambulanceId,
          incidentLat: hospital.lat,
          incidentLng: hospital.lng,
          severity: 1,
          io,
          type: 'toHospital'
        });
        
        io.emit('sim:started', { ambulanceId, type: 'toHospital' });
      } catch (err) {
        console.error('sim:autoToHospital error:', err.message);
      }
    });

    // Client requests current route for a given ambulance
    socket.on('route:request', ({ ambulanceId }) => {
      const route = getActiveRoute(ambulanceId);
      if (route) {
        socket.emit('route:update', { ambulanceId, route });
      }
    });

    // Driver accepts an incident - starts navigation immediately
    socket.on('driver:accept', async ({ ambulanceId }) => {
      try {
        const ambulance = await Ambulance.findById(ambulanceId).populate('assignedIncident');
        if (!ambulance?.assignedIncident) return;

        await Ambulance.findByIdAndUpdate(ambulanceId, { status: 'busy' });

        const incident = await Incident.findByIdAndUpdate(
          ambulance.assignedIncident._id, { status: 'enroute' }, { new: true }
        );
        io.emit('incident:enroute', { incidentId: incident._id, ambulanceId });
        io.emit('ambulance:status', { ambulanceId, status: 'busy' });

        await startGPSSimulation({
          ambulanceId,
          incidentLat: incident.lat,
          incidentLng: incident.lng,
          severity: incident.severity || 3,
          io,
          incidentId: incident._id
        });
      } catch (err) {
        console.error('driver:accept error:', err.message);
      }
    });

    // Driver rejects incident
    socket.on('driver:reject', async ({ ambulanceId }) => {
      try {
        const ambulance = await Ambulance.findById(ambulanceId);
        if (!ambulance) return;

        stopGPSSimulation(ambulanceId);

        const incidentId = ambulance.assignedIncident;
        ambulance.status = 'available';
        ambulance.assignedIncident = null;
        await ambulance.save();

        if (incidentId) {
          await Incident.findByIdAndUpdate(incidentId, {
            status: 'open', assignedAmbulance: null
          });
          io.emit('incident:rejected', { incidentId, ambulanceId });
        }
      } catch (err) {
        console.error('driver:reject error:', err.message);
      }
    });

    // Driver resolves incident (marks as done, frees ambulance)
    socket.on('driver:resolve', async ({ ambulanceId }) => {
      try {
        const ambulance = await Ambulance.findById(ambulanceId);
        if (!ambulance) return;

        stopGPSSimulation(ambulanceId);

        const incidentId = ambulance.assignedIncident;
        ambulance.status = 'available';
        ambulance.assignedIncident = null;
        await ambulance.save();

        // Release all resource locks held by this ambulance
        releaseResourceForAmbulance(ambulanceId, ambulance.lat, ambulance.lng, io);

        if (incidentId) {
          await Incident.findByIdAndUpdate(incidentId, { status: 'resolved', resolvedAt: new Date() });
          io.emit('incident:resolved', { incidentId, ambulanceId });
        }
        io.emit('ambulance:status', { ambulanceId, status: 'available' });
      } catch (err) {
        console.error('driver:resolve error:', err.message);
      }
    });

    socket.on('disconnect', () => {

      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
}

module.exports = { initSocket };
