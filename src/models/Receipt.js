const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  storeName: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  total: {
    type: Number,
    required: true
  },
  items: [{
    name: String,
    quantity: Number,
    price: Number,
    category: String
  }],
  imageUrl: String,
  rawImageData: String, // Base64 encoded image from scanner
  analysisData: {
    extractedText: String,
    confidence: Number,
    paymentMethod: String,
    taxAmount: Number
  },
  category: {
    type: String,
    enum: ['Food', 'Furniture', 'Stationery', 'Medicine', 'BabyAccessories', 'MobileAccessories', 'PetItems', 'BankPayment', 'Transport', 'Other'],
    default: 'Other'
  },
  tags: [String],
  notes: String,
  isShared: {
    type: Boolean,
    default: false
  },
  sharedWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for faster queries
receiptSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Receipt', receiptSchema);
