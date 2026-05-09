const mongoose = require('mongoose');

const sportSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  groupSizeMin: { type: Number, default: 2 },
  groupSizeMax: { type: Number, default: 14 }
});

module.exports = mongoose.model('Sport', sportSchema);
