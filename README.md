# SmartScan Pro - Backend API

A robust Node.js/Express REST API backend for the SmartScan Pro receipt scanner application with MongoDB database, Gemini AI integration, and comprehensive features including user authentication, receipt analysis, budget tracking, and social sharing.

## Features

- **User Authentication**: JWT-based authentication with secure password hashing
- **Receipt Management**: Create, read, update, delete receipts with Gemini AI-powered analysis
- **Receipt Analysis**: Automatic extraction of receipt data using Google Gemini AI vision
- **Gallery Management**: Cloud-based image storage and organization
- **Budget Tracking**: Monthly budget management with spending breakdown by category
- **Analytics**: Comprehensive spending insights, trends, and visualizations
- **Social Features**: Share receipts, follow users, like, and comment on shared items
- **Cloud Storage**: Integration-ready for Cloudinary image hosting

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB
- **AI**: Google Generative AI (Gemini)
- **Authentication**: JWT
- **Containerization**: Docker & Docker Compose

## Prerequisites

- Node.js 18+ and npm
- MongoDB (or use Docker)
- Docker and Docker Compose (optional)
- API Keys for:
  - Google Gemini AI
  - Cloudinary (for image storage)

## Installation

### Local Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd Smartscanner-Backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

4. Update `.env` with your API keys and configuration:
```
PORT=3005
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/smartscanner
JWT_SECRET=your_secure_secret_key
GEMINI_API_KEY=your_gemini_api_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
FRONTEND_URL=http://localhost:8080
```

5. Start MongoDB (if running locally):
```bash
mongod
```

6. Run the server:
```bash
npm run dev
```

The API will be available at `http://localhost:3005`

### Docker Setup

1. Create `.env` file with required configuration

2. Build and run with Docker Compose:
```bash
docker-compose up --build
```

The API will be available at `http://localhost:3005` and MongoDB at `localhost:27017`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Receipts
- `POST /api/receipts/analyze` - Analyze receipt image with AI
- `GET /api/receipts` - Get all receipts
- `GET /api/receipts/:id` - Get single receipt
- `PUT /api/receipts/:id` - Update receipt
- `DELETE /api/receipts/:id` - Delete receipt
- `POST /api/receipts/:id/share` - Share receipt

### Gallery
- `POST /api/gallery/upload` - Upload image
- `GET /api/gallery` - Get all gallery images
- `GET /api/gallery/:id` - Get single image
- `PUT /api/gallery/:id` - Update image metadata
- `DELETE /api/gallery/:id` - Delete image

### Budget
- `GET /api/budget` - Get all budgets
- `GET /api/budget/:month` - Get budget for specific month
- `PUT /api/budget/:month` - Update monthly budget
- `GET /api/budget/:month/breakdown` - Get spending breakdown by category

### Analytics
- `GET /api/analytics/trends` - Get spending trends
- `GET /api/analytics/insights/categories` - Get category insights
- `GET /api/analytics/insights/top-stores` - Get top spending stores
- `GET /api/analytics/insights/budget-health` - Get budget health status

### Social
- `POST /api/social/share` - Share a receipt
- `GET /api/social/feed` - Get social feed
- `POST /api/social/:shareId/like` - Like a shared receipt
- `POST /api/social/:shareId/comment` - Comment on shared receipt
- `POST /api/social/users/:targetUserId/follow` - Follow a user
- `GET /api/social/users/:userId` - Get user profile
- `DELETE /api/social/:shareId` - Delete share

## Database Models

### User
- User authentication and profile information
- Budget preferences
- Social connections (followers/following)

### Receipt
- Receipt information and items
- AI analysis results
- Categorization and tags
- Sharing settings

### Gallery
- Image storage and metadata
- Tag organization
- Link to receipts

### Budget
- Monthly budget tracking
- Spending by category
- Budget alerts and status

### Social
- Shared receipts
- Likes and comments
- Visibility settings

## Environment Variables

```
PORT                      # Server port (default: 3005)
NODE_ENV                  # Environment (development/production)
MONGODB_URI               # MongoDB connection string
JWT_SECRET                # JWT signing secret
JWT_EXPIRE                # JWT expiration time (default: 7d)
GEMINI_API_KEY            # Google Gemini API key
CLOUDINARY_CLOUD_NAME     # Cloudinary cloud name
CLOUDINARY_API_KEY        # Cloudinary API key
CLOUDINARY_API_SECRET     # Cloudinary API secret
FRONTEND_URL              # Frontend URL for CORS
```

## Development

### Running in Development Mode
```bash
npm run dev
```

### Running Tests
```bash
npm test
```

### Health Check
```bash
GET /health
```

## Security Features

- JWT authentication with expiration
- Bcrypt password hashing
- CORS protection
- Helmet.js for HTTP headers
- Rate limiting ready
- Input validation

## Integration with Flutter App

Update your Flutter app's API configuration:

```dart
const String apiBaseUrl = 'http://your-backend-url:3005/api';
```

### Example API Call:
```dart
Future<void> loginUser(String email, String password) async {
  final response = await http.post(
    Uri.parse('$apiBaseUrl/auth/login'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({'email': email, 'password': password}),
  );

  if (response.statusCode == 200) {
    final data = jsonDecode(response.body);
    // Save token
    await StorageService.saveToken(data['token']);
  }
}
```

## Deployment

### Heroku
```bash
heroku create your-app-name
heroku config:set MONGODB_URI=your_mongodb_uri
git push heroku main
```

### AWS/Azure/GCP
- Use Docker image with Docker Compose
- Set up environment variables in cloud console
- Configure MongoDB Atlas for cloud database
- Set up CDN for image serving

## API Response Format

All responses follow this format:

### Success (2xx)
```json
{
  "message": "Operation successful",
  "data": { ... }
}
```

### Error (4xx, 5xx)
```json
{
  "error": {
    "message": "Error description",
    "status": 400
  }
}
```

## Error Handling

The API includes comprehensive error handling:
- Invalid input validation
- Authentication/authorization checks
- Database operation error handling
- AI service error handling
- Proper HTTP status codes

## Contributing

1. Create a new branch for features
2. Follow the existing code structure
3. Add tests for new features
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please create an issue in the repository.
