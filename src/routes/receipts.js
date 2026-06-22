const express = require('express');
const Receipt = require('../models/Receipt');
const Budget = require('../models/Budget');
const FamilyConnection = require('../models/FamilyConnection');
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

    // Check if the exact same image was already scanned by this user
    const exactImageDuplicate = await Receipt.findOne({
      userId: req.userId,
      rawImageData: imageData
    });

    if (exactImageDuplicate) {
      return res.status(400).json({ error: 'Duplicate Receipt: This image has already been scanned.' });
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

    const prompt = `Analyze this receipt image and extract the information.
    IMPORTANT: 
    1. First, check if the image is a valid, readable receipt (it should not be too blurry, too dark, or a completely different object/scene like a person, animal, landscape, room, etc.). If it is not a valid receipt, or is completely unreadable/blurry, you MUST set "isValidReceipt" to false and provide a descriptive, friendly error message in English in "errorMessage" explaining the issue (e.g. "The image is too blurry. Please upload a clearer photo." or "This image does not appear to be a receipt. Please upload a receipt image."). Otherwise, set "isValidReceipt" to true and leave "errorMessage" empty.
    2. If the receipt is in Sinhala (or contains Sinhala text), you MUST translate all text (such as the store name, item names, and categories) into English. All text values in the output JSON response must be in English. For example, translate store name 'කීල්ස්' to 'Keells', item 'පාන්' to 'Bread', 'කිරි' to 'Milk', etc.
    
    Extract the following information in JSON format:
    {
      "isValidReceipt": true or false,
      "errorMessage": "Descriptive error message in English if not a valid/readable receipt, otherwise empty",
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

    if (analysisData.isValidReceipt === false) {
      return res.status(400).json({ error: analysisData.errorMessage || 'Invalid or unreadable receipt image. Please upload a clear photo.' });
    }

    const parsedDate = date ? new Date(date) : (parseSafeDate(analysisData.date) || new Date());
    
    // Check if duplicate receipt exists for the same user on the same calendar day with same total and store name
    const startOfDay = new Date(parsedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(parsedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const storeToCheck = storeName || analysisData.storeName;
    if (storeToCheck && analysisData.total !== undefined) {
      const escapedStoreName = storeToCheck.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const duplicateReceipt = await Receipt.findOne({
        userId: req.userId,
        storeName: { $regex: new RegExp('^' + escapedStoreName + '$', 'i') },
        total: analysisData.total,
        date: { $gte: startOfDay, $lte: endOfDay }
      });

      if (duplicateReceipt) {
        return res.status(400).json({ error: 'Duplicate Receipt: A receipt from this store with the same date and total has already been scanned.' });
      }
    }

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

// Analyze bill/receipt from text (e.g. SMS, copy-paste)
router.post('/analyze-text', authenticate, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text content required' });
    }

    if (!genAI) {
      return res.status(503).json({ error: 'Gemini AI SDK is not installed or configured.' });
    }

    // Call Gemini AI using gemini-2.5-flash to analyze text
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const prompt = `Analyze this bill/receipt text and extract the information. Translate any Sinhala or Tamil text to English.

    Raw receipt/bill text:
    """
    ${text}
    """

    IMPORTANT: 
    1. Check if the text contains transaction details, bills, cash withdraw alerts, payment alerts, or bank/credit card transaction messages (e.g., "Your card ending in 1234 was charged Rs. 1500 at Keells", "Dear Customer, you spent Rs. 500 at Pizza Hut", "Cash withdrawal of Rs. 5000", "Paid Dialog Bill of Rs. 1000", etc.). These SMS alerts, payment notices, and bank card transactions are COMPLETELY VALID receipt/bill texts. You MUST set "isValidReceipt" to true for them, extract the store or service provider name (e.g., "Keells", "Pizza Hut", "Dialog Bill", "ATM Cash Withdrawal") as "storeName", extract the date, and extract the transaction amount as "total".
    2. Only set "isValidReceipt" to false if the text is completely random nonsense, a generic chat conversation, or has absolutely no connection to a purchase, bill, or financial transaction. In that case, set "isValidReceipt" to false and provide a descriptive error message in "errorMessage".
    3. Translate all Sinhala or Tamil text values in the output JSON response into English (e.g. translate 'කීල්ස්' to 'Keells', 'දුරකථන බිල' to 'Telephone Bill', etc.).

    Extract the following information in JSON format:
    {
      "isValidReceipt": true or false,
      "errorMessage": "Descriptive error message in English if not a valid/readable receipt text, otherwise empty",
      "storeName": "store name",
      "date": "date if visible",
      "total": numeric total amount,
      "category": "must be one of: Food, Furniture, Stationery, Medicine, BabyAccessories, MobileAccessories, PetItems, BankPayment, Transport, Other",
      "items": [{"name": "item name", "quantity": 1, "price": 0, "category": "category"}],
      "taxAmount": tax amount if visible,
      "paymentMethod": "payment method if visible",
      "confidence": confidence percentage 0-100
    }`;

    const result = await model.generateContent(prompt);
    const analysisText = result.response.text();
    const cleanText = analysisText.replace(/```json|```/g, '').trim();
    const analysisData = JSON.parse(cleanText);

    if (analysisData.isValidReceipt === false) {
      return res.status(400).json({ error: analysisData.errorMessage || 'Invalid or unreadable receipt text.' });
    }

    const parsedDate = parseSafeDate(analysisData.date) || new Date();

    const receipt = new Receipt({
      userId: req.userId,
      storeName: analysisData.storeName || 'Unknown Store',
      date: parsedDate,
      total: analysisData.total || 0,
      category: analysisData.category || 'Other',
      items: analysisData.items || [],
      analysisData: {
        extractedText: text,
        confidence: analysisData.confidence,
        taxAmount: analysisData.taxAmount,
        paymentMethod: analysisData.paymentMethod
      }
    });

    await receipt.save();

    // Update budget spent, remaining, alerts, and categoryBreakdown
    await Budget.updateBudgetForUserAndMonth(req.userId, receipt.date);

    res.status(201).json({
      message: 'Receipt text analyzed and saved',
      receipt,
      analysisData
    });
  } catch (error) {
    console.error('Error analyzing receipt text:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create custom/processed receipt directly
router.post('/', authenticate, async (req, res) => {
  try {
    const { storeName, total, date, category, rawText, items } = req.body;

    if (!storeName || total === undefined) {
      return res.status(400).json({ error: 'storeName and total are required' });
    }

    const parsedDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(parsedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(parsedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const escapedStoreName = storeName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const duplicateReceipt = await Receipt.findOne({
      userId: req.userId,
      storeName: { $regex: new RegExp('^' + escapedStoreName + '$', 'i') },
      total,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (duplicateReceipt) {
      return res.status(400).json({ error: 'Duplicate Receipt: A receipt from this store with the same date and total has already been scanned.' });
    }

    const receipt = new Receipt({
      userId: req.userId,
      storeName,
      total,
      date: date ? new Date(date) : new Date(),
      category: category || 'Other',
      items: items || [],
      analysisData: {
        extractedText: rawText || ''
      }
    });

    await receipt.save();

    // Update budget spent, remaining, alerts, and categoryBreakdown
    await Budget.updateBudgetForUserAndMonth(req.userId, receipt.date);

    res.status(201).json({
      message: 'Receipt saved successfully',
      receipt
    });
  } catch (error) {
    console.error('Error saving receipt:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all receipts for user
router.get('/', authenticate, async (req, res) => {
  try {
    const { month, category, skip = 0, limit = 20, targetUserId } = req.query;

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

    const query = { userId: queryUserId };

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
