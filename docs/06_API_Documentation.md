# 06. API Documentation - SmartScan Pro

This document provides API documentation for all endpoints exposed by the SmartScan Pro backend.

All endpoints (except signup and login) require an `Authorization: Bearer <JWT_TOKEN>` header.

---

## 1. Authentication Router (`/api/auth`)

### POST `/api/auth/register`
* **Purpose**: Registers a new user account and returns a JWT token.
* **Authentication Required**: ❌
* **Request Body**:
  ```json
  {
    "name": "string (required)",
    "email": "string (required, unique)",
    "password": "string (required, minlength: 6)",
    "monthlyBudget": "number (optional, default: 20000)"
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "message": "User registered successfully",
    "token": "eyJhbGciOi...",
    "user": { "id": "60d5ec4b1a2c3d4e5f6g7h8i", "name": "Jane Doe", "email": "jane@example.com" }
  }
  ```
* **Error Responses**:
  * **400 Bad Request**: Missing fields or user already exists.
* **Example Request**:
  ```bash
  curl -X POST http://localhost:3005/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"name": "Jane Doe", "email": "jane@example.com", "password": "securepassword"}'
  ```

---

### POST `/api/auth/login`
* **Purpose**: Authenticates user credentials and returns a JWT token.
* **Authentication Required**: ❌
* **Request Body**:
  ```json
  {
    "email": "string (required)",
    "password": "string (required)"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "message": "Login successful",
    "token": "eyJhbGciOi...",
    "user": { "id": "60d5ec4b1a2c3d4e5f6g7h8i", "name": "Jane Doe", "email": "jane@example.com", "monthlyBudget": 20000 }
  }
  ```
* **Error Responses**:
  * **401 Unauthorized**: User email not found or password verification failed.
* **Example Request**:
  ```bash
  curl -X POST http://localhost:3005/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "jane@example.com", "password": "securepassword"}'
  ```

---

### GET `/api/auth/profile`
* **Purpose**: Retrieves the profile configuration details of the authenticated user.
* **Authentication Required**: ✅
* **Success Response (200 OK)**: Returns the user profile with populated social references.
* **Error Responses**:
  * **401 Unauthorized**: Invalid or missing JWT token.
  * **404 Not Found**: User not found.
* **Example Request**:
  ```bash
  curl -X GET http://localhost:3005/api/auth/profile \
    -H "Authorization: Bearer eyJhbGciOi..."
  ```

---

### PUT `/api/auth/profile`
* **Purpose**: Updates profile configuration settings.
* **Authentication Required**: ✅
* **Request Body**:
  ```json
  {
    "name": "string (optional)",
    "monthlyBudget": "number (optional)",
    "currency": "string (optional)",
    "preferences": {
      "notifications": "boolean (optional)",
      "theme": "string (optional)"
    }
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "message": "Profile updated",
    "user": { "_id": "60d5ec4b1a2c3d4e5f6g7h8i", "name": "Jane Doe Updated", "monthlyBudget": 35000 }
  }
  ```
* **Example Request**:
  ```bash
  curl -X PUT http://localhost:3005/api/auth/profile \
    -H "Authorization: Bearer eyJhbGciOi..." \
    -H "Content-Type: application/json" \
    -d '{"monthlyBudget": 35000}'
  ```

---

## 2. Receipts Router (`/api/receipts`)

### POST `/api/receipts/analyze`
* **Purpose**: Sends a Base64 image payload to Gemini AI for OCR parsing and category classification, saves the receipt record, and updates the user's monthly budget.
* **Authentication Required**: ✅
* **Request Body**:
  ```json
  {
    "imageData": "string (required, Base64 image payload)",
    "storeName": "string (optional)",
    "date": "string (optional, ISO format)"
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "message": "Receipt analyzed and saved",
    "receipt": { "_id": "60d5ec4b1a2c3d4e5f6g7h8j", "storeName": "Keells Supermarket", "total": 4500, "category": "Food" }
  }
  ```
* **Error Responses**:
  * **400 Bad Request**: Invalid receipt image or missing `imageData`.
  * **503 Service Unavailable**: Gemini AI API is unavailable.
* **Example Request**:
  ```bash
  curl -X POST http://localhost:3005/api/receipts/analyze \
    -H "Authorization: Bearer eyJhbGciOi..." \
    -H "Content-Type: application/json" \
    -d '{"imageData": "data:image/jpeg;base64,/9j/4AAQ..."}'
  ```

---

### POST `/api/receipts/`
* **Purpose**: Creates a manual receipt entry in MongoDB and triggers a monthly budget recalculation.
* **Authentication Required**: ✅
* **Request Body**:
  ```json
  {
    "storeName": "string (required)",
    "total": "number (required)",
    "date": "string (optional)",
    "category": "string (optional, default: 'Other')",
    "rawText": "string (optional)",
    "items": "array (optional)"
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "message": "Receipt saved successfully",
    "receipt": { "_id": "60d5ec4b1a2c3d4e5f6g7h8j", "storeName": "Cargills Food City", "total": 3200, "category": "Food" }
  }
  ```
* **Example Request**:
  ```bash
  curl -X POST http://localhost:3005/api/receipts/ \
    -H "Authorization: Bearer eyJhbGciOi..." \
    -H "Content-Type: application/json" \
    -d '{"storeName": "Cargills Food City", "total": 3200, "category": "Food"}'
  ```

---

### GET `/api/receipts/`
* **Purpose**: Retrieves a user's paginated receipts (filtered by month or category).
* **Authentication Required**: ✅
* **Query Parameters**:
  * `month` (string, optional, format: `YYYY-MM`): Filter by month.
  * `category` (string, optional): Filter by category.
  * `skip` (number, optional, default: 0): Pagination offset.
  * `limit` (number, optional, default: 20): Page size limit.
* **Success Response (200 OK)**:
  ```json
  {
    "receipts": [ ... ],
    "pagination": { "total": 45, "skip": 0, "limit": 20 }
  }
  ```
* **Example Request**:
  ```bash
  curl -X GET "http://localhost:3005/api/receipts?month=2026-06&limit=5" \
    -H "Authorization: Bearer eyJhbGciOi..."
  ```

---

### GET `/api/receipts/:id`
* **Purpose**: Fetches details for a single receipt by ID.
* **Authentication Required**: ✅
* **Request Parameters**:
  * `id` (string, required): Receipt document ID.
* **Success Response (200 OK)**: Returns the receipt details.
* **Example Request**:
  ```bash
  curl -X GET http://localhost:3005/api/receipts/60d5ec4b1a2c3d4e5f6g7h8j \
    -H "Authorization: Bearer eyJhbGciOi..."
  ```

---

### PUT `/api/receipts/:id`
* **Purpose**: Updates the category, tags, or notes for a receipt, and triggers a monthly budget recalculation.
* **Authentication Required**: ✅
* **Request Body**:
  ```json
  {
    "category": "string (optional)",
    "tags": "array of strings (optional)",
    "notes": "string (optional)"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "message": "Receipt updated",
    "receipt": { "_id": "60d5ec4b1a2c3d4e5f6g7h8j", "category": "Transport" }
  }
  ```
* **Example Request**:
  ```bash
  curl -X PUT http://localhost:3005/api/receipts/60d5ec4b1a2c3d4e5f6g7h8j \
    -H "Authorization: Bearer eyJhbGciOi..." \
    -H "Content-Type: application/json" \
    -d '{"category": "Transport"}'
  ```

---

### DELETE `/api/receipts/:id`
* **Purpose**: Deletes a receipt and triggers a monthly budget recalculation.
* **Authentication Required**: ✅
* **Request Parameters**:
  * `id` (string, required): Receipt document ID.
* **Success Response (200 OK)**:
  ```json
  { "message": "Receipt deleted" }
  ```
* **Example Request**:
  ```bash
  curl -X DELETE http://localhost:3005/api/receipts/60d5ec4b1a2c3d4e5f6g7h8j \
    -H "Authorization: Bearer eyJhbGciOi..."
  ```

---

## 3. Budget Router (`/api/budget`)

### GET `/api/budget/:month`
* **Purpose**: Retrieves the budget configuration, spending totals, breakdowns, and alert flags for a specific month (creates a default monthly budget if one doesn't exist).
* **Authentication Required**: ✅
* **Request Parameters**:
  * `month` (string, required): Format `YYYY-MM`.
* **Success Response (200 OK)**:
  ```json
  {
    "_id": "60d5ec4b1a2c3d4e5f6g7h8k",
    "month": "2026-06",
    "budget": 20000,
    "spent": 7700,
    "remaining": 12300,
    "categoryBreakdown": { "Food": 4500, "Transport": 3200 },
    "alerts": { "budgetExceeded": false, "at80Percent": false, "at50Percent": true }
  }
  ```
* **Example Request**:
  ```bash
  curl -X GET http://localhost:3005/api/budget/2026-06 \
    -H "Authorization: Bearer eyJhbGciOi..."
  ```

---

### PUT `/api/budget/:month`
* **Purpose**: Sets or updates the monthly budget limit.
* **Authentication Required**: ✅
* **Request Body**:
  ```json
  {
    "budget": "number (required)"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "message": "Budget updated",
    "budget": { "month": "2026-06", "budget": 40000 }
  }
  ```
* **Example Request**:
  ```bash
  curl -X PUT http://localhost:3005/api/budget/2026-06 \
    -H "Authorization: Bearer eyJhbGciOi..." \
    -H "Content-Type: application/json" \
    -d '{"budget": 40000}'
  ```

---

### GET `/api/budget/`
* **Purpose**: Retrieves a history of all monthly budgets for the user.
* **Authentication Required**: ✅
* **Success Response (200 OK)**: Returns a list of all monthly budget documents.
* **Example Request**:
  ```bash
  curl -X GET http://localhost:3005/api/budget/ \
    -H "Authorization: Bearer eyJhbGciOi..."
  ```

---

### GET `/api/budget/:month/breakdown`
* **Purpose**: Calculates and returns the spending breakdown by category dynamically by summing receipts in that month.
* **Authentication Required**: ✅
* **Request Parameters**:
  * `month` (string, required): Format `YYYY-MM`.
* **Success Response (200 OK)**:
  ```json
  {
    "month": "2026-06",
    "breakdown": { "Food": 4500, "Transport": 3200 },
    "total": 7700,
    "budget": 20000,
    "itemCount": 2
  }
  ```
* **Example Request**:
  ```bash
  curl -X GET http://localhost:3005/api/budget/2026-06/breakdown \
    -H "Authorization: Bearer eyJhbGciOi..."
  ```

---

## 4. Analytics Router (`/api/analytics`)

### GET `/api/analytics/trends`
* **Purpose**: Aggregates spending totals and category distributions over a rolling monthly window.
* **Authentication Required**: ✅
* **Query Parameters**:
  * `months` (number, optional, default: 6): Aggregate trends window.
* **Success Response (200 OK)**:
  ```json
  [
    { "month": "2026-06", "total": 7700, "count": 2, "categories": { "Food": 4500, "Transport": 3200 } }
  ]
  ```
* **Example Request**:
  ```bash
  curl -X GET "http://localhost:3005/api/analytics/trends?months=3" \
    -H "Authorization: Bearer eyJhbGciOi..."
  ```

---

### GET `/api/analytics/insights/categories`
* **Purpose**: Calculates aggregate spending and percentage breakdown by category for a specific month.
* **Authentication Required**: ✅
* **Query Parameters**:
  * `month` (string, optional): Format `YYYY-MM`.
* **Success Response (200 OK)**:
  ```json
  {
    "categories": {
      "Food": { "total": 4500, "count": 1, "percentage": "58.44" },
      "Transport": { "total": 3200, "count": 1, "percentage": "41.56" }
    },
    "grandTotal": 7700,
    "receiptCount": 2
  }
  ```
* **Example Request**:
  ```bash
  curl -X GET "http://localhost:3005/api/analytics/insights/categories?month=2026-06" \
    -H "Authorization: Bearer eyJhbGciOi..."
  ```

---

### GET `/api/analytics/insights/top-stores`
* **Purpose**: Retrieves a user's top vendor stores by transaction volume.
* **Authentication Required**: ✅
* **Query Parameters**:
  * `month` (string, optional): Format `YYYY-MM`.
  * `limit` (number, optional, default: 10): List result limit.
* **Success Response (200 OK)**:
  ```json
  [
    { "name": "Keells Supermarket", "total": 4500, "count": 1 }
  ]
  ```
* **Example Request**:
  ```bash
  curl -X GET "http://localhost:3005/api/analytics/insights/top-stores?limit=5" \
    -H "Authorization: Bearer eyJhbGciOi..."
  ```

---

### GET `/api/analytics/insights/budget-health`
* **Purpose**: Returns spending-to-budget ratios and a warnings status flag.
* **Authentication Required**: ✅
* **Query Parameters**:
  * `month` (string, optional): Format `YYYY-MM`.
* **Success Response (200 OK)**:
  ```json
  { "budget": 20000, "spent": 7700, "remaining": 12300, "percentageUsed": "38.50", "status": "good" }
  ```
* **Example Request**:
  ```bash
  curl -X GET "http://localhost:3005/api/analytics/insights/budget-health?month=2026-06" \
    -H "Authorization: Bearer eyJhbGciOi..."
  ```

---

## 5. Social Router (`/api/social`)

### POST `/api/social/share`
* **Purpose**: Publishes a receipt to the social feed.
* **Authentication Required**: ✅
* **Request Body**:
  ```json
  {
    "receiptId": "string (required)",
    "description": "string (optional)",
    "visibility": "string (optional, public / friends / private)"
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "message": "Receipt shared",
    "share": { "_id": "60d5ec4b1a2c3d4e5f6g7h8l", "receiptId": "60d5ec4b1a2c3d4e5f6g7h8j", "visibility": "public" }
  }
  ```
* **Example Request**:
  ```bash
  curl -X POST http://localhost:3005/api/social/share \
    -H "Authorization: Bearer eyJhbGciOi..." \
    -H "Content-Type: application/json" \
    -d '{"receiptId": "60d5ec4b1a2c3d4e5f6g7h8j", "visibility": "public"}'
  ```

---

### GET `/api/social/feed`
* **Purpose**: Retrieves a timeline feed of posts visible to the user.
* **Authentication Required**: ✅
* **Success Response (200 OK)**: Returns an array of feed posts (populated with user and receipt details).
* **Example Request**:
  ```bash
  curl -X GET http://localhost:3005/api/social/feed \
    -H "Authorization: Bearer eyJhbGciOi..."
  ```

---

### POST `/api/social/:shareId/like`
* **Purpose**: Likes or unlikes a shared post.
* **Authentication Required**: ✅
* **Request Parameters**:
  * `shareId` (string, required): Social post ID.
* **Success Response (200 OK)**:
  ```json
  { "message": "Receipt liked", "share": { "_id": "60d5ec4b1a2c3d4e5f6g7h8l", "likes": [ ... ] } }
  ```
* **Example Request**:
  ```bash
  curl -X POST http://localhost:3005/api/social/60d5ec4b1a2c3d4e5f6g7h8l/like \
    -H "Authorization: Bearer eyJhbGciOi..."
  ```

---

### POST `/api/social/:shareId/comment`
* **Purpose**: Appends a text comment to a shared post.
* **Authentication Required**: ✅
* **Request Parameters**:
  * `shareId` (string, required): Social post ID.
* **Request Body**:
  ```json
  {
    "text": "string (required)"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  { "message": "Comment added", "share": { "_id": "60d5ec4b1a2c3d4e5f6g7h8l", "comments": [ ... ] } }
  ```
* **Example Request**:
  ```bash
  curl -X POST http://localhost:3005/api/social/60d5ec4b1a2c3d4e5f6g7h8l/comment \
    -H "Authorization: Bearer eyJhbGciOi..." \
    -H "Content-Type: application/json" \
    -d '{"text": "Nice receipt find!"}'
  ```

---

### POST `/api/social/users/:targetUserId/follow`
* **Purpose**: Follows or unfollows another user.
* **Authentication Required**: ✅
* **Request Parameters**:
  * `targetUserId` (string, required): User ID to follow or unfollow.
* **Success Response (200 OK)**:
  ```json
  { "message": "Following", "following": true }
  ```
* **Example Request**:
  ```bash
  curl -X POST http://localhost:3005/api/social/users/60d5ec4b1a2c3d4e5f6g7h8x/follow \
    -H "Authorization: Bearer eyJhbGciOi..."
  ```

---

### GET `/api/social/users/:userId`
* **Purpose**: Retrieves another user's profile metadata and their recent public posts.
* **Authentication Required**: ✅
* **Request Parameters**:
  * `userId` (string, required): Target user ID.
* **Success Response (200 OK)**: Returns user metadata and public shares.
* **Example Request**:
  ```bash
  curl -X GET http://localhost:3005/api/social/users/60d5ec4b1a2c3d4e5f6g7h8x \
    -H "Authorization: Bearer eyJhbGciOi..."
  ```

---

### DELETE `/api/social/:shareId`
* **Purpose**: Deletes a shared post.
* **Authentication Required**: ✅
* **Request Parameters**:
  * `shareId` (string, required): Social post ID.
* **Success Response (200 OK)**:
  ```json
  { "message": "Share deleted" }
  ```
* **Example Request**:
  ```bash
  curl -X DELETE http://localhost:3005/api/social/60d5ec4b1a2c3d4e5f6g7h8l \
    -H "Authorization: Bearer eyJhbGciOi..."
  ```

---

## 6. Gallery Router (`/api/gallery`)

### POST `/api/gallery/upload`
* **Purpose**: Saves a Base64 image payload to the database.
* **Authentication Required**: ✅
* **Request Body**:
  ```json
  {
    "imageData": "string (required, Base64 image payload)",
    "title": "string (optional)",
    "description": "string (optional)",
    "tags": "array of strings (optional)",
    "receiptId": "string (optional)"
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "message": "Image uploaded",
    "image": { "_id": "60d5ec4b1a2c3d4e5f6g7h8y", "imageUrl": "data:image/jpeg;base64,/9j/4AAQ..." }
  }
  ```
* **Example Request**:
  ```bash
  curl -X POST http://localhost:3005/api/gallery/upload \
    -H "Authorization: Bearer eyJhbGciOi..." \
    -H "Content-Type: application/json" \
    -d '{"imageData": "data:image/jpeg;base64,/9j/4AAQ..."}'
  ```

---

### GET `/api/gallery/`
* **Purpose**: Retrieves a user's vault images (filtered by tags).
* **Authentication Required**: ✅
* **Query Parameters**:
  * `tags` (string, optional, comma-separated tags): Filter by tags.
  * `skip` (number, optional, default: 0): Pagination offset.
  * `limit` (number, optional, default: 20): Page size limit.
* **Success Response (200 OK)**:
  ```json
  {
    "images": [ ... ],
    "pagination": { "total": 5, "skip": 0, "limit": 20 }
  }
  ```
* **Example Request**:
  ```bash
  curl -X GET "http://localhost:3005/api/gallery?tags=receipt,groceries" \
    -H "Authorization: Bearer eyJhbGciOi..."
  ```

---

### GET `/api/gallery/:id`
* **Purpose**: Retrieves details for a single vault image.
* **Authentication Required**: ✅
* **Request Parameters**:
  * `id` (string, required): Gallery document ID.
* **Success Response (200 OK)**: Returns the image document (populated with the linked receipt).
* **Example Request**:
  ```bash
  curl -X GET http://localhost:3005/api/gallery/60d5ec4b1a2c3d4e5f6g7h8y \
    -H "Authorization: Bearer eyJhbGciOi..."
  ```

---

### PUT `/api/gallery/:id`
* **Purpose**: Updates the title, description, or tags of a vault image.
* **Authentication Required**: ✅
* **Request Body**:
  ```json
  {
    "title": "string (optional)",
    "description": "string (optional)",
    "tags": "array of strings (optional)"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "message": "Image updated",
    "image": { "_id": "60d5ec4b1a2c3d4e5f6g7h8y", "title": "Updated Title" }
  }
  ```
* **Example Request**:
  ```bash
  curl -X PUT http://localhost:3005/api/gallery/60d5ec4b1a2c3d4e5f6g7h8y \
    -H "Authorization: Bearer eyJhbGciOi..." \
    -H "Content-Type: application/json" \
    -d '{"title": "Updated Title"}'
  ```

---

### DELETE `/api/gallery/:id`
* **Purpose**: Deletes a vault image.
* **Authentication Required**: ✅
* **Request Parameters**:
  * `id` (string, required): Gallery document ID.
* **Success Response (200 OK)**:
  ```json
  { "message": "Image deleted" }
  ```
* **Example Request**:
  ```bash
  curl -X DELETE http://localhost:3005/api/gallery/60d5ec4b1a2c3d4e5f6g7h8y \
    -H "Authorization: Bearer eyJhbGciOi..."
  ```

---

## Maintenance Notes & Operational Risks

> [!WARNING]
> **API Validation Gaps**: The backend does not enforce request payload validation rules in its routes using libraries like `express-validator` (which is installed but unused). We recommend adding body validation checks to protect endpoints from receiving invalid parameter types.

For security and JWT authentication architectures, refer to [07_Authentication.md](file:///c:/Flutter/flutter_windows_3.41.9-stable/Smartscanner-backend-main/Smartscanner-backend-main/docs/07_Authentication.md).
