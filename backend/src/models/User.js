const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  bio: { type: String, default: '' },
  avatar: { type: String, default: '' },
  sports: [{
    sport: { type: mongoose.Schema.Types.ObjectId, ref: 'Sport' },
    skillLevel: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced', 'Pro'] }
  }],
  availability: {
    isAvailableToday: { type: Boolean, default: false },
    lastUpdated: { type: Date, default: Date.now }
  },
  country: { type: String, default: '' },
  city: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
