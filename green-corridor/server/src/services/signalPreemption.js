const TrafficSignal = require('../models/TrafficSignal');
const { haversine } = require('./haversine');

const PREEMPTION_DISTANCE_M = 100; // meters - ambulance must be within 100m
const RESET_DISTANCE_M = 200;      // reset after 200m past signal
const GREEN_DURATION_MS = 45000;   // 45 seconds max green hold

function calculatePriority(severity, distanceKm) {
  return severity * 10 - distanceKm;
}

async function runSignalPreemption({ ambulanceId, lat, lng, severity, io }) {
  const signals = await TrafficSignal.find({});
  const now = new Date();
  const priority = calculatePriority(severity, 0);

  for (const signal of signals) {
    const distKm = haversine(lat, lng, signal.lat, signal.lng);
    const distM = distKm * 1000;

    // PREEMPTION: within 100m - turn green!
    if (distM <= PREEMPTION_DISTANCE_M) {
      const ambulanceIdStr = ambulanceId.toString();
      const lockedByStr = signal.lockedBy ? signal.lockedBy.toString() : null;

      if (lockedByStr === ambulanceIdStr) {
        signal.resetAt = new Date(now.getTime() + GREEN_DURATION_MS);
        await signal.save();
        continue;
      }

      if (!signal.lockedBy) {
        signal.state = 'green';
        signal.lockedBy = ambulanceId;
        signal.lockedByPriority = priority;
        signal.resetAt = new Date(now.getTime() + GREEN_DURATION_MS);
        await signal.save();
        io.emit('signal:changed', { id: signal._id, state: 'green', lat: signal.lat, lng: signal.lng });
        continue;
      }

      if (priority > signal.lockedByPriority) {
        signal.state = 'green';
        signal.lockedBy = ambulanceId;
        signal.lockedByPriority = priority;
        signal.resetAt = new Date(now.getTime() + GREEN_DURATION_MS);
        await signal.save();
        io.emit('signal:changed', { id: signal._id, state: 'green', lat: signal.lat, lng: signal.lng });
      }
    }

    // RESET: ambulance passed (>200m) and owns this signal
    if (distM > RESET_DISTANCE_M && signal.lockedBy && signal.lockedBy.toString() === ambulanceId.toString()) {
      signal.state = 'yellow';
      await signal.save();
      io.emit('signal:changed', { id: signal._id, state: 'yellow', lat: signal.lat, lng: signal.lng });

      setTimeout(async () => {
        signal.state = 'red';
        signal.lockedBy = null;
        signal.lockedByPriority = 0;
        signal.resetAt = null;
        await signal.save();
        io.emit('signal:changed', { id: signal._id, state: 'red', lat: signal.lat, lng: signal.lng });
      }, 2000);
    }
  }
}

async function cleanupExpiredSignals(io) {
  const now = new Date();
  const expired = await TrafficSignal.find({ state: 'green', resetAt: { $lt: now } });
  for (const signal of expired) {
    signal.state = 'red';
    signal.lockedBy = null;
    signal.lockedByPriority = 0;
    signal.resetAt = null;
    await signal.save();
    io.emit('signal:changed', { id: signal._id, state: 'red', lat: signal.lat, lng: signal.lng });
  }
}

// Randomly change non-preempted signals
async function randomizeSignals(io) {
  const signals = await TrafficSignal.find({ lockedBy: null });
  
  for (const signal of signals) {
    // 30% chance to change
    if (Math.random() < 0.3) {
      const newState = Math.random() < 0.6 ? 'red' : 'green';
      if (signal.state !== newState) {
        signal.state = newState;
        await signal.save();
        io.emit('signal:changed', { id: signal._id, state: newState, lat: signal.lat, lng: signal.lng });
      }
    }
  }
}

module.exports = { runSignalPreemption, cleanupExpiredSignals, calculatePriority, randomizeSignals };
