const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  lastLoginAt: { type: Date, default: null },
  lastActiveAt: { type: Date, default: null },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('User', UserSchema);
