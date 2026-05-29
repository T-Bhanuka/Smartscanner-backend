# SmartScan Pro Backend - Project Structure

```
Smartscanner-Backend/
├── src/
│   ├── index.js                 # Main application entry point
│   ├── models/                  # MongoDB schemas
│   │   ├── User.js             # User model with auth
│   │   ├── Receipt.js          # Receipt data model
│   │   ├── Gallery.js          # Image vault model
│   │   ├── Budget.js           # Budget tracking model
│   │   └── Social.js           # Social sharing model
│   ├── routes/                  # API route handlers
│   │   ├── auth.js             # Authentication endpoints
│   │   ├── receipts.js         # Receipt management + AI analysis
│   │   ├── gallery.js          # Image management
│   │   ├── budget.js           # Budget tracking
│   │   ├── analytics.js        # Spending insights
│   │   └── social.js           # Social features
│   └── middleware/
│       └── authenticate.js     # JWT verification
├── docker-compose.yml           # Docker container setup
├── Dockerfile                   # Container image
├── package.json                 # Dependencies
├── .env.example                 # Environment template
├── .gitignore                   # Git ignore rules
├── README.md                    # Full documentation
├── QUICK_START.md               # Quick start guide
├── INTEGRATION_GUIDE.md         # Flutter integration
└── PROJECT_STRUCTURE.md         # This file
```

## 📊 Database Models

### User
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  profilePicture: String,
  monthlyBudget: Number,
  currency: String,
  preferences: { notifications, theme },
  followers: [UserId],
  following: [UserId],
  timestamps
}
```

### Receipt
```javascript
{
  userId: UserId,
  storeName: String,
  date: Date,
  total: Number,
  items: [{ name, quantity, price, category }],
  imageUrl: String,
  analysisData: {
    extractedText: String,
    confidence: Number,
    paymentMethod: String,
    taxAmount: Number
  },
  category: String,
  tags: [String],
  notes: String,
  isShared: Boolean,
  sharedWith: [UserId],
  timestamps
}
```

### Gallery
```javascript
{
  userId: UserId,
  imageUrl: String,
  rawImageData: String (Base64),
  thumbnailUrl: String,
  title: String,
  description: String,
  tags: [String],
  receipt: ReceiptId,
  metadata: { width, height, size, format },
  timestamp: Date,
  timestamps
}
```

### Budget
```javascript
{
  userId: UserId,
  month: String (YYYY-MM),
  budget: Number,
  spent: Number,
  remaining: Number,
  categoryBreakdown: {
    groceries: Number,
    dining: Number,
    transport: Number,
    entertainment: Number,
    utilities: Number,
    other: Number
  },
  alerts: {
    budgetExceeded: Boolean,
    at80Percent: Boolean,
    at50Percent: Boolean
  },
  timestamps
}
```

### Social
```javascript
{
  userId: UserId,
  receiptId: ReceiptId,
  description: String,
  likes: [UserId],
  comments: [{
    userId: UserId,
    text: String,
    createdAt: Date
  }],
  visibility: String (private|friends|public),
  timestamps
}
```

## 🔌 API Routes Summary

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | /api/auth/register | ❌ | User registration |
| POST | /api/auth/login | ❌ | User login |
| GET | /api/auth/profile | ✅ | Get user profile |
| PUT | /api/auth/profile | ✅ | Update profile |
| POST | /api/receipts/analyze | ✅ | AI receipt analysis |
| GET | /api/receipts | ✅ | List receipts |
| GET | /api/receipts/:id | ✅ | Get receipt details |
| PUT | /api/receipts/:id | ✅ | Update receipt |
| DELETE | /api/receipts/:id | ✅ | Delete receipt |
| POST | /api/receipts/:id/share | ✅ | Share receipt |
| POST | /api/gallery/upload | ✅ | Upload image |
| GET | /api/gallery | ✅ | List images |
| GET | /api/gallery/:id | ✅ | Get image |
| PUT | /api/gallery/:id | ✅ | Update image |
| DELETE | /api/gallery/:id | ✅ | Delete image |
| GET | /api/budget | ✅ | List all budgets |
| GET | /api/budget/:month | ✅ | Get monthly budget |
| PUT | /api/budget/:month | ✅ | Update budget |
| GET | /api/budget/:month/breakdown | ✅ | Category breakdown |
| GET | /api/analytics/trends | ✅ | Spending trends |
| GET | /api/analytics/insights/categories | ✅ | Category insights |
| GET | /api/analytics/insights/top-stores | ✅ | Top stores |
| GET | /api/analytics/insights/budget-health | ✅ | Budget status |
| POST | /api/social/share | ✅ | Share receipt |
| GET | /api/social/feed | ✅ | Social feed |
| POST | /api/social/:shareId/like | ✅ | Like receipt |
| POST | /api/social/:shareId/comment | ✅ | Comment |
| POST | /api/social/users/:id/follow | ✅ | Follow user |
| GET | /api/social/users/:id | ✅ | User profile |
| DELETE | /api/social/:shareId | ✅ | Delete share |

## 🔐 Authentication Flow

1. User registers with email/password
2. Backend hashes password with bcrypt
3. User logs in, receives JWT token
4. Token included in `Authorization: Bearer <token>` header
5. Middleware validates token on protected routes
6. JWT expires after configured time (default: 7 days)

## 🤖 AI Integration

**Gemini Vision API** is used for receipt analysis:
- Extracts store name, date, items, total
- Calculates confidence scores
- Identifies payment method and taxes
- Automatically categorizes expenses

**Request Flow:**
```
Receipt Image (Base64)
    ↓
Gemini Vision API
    ↓
Extract Data (JSON)
    ↓
Save to MongoDB
    ↓
Return to Client
```

## ☁️ Scalability Features

- **Indexing**: Optimized database queries with compound indexes
- **Pagination**: Limit and skip for large datasets
- **Caching Ready**: Redis integration ready
- **Rate Limiting**: Express rate-limit middleware ready
- **CORS**: Configured for frontend security
- **Error Handling**: Comprehensive error responses

## 🚀 Deployment Options

### Docker (Recommended)
```bash
docker-compose up --build
```

### Heroku
```bash
git push heroku main
```

### AWS EC2
- Push Docker image to ECR
- Deploy with ECS/EKS

### DigitalOcean
- Deploy Docker app

### Railway/Render
- Connect GitHub repo
- Auto-deploy on push

## 📈 Performance Considerations

1. **Database Indexing**: User+Date, Category queries optimized
2. **Pagination**: Default 20 items per page to limit memory
3. **Image Compression**: Recommend client-side compression before upload
4. **Caching Headers**: Ready for CDN integration
5. **Connection Pooling**: MongoDB connection pooling configured

## 🔒 Security Features

- ✅ JWT authentication
- ✅ Bcrypt password hashing
- ✅ CORS protection
- ✅ Helmet.js headers
- ✅ Input validation
- ✅ Rate limiting ready
- ✅ SQL injection prevention (using Mongoose)
- ✅ XSS protection (JSON responses only)

## 📝 Environment Variables Explained

| Variable | Purpose | Example |
|----------|---------|---------|
| PORT | Server port | 3005 |
| NODE_ENV | Environment | development |
| MONGODB_URI | Database URL | mongodb://mongo:27017/smartscanner |
| JWT_SECRET | Token signing | your_secure_key |
| JWT_EXPIRE | Token lifetime | 7d |
| GEMINI_API_KEY | AI service key | sk-xxx... |
| CLOUDINARY_* | Image storage | Your Cloudinary credentials |
| FRONTEND_URL | CORS origin | http://localhost:8080 |

## 📦 Dependencies

### Core
- **express** - Web framework
- **mongoose** - MongoDB ODM
- **dotenv** - Environment variables

### Authentication
- **jsonwebtoken** - JWT tokens
- **bcryptjs** - Password hashing

### AI & Services
- **google-generative-ai** - Gemini AI
- **axios** - HTTP client

### Security & Middleware
- **helmet** - Security headers
- **cors** - Cross-origin requests
- **express-validator** - Input validation
- **express-rate-limit** - Rate limiting

## 🧪 Testing (Ready to Add)

```bash
npm test
```

Structure prepared for:
- Unit tests with Jest
- Integration tests with Supertest
- API endpoint testing

## 📚 Documentation Files

1. **README.md** - Complete documentation
2. **QUICK_START.md** - 5-minute setup
3. **INTEGRATION_GUIDE.md** - Flutter integration
4. **PROJECT_STRUCTURE.md** - This file

## ✨ What's Included

- ✅ Complete REST API
- ✅ User authentication
- ✅ Receipt management
- ✅ AI-powered analysis
- ✅ Budget tracking
- ✅ Analytics & insights
- ✅ Social features
- ✅ Database models
- ✅ Docker setup
- ✅ Error handling
- ✅ Documentation
- ✅ Integration guide

## 🎯 Next Steps

1. Set up environment variables
2. Start with Docker or locally
3. Test API endpoints
4. Integrate with Flutter app
5. Deploy to production

## 💬 Support

Refer to README.md for detailed information on each feature.

---

**Backend is ready to power your SmartScan Pro app!** 🚀
