const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  rawImageData: String, // Base64 encoded
  thumbnailUrl: String,
  title: String,
  description: String,
  tags: [String],
  receipt: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Receipt'
  },
  metadata: {
    width: Number,
    height: Number,
    size: Number,
    format: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for faster queries
gallerySchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('Gallery', gallerySchema);
