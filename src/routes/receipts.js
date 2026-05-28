const express = require('express');
const Receipt = require('../models/Receipt');
const Budget = require('../models/Budget');
const authenticate = require('../middleware/authenticate');

const router = express.Router();
let genAI = null;

try {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
} catch (error) {
  console.warn('Google Gemini SDK not available. /api/receipts/analyze will be disabled.', error.message);
}

const parseSafeDate = (dateStr) => {
  if (!dateStr) return undefined;
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? undefined : parsed;
};

// Create receipt from image
router.post('/analyze', authenticate, async (req, res) => {
  try {
    const { imageData, storeName, date } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: 'Image data required' });
    }

    if (!genAI) {
      return res.status(503).json({ error: 'Gemini AI SDK is not installed or configured.' });
    }

    // Convert base64 and clean prefix
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Call Gemini AI to analyze receipt
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const prompt = `Analyze this receipt image and extract the following information in JSON format:
    {
      "storeName": "store name",
      "date": "date if visible",
      "total": numeric total amount,
      "category": "must be one of: Food, Furniture, Stationery, Medicine, BabyAccessories, MobileAccessories, PetItems, BankPayment, Transport, Other",
      "items": [{"name": "item name", "quantity": 1, "price": 0, "category": "category"}],
      "taxAmount": tax amount if visible,
      "paymentMethod": "payment method if visible",
      "confidence": confidence percentage 0-100
    }`;

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: 'image/jpeg'
        }
      },
      prompt
    ]);

    const analysisText = result.response.text();
    const cleanText = analysisText.replace(/```json|```/g, '').trim();
    const analysisData = JSON.parse(cleanText);

    // Create receipt
    const receipt = new Receipt({
      userId: req.userId,
      storeName: storeName || analysisData.storeName,
      date: date ? new Date(date) : (parseSafeDate(analysisData.date) || new Date()),
      total: analysisData.total,
      category: analysisData.category || 'Other',
      items: analysisData.items,
      rawImageData: imageData,
      analysisData: {
        extractedText: analysisText,
        confidence: analysisData.confidence,
        taxAmount: analysisData.taxAmount,
        paymentMethod: analysisData.paymentMethod
      }
    });

    await receipt.save();

    // Update budget spent, remaining, alerts, and categoryBreakdown
    await Budget.updateBudgetForUserAndMonth(req.userId, receipt.date);

    res.status(201).json({
      message: 'Receipt analyzed and saved',
      receipt,
      analysisData
    });
  } catch (error) {
    console.error('Error analyzing receipt:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all receipts for user
router.get('/', authenticate, async (req, res) => {
  try {
    const { month, category, skip = 0, limit = 20 } = req.query;

    const query = { userId: req.userId };

    if (month) {
      const [year, monthNum] = month.split('-');
      const parsedYear = parseInt(year);
      const parsedMonth = parseInt(monthNum);
      const startDate = new Date(Date.UTC(parsedYear, parsedMonth - 1, 1, 0, 0, 0, 0));
      const endDate = new Date(Date.UTC(parsedYear, parsedMonth, 0, 23, 59, 59, 999));
      query.date = { $gte: startDate, $lte: endDate };
    }

    if (category) {
      query.category = category;
    }

    const receipts = await Receipt.find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    const total = await Receipt.countDocuments(query);

    res.json({
      receipts,
      pagination: { total, skip: parseInt(skip), limit: parseInt(limit) }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single receipt
router.get('/:id', authenticate, async (req, res) => {
  try {
    const receipt = await Receipt.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    res.json(receipt);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update receipt
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { category, tags, notes } = req.body;

    const receipt = await Receipt.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { category, tags, notes },
      { new: true }
    );

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    // Recalculate budget category breakdown
    await Budget.updateBudgetForUserAndMonth(req.userId, receipt.date);

    res.json({ message: 'Receipt updated', receipt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete receipt
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const receipt = await Receipt.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    // Recalculate budget spent and category breakdown
    await Budget.updateBudgetForUserAndMonth(req.userId, receipt.date);

    res.json({ message: 'Receipt deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Share receipt
router.post('/:id/share', authenticate, async (req, res) => {
  try {
    const { sharedWith, visibility } = req.body;

    const receipt = await Receipt.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { isShared: true, sharedWith, visibility },
      { new: true }
    );

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    res.json({ message: 'Receipt shared', receipt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
