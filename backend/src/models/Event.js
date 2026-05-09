const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  sport: { type: mongoose.Schema.Types.ObjectId, ref: 'Sport', required: true },
  status: { type: String, enum: ['Pending', 'Matched', 'Confirmed'], default: 'Pending' },
  captain: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pendingMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  time: Date,
  joinCode: { type: String, unique: true, sparse: true },
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
