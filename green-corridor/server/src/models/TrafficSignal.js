const mongoose = require('mongoose');

const trafficSignalSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  name: { type: String, default: '' },
  state: { type: String, enum: ['red', 'green', 'yellow'], default: 'red' },
  lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Ambulance', default: null },
  lockedByPriority: { type: Number, default: 0 },
  resetAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('TrafficSignal', trafficSignalSchema);
