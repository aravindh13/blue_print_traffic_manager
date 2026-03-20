const mongoose = require('mongoose');

const ambulanceSchema = new mongoose.Schema({
  driverName: { type: String, required: true },
  driverEmail: { type: String, required: true, unique: true },
  driverPassword: { type: String, required: true },
  status: { type: String, enum: ['available', 'busy', 'offline'], default: 'available' },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  assignedIncident: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', default: null },
  vehicleNumber: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Ambulance', ambulanceSchema);
