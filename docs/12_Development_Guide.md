# 12. Local Development Guide - SmartScan Pro

This guide walks you through setting up a local development workspace, configuring environment keys, and running the Express server.

---

## Local Setup Prerequisites

Ensure you have the following installed on your machine:
* **Node.js**: Version 18.x or higher.
* **MongoDB**: A local MongoDB database instance (listening on port `27017`) or a MongoDB Atlas connection string.

---

## Step-by-Step Installation

### Step 1: Clone and Install Dependencies
Open a terminal inside the project directory and install the required npm packages:
```bash
npm install
```

### Step 2: Configure Environment Variables
Copy the configuration template to create a `.env` file:
```bash
cp .env.example .env
```

Open the newly created `.env` file and fill in your keys:
```ini
PORT=3005
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/smartscanner
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_EXPIRE=7d

# Gemini AI (Required for receipt analyze endpoint)
GEMINI_API_KEY=YOUR_GOOGLE_AI_STUDIO_API_KEY
```

### Step 3: Run MongoDB
Ensure your local MongoDB database service is running:
```bash
# Start MongoDB service locally
mongod
```

### Step 4: Run the Server
Start the development server with live reload enabled:
```bash
npm run dev
```
Upon a successful boot, the terminal will display:
```
MongoDB connected
Server running on port 3005
```

---

## Testing API Connectivity

Verify the API is running correctly using curl:
```bash
curl -X GET http://localhost:3005/health
```
**Response**:
```json
{ "status": "Backend is running" }
```

---

## Maintenance Notes & Debugging

> [!TIP]
> **Check Local Port Occupancy**: If the server fails to start and throws an `EADDRINUSE: address already in use :::3005` error, a previous Node process is already using the port. You can find and terminate this process using:
> * Windows PowerShell: `Stop-Process -Id (Get-NetTCPConnection -LocalPort 3005).OwningProcess -Force`
> * Linux/Mac Terminal: `kill -9 $(lsof -t -i:3005)`

For Docker build details and production container steps, refer to [13_Deployment_Guide.md](file:///c:/Flutter/flutter_windows_3.41.9-stable/Smartscanner-backend-main/Smartscanner-backend-main/docs/13_Deployment_Guide.md).
