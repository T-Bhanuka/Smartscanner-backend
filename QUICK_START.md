# SmartScan Pro Backend - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Option 1: Local Development (with Docker)

```bash
# 1. Clone and navigate
cd Smartscanner-Backend

# 2. Copy environment file
cp .env.example .env

# 3. Update .env with your API keys (at minimum GEMINI_API_KEY)

# 4. Start with Docker
docker-compose up --build

# Backend runs at: http://localhost:3005
# MongoDB at: localhost:27017
```

### Option 2: Local Development (without Docker)

```bash
# 1. Install Node.js 18+ and MongoDB

# 2. Clone and navigate
cd Smartscanner-Backend

# 3. Install dependencies
npm install

# 4. Copy and configure environment
cp .env.example .env
# Edit .env with your settings

# 5. Make sure MongoDB is running
mongod

# 6. Start development server
npm run dev

# Backend runs at: http://localhost:3005
```

## 📋 API Endpoints Quick Reference

### Health Check
```
GET /health
```

### Authentication
```
POST /api/auth/register
POST /api/auth/login
GET /api/auth/profile
PUT /api/auth/profile
```

### Receipts
```
POST /api/receipts/analyze          # Analyze receipt image
GET /api/receipts                    # Get all receipts
GET /api/receipts/:id                # Get single receipt
PUT /api/receipts/:id                # Update receipt
DELETE /api/receipts/:id             # Delete receipt
POST /api/receipts/:id/share         # Share receipt
```

### Gallery
```
POST /api/gallery/upload             # Upload image
GET /api/gallery                     # Get all images
GET /api/gallery/:id                 # Get single image
PUT /api/gallery/:id                 # Update image
DELETE /api/gallery/:id              # Delete image
```

### Budget
```
GET /api/budget                      # Get all budgets
GET /api/budget/:month               # Get budget for month
PUT /api/budget/:month               # Update budget
GET /api/budget/:month/breakdown     # Get category breakdown
```

### Analytics
```
GET /api/analytics/trends            # Spending trends
GET /api/analytics/insights/categories
GET /api/analytics/insights/top-stores
GET /api/analytics/insights/budget-health
```

### Social
```
POST /api/social/share               # Share receipt
GET /api/social/feed                 # Get social feed
POST /api/social/:shareId/like       # Like receipt
POST /api/social/:shareId/comment    # Comment on receipt
POST /api/social/users/:id/follow    # Follow user
GET /api/social/users/:id            # Get user profile
DELETE /api/social/:shareId          # Delete share
```

## 🔑 Example API Calls

### Register User
```bash
curl -X POST http://localhost:3005/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepassword"
  }'
```

### Login
```bash
curl -X POST http://localhost:3005/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepassword"
  }'
```

### Analyze Receipt (after getting token)
```bash
curl -X POST http://localhost:3005/api/receipts/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "imageData": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA...",
    "storeName": "My Store"
  }'
```

### Get Budget Health
```bash
curl -X GET "http://localhost:3005/api/analytics/insights/budget-health?month=2024-01" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🔐 Authentication

All endpoints except `/auth/register` and `/auth/login` require authentication:

```
Header: Authorization: Bearer <JWT_TOKEN>
```

## 📚 Additional Resources

- Full API Documentation: See `README.md`
- Integration Guide: See `INTEGRATION_GUIDE.md`
- Environment Setup: See `.env.example`

## 🐛 Troubleshooting

### MongoDB Connection Failed
```bash
# Make sure MongoDB is running
mongod

# Or check docker container
docker ps
docker logs smartscanner_mongo
```

### Port Already in Use
```bash
# Change PORT in .env
# Or kill the process using the port
```

### API Key Issues
```bash
# Check your .env file has correct GEMINI_API_KEY
# Verify the key is active at https://ai.google.dev/
```

## 📦 Deployment

Ready to deploy? Check these guides:
- Heroku: `docs/deployment/heroku.md`
- Docker Hub: Push your image and pull from production
- AWS/Azure/GCP: Use Docker image with cloud databases

## 💡 Next Steps

1. ✅ Backend is running
2. ⬜ Integrate with Flutter app (see INTEGRATION_GUIDE.md)
3. ⬜ Set up cloud database (MongoDB Atlas)
4. ⬜ Deploy to production
5. ⬜ Add push notifications
6. ⬜ Set up email notifications

## 📞 Support

For issues:
1. Check backend logs: `npm run dev` output
2. Check MongoDB: `db.getCollectionNames()`
3. Test API with Postman or curl
4. Review error messages in terminal

---

**Happy coding!** 🎉
