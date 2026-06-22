# 15. Troubleshooting Guide - SmartScan Pro

This guide outlines common issues encountered during development and deployment, and provides steps to resolve them.

---

## 1. DOCKER PORT MISMATCH

### Symptom:
When running `docker-compose up --build`, the containers start up, but requests to `http://localhost:3000` fail or time out.

### Root Cause:
In [docker-compose.yml](file:///c:/Flutter/flutter_windows_3.41.9-stable/Smartscanner-backend-main/Smartscanner-backend-main/docker-compose.yml), the API service maps port `3000:3000` to the host, but the container runs `npm run dev` (which executes [src/index.js](file:///c:/Flutter/flutter_windows_3.41.9-stable/Smartscanner-backend-main/Smartscanner-backend-main/src/index.js)). Since the `PORT` environment variable is not defined inside the container, `index.js` defaults to listening on port `3005`. This port mismatch prevents docker-compose from forwarding requests correctly.

### Resolution:
Add `PORT=3000` to the `environment` block for the `api` service in `docker-compose.yml`:
```yaml
api:
  build: .
  container_name: smartscanner_api
  environment:
    NODE_ENV: development
    PORT: 3000 # Added line to resolve port mismatch
    MONGODB_URI: mongodb://mongo:27017/smartscanner
    # ...other variables...
  ports:
    - "3000:3000"
```

---

## 2. PORT ALREADY IN USE

### Symptom:
Starting the local development server with `npm run dev` fails with an address already in use error:
```
Error: listen EADDRINUSE: address already in use :::3005
```

### Root Cause:
Another process on your machine is already using port `3005` (commonly a previous instance of the server running in the background).

### Resolution:
You can find and terminate this process using:
* **Windows (PowerShell)**:
  ```powershell
  # Find the process ID (PID) using the port
  Get-NetTCPConnection -LocalPort 3005 | Select-Object OwningProcess
  
  # Terminate the process (replace PID with actual process ID)
  Stop-Process -Id <PID> -Force
  ```
* **Linux / Mac (Terminal)**:
  ```bash
  # Terminate the process using the port
  kill -9 $(lsof -t -i:3005)
  ```

---

## 3. GEMINI AI PARSING ISSUES

### Symptom:
Receipt scans fail with 500 errors, or the database saves receipts with missing item fields.

### Root Cause:
* **Gemini JSON Parsing Failures**: Gemini may return responses wrapped in unexpected Markdown formats, causing JSON parsing errors when stripping code blocks.
* **Mongoose Enum Validation**: If Gemini returns a category that does not match Mongoose's category enum, the save operation will fail.

### Resolution:
* Check your backend logs to inspect the raw text returned by the Gemini API.
* Ensure your prompt explicitly instructs Gemini to return JSON data and use the allowed category enums.
* Enforce default category values (e.g. `'Other'`) inside the receipts router if Gemini returns an invalid category.

---

## 4. DATABASE VALIDATION ERRORS

### Symptom:
Adding a receipt fails with a validation error:
```
ValidationError: userId: Path `userId` is required.
```

### Root Cause:
The request was processed by a protected route without a valid token, or the auth middleware failed to decode the token.

### Resolution:
* Ensure the client is sending the token in the headers as: `Authorization: Bearer <JWT_TOKEN>`.
* Verify the `JWT_SECRET` environment variable matches the key used to sign the token.
* Inspect [src/middleware/authenticate.js](file:///c:/Flutter/flutter_windows_3.41.9-stable/Smartscanner-backend-main/Smartscanner-backend-main/src/middleware/authenticate.js) to confirm `req.userId` is being set correctly.
