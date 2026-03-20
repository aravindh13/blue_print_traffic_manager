const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  address: { type: String, default: '' },
  severity: { type: Number, min: 1, max: 5, required: true },
  status: { type: String, enum: ['open', 'assigned', 'enroute', 'resolved'], default: 'open' },
  assignedAmbulance: { type: mongoose.Schema.Types.ObjectId, ref: 'Ambulance', default: null },
  route: { type: [[Number]], default: [] }, // [[lat, lng], ...]
  recommendedHospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', default: null },
  description: { type: String, default: '' },
  resolvedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Incident', incidentSchema);
