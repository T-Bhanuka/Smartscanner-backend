# 14. Developer Maintenance Guide - SmartScan Pro

This guide is designed for backend engineers maintaining and updating the SmartScan Pro API. It outlines system vulnerabilities, high-risk components, performance optimization paths, and operational checklists.

---

## 1. HIGH-RISK MODULES

* **[src/routes/receipts.js](file:///c:/Flutter/flutter_windows_3.41.9-stable/Smartscanner-backend-main/Smartscanner-backend-main/src/routes/receipts.js)**:
  * **Risk**: Manages the integration with the Google Gemini API. This file is vulnerable to failures if Gemini changes its API parameters, if the API rate limit is exceeded, or if the API returns malformed JSON payloads.
  * **Vulnerabilities**: Does not implement request timeouts or retry logic.
* **[src/models/Budget.js](file:///c:/Flutter/flutter_windows_3.41.9-stable/Smartscanner-backend-main/Smartscanner-backend-main/src/models/Budget.js)**:
  * **Risk**: The pre-save hook queries the database and performs calculations. Rapid sequential receipt uploads can trigger race conditions because MongoDB documents are read, modified, and saved without transactional locking.
  * **Vulnerabilities**: Any database query failures inside this pre-save hook will block the receipt save operation.

---

## 2. DATABASE MIGRATION PROCEDURES

Mongoose ODM manages database schemas dynamically, but data migrations (such as adding fields or renaming collections) must be run manually:

### Migration Guidelines:
1. **Always Back Up Collections**: Create a database backup before running migrations:
   ```bash
   mongodump --uri="mongodb://localhost:27017/smartscanner" --out="./backup/"
   ```
2. **Write Idempotent Migration Scripts**: Store migration scripts inside a `/scripts/migrations/` directory. Ensure they can be run multiple times safely without corrupting data.
3. **Trigger Re-saves to Populate Fields**: If you update Mongoose schema defaults, run a script to retrieve and resave existing documents to populate the new fields.
4. **Index Verification**: Run `db.collection.getIndexes()` after applying migrations to verify that indexes are configured correctly in MongoDB.

---

## 3. REFACTORING DIRECTIVES

1. **Decouple the Service Layer**:
   * **Problem**: Gemini API calls are currently written inline inside the receipts router.
   * **Solution**: Extract this integration logic into a dedicated service module: `src/services/geminiService.js`.
2. **Standardize API Responses**:
   * **Problem**: Endpoints return database documents directly, leading to inconsistent response structures.
   * **Solution**: Implement a helper class or middleware to standardize response objects:
     ```javascript
     res.status(200).json({ success: true, data: result, message: "Success" });
     ```
3. **Move Logic Out of Database Hooks**:
   * **Problem**: The Budget pre-save hook executes database queries, which can lead to race conditions.
   * **Solution**: Move this calculation logic to a service layer and use MongoDB update operators (like `$inc`) instead of retrieving, modifying, and saving entire documents.

---

## 4. LOGGING RECOMMENDATIONS

* **Replace Console Logs**: Replace `console.log` and `console.error` calls with a structured logging library like **Winston**.
* **Log Levels**: Use appropriate log levels: `info` for startup and server events, `warn` for validation issues, and `error` for API and database failures.
* **Redact Sensitive Information**: Ensure passwords, credit card numbers, and raw image Base64 data are redacted from application logs.

---

## 5. SECURITY CHECKLIST

- [ ] Set rate limit constraints on login and register endpoints.
- [ ] Enforce password complexity checks using regex validation in the User model.
- [ ] Add request body validators to all POST and PUT routes using `express-validator`.
- [ ] Enable TLS/HTTPS configurations on production environments.
- [ ] Store application secrets in secure environment variables, never in codebase commits.

For details on common errors and debugging tips, refer to [15_Troubleshooting.md](file:///c:/Flutter/flutter_windows_3.41.9-stable/Smartscanner-backend-main/Smartscanner-backend-main/docs/15_Troubleshooting.md).
