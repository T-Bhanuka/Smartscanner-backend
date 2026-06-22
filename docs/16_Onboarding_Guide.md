# 16. Developer Onboarding Guide - SmartScan Pro

Welcome to the team! This onboarding guide contains tutorials to help you get familiar with the codebase by implementing common extensions.

---

## TUTORIAL 1: How to Add a New API Endpoint

Let's add a new endpoint to fetch a receipt's item list: `GET /api/receipts/:id/items`.

### Step 1: Add the route handler in [src/routes/receipts.js](file:///c:/Flutter/flutter_windows_3.41.9-stable/Smartscanner-backend-main/Smartscanner-backend-main/src/routes/receipts.js)
```javascript
// Get items list for a specific receipt
router.get('/:id/items', authenticate, async (req, res) => {
  try {
    const receipt = await Receipt.findOne({ _id: req.params.id, userId: req.userId });
    
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }
    
    res.json({ items: receipt.items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## TUTORIAL 2: How to Add a New Database Model

Let's add a new model to track custom tags defined by users: `Tag`.

### Step 1: Create a schema file at `src/models/Tag.js`
```javascript
const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  colorCode: {
    type: String,
    default: '#3498db'
  }
}, { timestamps: true });

// Ensure users cannot create duplicate tags
tagSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Tag', tagSchema);
```

---

## TUTORIAL 3: How to Add a New Middleware

Let's build a middleware to validate request bodies for manual receipt creation.

### Step 1: Create a file at `src/middleware/validateReceipt.js`
```javascript
const validateReceipt = (req, res, next) => {
  const { storeName, total } = req.body;
  
  if (!storeName || typeof storeName !== 'string' || storeName.trim() === '') {
    return res.status(400).json({ error: 'Valid storeName is required' });
  }
  
  if (total === undefined || typeof total !== 'number' || total < 0) {
    return res.status(400).json({ error: 'Valid positive total amount is required' });
  }
  
  next();
};

module.exports = validateReceipt;
```

### Step 2: Use the middleware in [src/routes/receipts.js](file:///c:/Flutter/flutter_windows_3.41.9-stable/Smartscanner-backend-main/Smartscanner-backend-main/src/routes/receipts.js)
```javascript
const validateReceipt = require('../middleware/validateReceipt');

// Insert the middleware into the route chain:
router.post('/', authenticate, validateReceipt, async (req, res) => {
  // Business logic here...
});
```

---

## TUTORIAL 4: How to Add a New Receipt Category

Let's add a new category: `Entertainment`.

### Step 1: Update the enum list in [src/models/Receipt.js](file:///c:/Flutter/flutter_windows_3.41.9-stable/Smartscanner-backend-main/Smartscanner-backend-main/src/models/Receipt.js)
```javascript
category: {
  type: String,
  enum: ['Food', 'Furniture', 'Stationery', 'Medicine', 'BabyAccessories', 'MobileAccessories', 'PetItems', 'BankPayment', 'Transport', 'Other', 'Entertainment'], // Added 'Entertainment'
  default: 'Other'
}
```

### Step 2: Add the category fields in [src/models/Budget.js](file:///c:/Flutter/flutter_windows_3.41.9-stable/Smartscanner-backend-main/Smartscanner-backend-main/src/models/Budget.js)
```javascript
categoryBreakdown: {
  Food: { type: Number, default: 0 },
  // ...other categories...
  Entertainment: { type: Number, default: 0 } // Added 'Entertainment'
}
```

### Step 3: Add the category to the budget pre-save hook breakdown in [src/models/Budget.js](file:///c:/Flutter/flutter_windows_3.41.9-stable/Smartscanner-backend-main/Smartscanner-backend-main/src/models/Budget.js)
```javascript
const breakdown = {
  Food: 0,
  // ...other categories...
  Entertainment: 0 // Added 'Entertainment'
};
```

### Step 4: Add the category to the breakdown initializer in [src/routes/budget.js](file:///c:/Flutter/flutter_windows_3.41.9-stable/Smartscanner-backend-main/Smartscanner-backend-main/src/routes/budget.js)
```javascript
const breakdown = {
  Food: 0,
  // ...other categories...
  Entertainment: 0 // Added 'Entertainment'
};
```

### Step 5: Update the prompt in [src/routes/receipts.js](file:///c:/Flutter/flutter_windows_3.41.9-stable/Smartscanner-backend-main/Smartscanner-backend-main/src/routes/receipts.js)
```javascript
// Update category options in prompt so Gemini is aware of the new category:
"category": "must be one of: Food, Furniture, Stationery, Medicine, BabyAccessories, MobileAccessories, PetItems, BankPayment, Transport, Other, Entertainment"
```
