const express = require('express');
const Budget = require('../models/Budget');
const Receipt = require('../models/Receipt');
const FamilyConnection = require('../models/FamilyConnection');
const User = require('../models/User');
const authenticate = require('../middleware/authenticate');

const router = express.Router();
let genAI = null;

try {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
} catch (error) {
  console.warn('Google Gemini SDK not available. /api/budget/ai-advice will be disabled.', error.message);
}

// Get AI advice on spending habits and budget survival tips
router.get('/ai-advice', authenticate, async (req, res) => {
  try {
    if (!genAI) {
      return res.status(503).json({ error: 'Gemini AI SDK is not installed or configured.' });
    }

    const { targetUserId } = req.query;
    let queryUserId = req.userId;

    if (targetUserId) {
      const connected = await FamilyConnection.findOne({
        status: 'accepted',
        $or: [
          { requesterId: req.userId, receiverId: targetUserId },
          { requesterId: targetUserId, receiverId: req.userId }
        ]
      });

      if (!connected) {
        return res.status(403).json({ error: 'Access denied: You are not connected with this user' });
      }

      queryUserId = targetUserId;
    }

    // Determine current month YYYY-MM
    const now = new Date();
    const year = now.getFullYear();
    const monthNum = String(now.getMonth() + 1).padStart(2, '0');
    const currentMonth = `${year}-${monthNum}`;

    // Get current month's budget
    let budgetObj = await Budget.findOne({ userId: queryUserId, month: currentMonth });
    let budgetAmount = 20000;
    if (budgetObj) {
      budgetAmount = budgetObj.budget;
    } else {
      const user = await User.findById(queryUserId);
      if (user) {
        budgetAmount = user.monthlyBudget;
      }
    }

    // Get spending breakdown for all receipts of that user (matching frontend receipts list)
    const receipts = await Receipt.find({ userId: queryUserId });

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

    // Call Gemini AI
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `The user has a monthly budget of Rs. ${budgetAmount}, and they have already spent Rs. ${totalSpent}. Here is their spending breakdown by category: ${JSON.stringify(breakdown)}. They have reached 80% of their budget.
Act as a friendly, sharp, and professional financial advisor.
Provide a highly summarized, compact survival plan for the remaining 20% of their budget.
Strictly format your response as follows:
- A brief 1-line encouraging intro containing their remaining budget amount.
- 3 short, actionable, and bulleted tips (maximum 2 sentences per tip). Use a relevant emoji at the start of each tip.
- Bold key terms, numbers, and category names using markdown double asterisks (e.g., **Rs. 500**, **Food**, **Stop buying**).
- Keep it extremely clean, direct, and compact. Do not write a long introduction or conclusion.`;

    const result = await model.generateContent(prompt);
    const advice = result.response.text();

    res.json({ advice });
  } catch (error) {
    console.error('Error generating AI advice:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get budget for specific month
router.get('/:month', authenticate, async (req, res) => {
  try {
    const { month } = req.params;
    const { targetUserId } = req.query;

    let queryUserId = req.userId;

    if (targetUserId) {
      const connected = await FamilyConnection.findOne({
        status: 'accepted',
        $or: [
          { requesterId: req.userId, receiverId: targetUserId },
          { requesterId: targetUserId, receiverId: req.userId }
        ]
      });

      if (!connected) {
        return res.status(403).json({ error: 'Access denied: You are not connected with this user' });
      }

      queryUserId = targetUserId;
    }

    let budget = await Budget.findOne({ userId: queryUserId, month });

    if (!budget) {
      // Create default budget if not exists, fetching from user settings if available
      const targetUser = await User.findById(queryUserId);
      const defaultBudget = targetUser ? targetUser.monthlyBudget : 20000;

      budget = new Budget({
        userId: queryUserId,
        month,
        budget: defaultBudget
      });
      await budget.save();
    }

    res.json(budget);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update monthly budget
router.put('/:month', authenticate, async (req, res) => {
  try {
    const { month } = req.params;
    const { budget } = req.body;

    let monthBudget = await Budget.findOne({ userId: req.userId, month });
    if (!monthBudget) {
      monthBudget = new Budget({
        userId: req.userId,
        month,
        budget
      });
    } else {
      monthBudget.budget = budget;
    }
    await monthBudget.save();

    res.json({ message: 'Budget updated', budget: monthBudget });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get budget summary for all months
router.get('/', authenticate, async (req, res) => {
  try {
    const { targetUserId } = req.query;

    let queryUserId = req.userId;

    if (targetUserId) {
      const connected = await FamilyConnection.findOne({
        status: 'accepted',
        $or: [
          { requesterId: req.userId, receiverId: targetUserId },
          { requesterId: targetUserId, receiverId: req.userId }
        ]
      });

      if (!connected) {
        return res.status(403).json({ error: 'Access denied: You are not connected with this user' });
      }

      queryUserId = targetUserId;
    }

    const budgets = await Budget.find({ userId: queryUserId })
      .sort({ month: -1 });

    res.json(budgets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get spending breakdown by category for a month
router.get('/:month/breakdown', authenticate, async (req, res) => {
  try {
    const { month } = req.params;
    const { targetUserId } = req.query;

    let queryUserId = req.userId;

    if (targetUserId) {
      const connected = await FamilyConnection.findOne({
        status: 'accepted',
        $or: [
          { requesterId: req.userId, receiverId: targetUserId },
          { requesterId: targetUserId, receiverId: req.userId }
        ]
      });

      if (!connected) {
        return res.status(403).json({ error: 'Access denied: You are not connected with this user' });
      }

      queryUserId = targetUserId;
    }

    const [year, monthNum] = month.split('-');
    const parsedYear = parseInt(year);
    const parsedMonth = parseInt(monthNum);

    const startDate = new Date(Date.UTC(parsedYear, parsedMonth - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(parsedYear, parsedMonth, 0, 23, 59, 59, 999));

    const receipts = await Receipt.find({
      userId: queryUserId,
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

    receipts.forEach(receipt => {
      const category = receipt.category || 'Other';
      if (breakdown.hasOwnProperty(category)) {
        breakdown[category] += receipt.total;
      } else {
        breakdown.Other += receipt.total;
      }
    });

    const budget = await Budget.findOne({ userId: queryUserId, month });

    res.json({
      month,
      breakdown,
      total: receipts.reduce((sum, r) => sum + r.total, 0),
      budget: budget?.budget || 20000,
      itemCount: receipts.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
