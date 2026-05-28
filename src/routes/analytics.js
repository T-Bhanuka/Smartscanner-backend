const express = require('express');
const Receipt = require('../models/Receipt');
const Budget = require('../models/Budget');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

// Get spending trends
router.get('/trends', authenticate, async (req, res) => {
  try {
    const { months = 6 } = req.query;

    const startDate = new Date();
    startDate.setDate(1); // Avoid overflow at the end of the month
    startDate.setMonth(startDate.getMonth() - parseInt(months));
    startDate.setHours(0, 0, 0, 0);

    const receipts = await Receipt.find({
      userId: req.userId,
      date: { $gte: startDate }
    });

    const monthlyData = {};

    receipts.forEach(receipt => {
      const monthKey = receipt.date.toISOString().slice(0, 7);
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { total: 0, count: 0, categories: {} };
      }
      monthlyData[monthKey].total += receipt.total;
      monthlyData[monthKey].count += 1;

      const category = receipt.category || 'other';
      monthlyData[monthKey].categories[category] = 
        (monthlyData[monthKey].categories[category] || 0) + receipt.total;
    });

    const trends = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));

    res.json(trends);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get category insights
router.get('/insights/categories', authenticate, async (req, res) => {
  try {
    const { month } = req.query;

    let query = { userId: req.userId };

    if (month) {
      const [year, monthNum] = month.split('-');
      const parsedYear = parseInt(year);
      const parsedMonth = parseInt(monthNum);
      const startDate = new Date(Date.UTC(parsedYear, parsedMonth - 1, 1, 0, 0, 0, 0));
      const endDate = new Date(Date.UTC(parsedYear, parsedMonth, 0, 23, 59, 59, 999));
      query.date = { $gte: startDate, $lte: endDate };
    }

    const receipts = await Receipt.find(query);

    const categories = {
      Food: { total: 0, count: 0, percentage: 0 },
      Furniture: { total: 0, count: 0, percentage: 0 },
      Stationery: { total: 0, count: 0, percentage: 0 },
      Medicine: { total: 0, count: 0, percentage: 0 },
      BabyAccessories: { total: 0, count: 0, percentage: 0 },
      MobileAccessories: { total: 0, count: 0, percentage: 0 },
      PetItems: { total: 0, count: 0, percentage: 0 },
      BankPayment: { total: 0, count: 0, percentage: 0 },
      Transport: { total: 0, count: 0, percentage: 0 },
      Other: { total: 0, count: 0, percentage: 0 }
    };

    let grandTotal = 0;

    receipts.forEach(receipt => {
      const category = receipt.category || 'Other';
      if (categories.hasOwnProperty(category)) {
        categories[category].total += receipt.total;
        categories[category].count += 1;
      } else {
        categories.Other.total += receipt.total;
        categories.Other.count += 1;
      }
      grandTotal += receipt.total;
    });

    // Calculate percentages
    Object.keys(categories).forEach(cat => {
      categories[cat].percentage = grandTotal > 0 
        ? ((categories[cat].total / grandTotal) * 100).toFixed(2) 
        : 0;
    });

    res.json({
      categories,
      grandTotal,
      receiptCount: receipts.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get top spending stores
router.get('/insights/top-stores', authenticate, async (req, res) => {
  try {
    const { limit = 10, month } = req.query;

    let query = { userId: req.userId };

    if (month) {
      const [year, monthNum] = month.split('-');
      const parsedYear = parseInt(year);
      const parsedMonth = parseInt(monthNum);
      const startDate = new Date(Date.UTC(parsedYear, parsedMonth - 1, 1, 0, 0, 0, 0));
      const endDate = new Date(Date.UTC(parsedYear, parsedMonth, 0, 23, 59, 59, 999));
      query.date = { $gte: startDate, $lte: endDate };
    }

    const receipts = await Receipt.find(query);

    const stores = {};
    receipts.forEach(receipt => {
      if (!stores[receipt.storeName]) {
        stores[receipt.storeName] = { total: 0, count: 0 };
      }
      stores[receipt.storeName].total += receipt.total;
      stores[receipt.storeName].count += 1;
    });

    const topStores = Object.entries(stores)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, parseInt(limit));

    res.json(topStores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get budget health
router.get('/insights/budget-health', authenticate, async (req, res) => {
  try {
    const { month } = req.query;

    const currentMonth = month || new Date().toISOString().slice(0, 7);
    const [year, monthNum] = currentMonth.split('-');
    const parsedYear = parseInt(year);
    const parsedMonth = parseInt(monthNum);

    const startDate = new Date(Date.UTC(parsedYear, parsedMonth - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(parsedYear, parsedMonth, 0, 23, 59, 59, 999));

    const receipts = await Receipt.find({
      userId: req.userId,
      date: { $gte: startDate, $lte: endDate }
    });

    const spent = receipts.reduce((sum, r) => sum + r.total, 0);
    const budget = await Budget.findOne({ userId: req.userId, month: currentMonth });
    const budgetAmount = budget?.budget || 20000;

    const health = {
      budget: budgetAmount,
      spent,
      remaining: budgetAmount - spent,
      percentageUsed: ((spent / budgetAmount) * 100).toFixed(2),
      status: spent > budgetAmount ? 'exceeded' : spent / budgetAmount > 0.8 ? 'warning' : 'good'
    };

    res.json(health);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
