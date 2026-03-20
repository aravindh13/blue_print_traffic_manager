const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  capacity: { type: Number, default: 100 },
  specialties: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Hospital', hospitalSchema);
