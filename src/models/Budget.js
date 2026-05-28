const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  month: {
    type: String, // Format: YYYY-MM
    required: true
  },
  budget: {
    type: Number,
    required: true
  },
  spent: {
    type: Number,
    default: 0
  },
  remaining: {
    type: Number,
    default: function() {
      return this.budget - this.spent;
    }
  },
  categoryBreakdown: {
    Food: { type: Number, default: 0 },
    Furniture: { type: Number, default: 0 },
    Stationery: { type: Number, default: 0 },
    Medicine: { type: Number, default: 0 },
    BabyAccessories: { type: Number, default: 0 },
    MobileAccessories: { type: Number, default: 0 },
    PetItems: { type: Number, default: 0 },
    BankPayment: { type: Number, default: 0 },
    Transport: { type: Number, default: 0 },
    Other: { type: Number, default: 0 }
  },
  alerts: {
    budgetExceeded: { type: Boolean, default: false },
    at80Percent: { type: Boolean, default: false },
    at50Percent: { type: Boolean, default: false }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for unique user-month combination
budgetSchema.index({ userId: 1, month: 1 }, { unique: true });

// Pre-save hook to recalculate fields based on receipts
budgetSchema.pre('save', async function(next) {
  try {
    const Receipt = mongoose.models.Receipt || mongoose.model('Receipt');
    const [year, monthNum] = this.month.split('-');
    const parsedYear = parseInt(year);
    const parsedMonth = parseInt(monthNum);

    // Calculate UTC start and end date for the entire month
    const startDate = new Date(Date.UTC(parsedYear, parsedMonth - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(parsedYear, parsedMonth, 0, 23, 59, 59, 999));

    // Find all receipts in this month for this user
    const receipts = await Receipt.find({
      userId: this.userId,
      date: { $gte: startDate, $lte: endDate }
    });

    const breakdown = {
      Food: 0,
      Furniture: 0,
      Stationery: 0,
      Medicine: 0,
      BabyAccessories: 0,
      MobileAccessories: 0,
      PetItems: 0,
      BankPayment: 0,
      Transport: 0,
      Other: 0
    };

    let totalSpent = 0;
    receipts.forEach(receipt => {
      const category = receipt.category || 'Other';
      if (breakdown.hasOwnProperty(category)) {
        breakdown[category] += receipt.total;
      } else {
        breakdown.Other += receipt.total;
      }
      totalSpent += receipt.total;
    });

    this.categoryBreakdown = breakdown;
    this.spent = totalSpent;
    this.remaining = this.budget - totalSpent;
    
    // Recalculate alerts
    this.alerts.budgetExceeded = totalSpent > this.budget;
    this.alerts.at80Percent = totalSpent >= this.budget * 0.8;
    this.alerts.at50Percent = totalSpent >= this.budget * 0.5;
  } catch (err) {
    console.error('Error in Budget pre-save hook:', err);
  }

  next();
});

// Static method to find or create a budget and update it by saving
budgetSchema.statics.updateBudgetForUserAndMonth = async function(userId, dateOrMonthKey) {
  let monthKey;
  if (dateOrMonthKey instanceof Date) {
    monthKey = dateOrMonthKey.toISOString().slice(0, 7);
  } else if (typeof dateOrMonthKey === 'string') {
    monthKey = dateOrMonthKey.slice(0, 7); // Handles both "YYYY-MM" and full ISO strings
  } else {
    monthKey = new Date().toISOString().slice(0, 7);
  }

  const User = mongoose.models.User || mongoose.model('User');
  const user = await User.findById(userId);
  const defaultBudget = user ? user.monthlyBudget : 20000;

  let budget = await this.findOne({ userId, month: monthKey });
  if (!budget) {
    budget = new this({
      userId,
      month: monthKey,
      budget: defaultBudget
    });
  }

  // Save will trigger the pre-save hook which does the calculations
  await budget.save();
  return budget;
};

module.exports = mongoose.model('Budget', budgetSchema);
