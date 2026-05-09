const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  sportsAllowed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Sport' }]
});

module.exports = mongoose.model('Location', locationSchema);
