# 07. Authentication System - SmartScan Pro

This document details the stateless JWT authentication system, password encryption, and authorization checks.

---

## Authentication Sequences

### 1. User Registration Flow
```mermaid
sequenceDiagram
    autonumber
    actor Client as Frontend Client
    participant API as Auth Controller (auth.js)
    participant Model as User Model (User.js)
    participant DB as MongoDB Database

    Client->{}: POST /api/auth/register (name, email, password)
    Note over API: Validates fields are present
    API->>Model: Query User by email
    Model->>DB: findOne({ email })
    DB-->>Model: Return result (null / user doc)
    alt Email Already Exists
        Model-->>API: User found
        API-->>Client: 400 Bad Request (User already exists)
    else Email Available
        API->>Model: Create User instance
        Note over Model: pre('save') hook hashes password using bcrypt (rounds=10)
        Model->>DB: Insert User document
        DB-->>Model: Success
        Note over API: Generates JWT signed with JWT_SECRET
        API-->>Client: 201 Created (Token + user object)
    end
```

### 2. User Login Flow
```mermaid
sequenceDiagram
    autonumber
    actor Client as Frontend Client
    participant API as Auth Controller (auth.js)
    participant Model as User Model (User.js)
    participant DB as MongoDB Database

    Client->>API: POST /api/auth/login (email, password)
    Note over API: Validates email and password parameters
    API->>Model: Query User by email
    Model->>DB: findOne({ email })
    DB-->>Model: Return User document (including password hash)
    alt User Not Found
        Model-->>API: Return null
        API-->>Client: 401 Unauthorized (Invalid credentials)
    else User Found
        API->>Model: comparePassword(password)
        Note over Model: Computes bcrypt comparison
        alt Password Verification Fails
            Model-->>API: Return false
            API-->>Client: 401 Unauthorized (Invalid credentials)
        else Password Verification Succeeds
            Model-->>API: Return true
            Note over API: Generates JWT signed with JWT_SECRET
            API-->>Client: 200 OK (Token + user settings)
        end
    end
```

### 3. Authorization Hook Lifecycle
```mermaid
sequenceDiagram
    autonumber
    actor Client as Frontend Client
    participant MW as authenticate.js Middleware
    participant Controller as Route Controller
    participant DB as MongoDB Database

    Client->>MW: GET /api/receipts (Authorization: Bearer <token>)
    alt Authorization Header Missing
        MW-->>Client: 401 Unauthorized (No token provided)
    else Authorization Header Present
        Note over MW: Extracts token, verifies signature using JWT_SECRET
        alt Signature Verification Fails / Token Expired
            MW-->>Client: 401 Unauthorized (Invalid token)
        else Verification Succeeds
            Note over MW: Appends decoded userId to request object (req.userId)
            MW->>Controller: next()
            Controller->>DB: Query Receipts matching req.userId
            DB-->>Controller: Return user receipts
            Controller-->>Client: 200 OK (JSON Receipts array)
        end
    end
```

---

## Authentication Specifications

### 1. Password Hashing Engine
* **Library**: `bcryptjs`
* **Configuration**: Cost rounds set to `10` inside the User model pre-save hook.
* **Mechanism**:
  ```javascript
  userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
  });
  ```

### 2. Token Lifecycle (JWT Generation)
* **Library**: `jsonwebtoken`
* **Payload**: Extracted user document ID: `{ userId: user._id }`.
* **Signing Key**: Server secret key (`process.env.JWT_SECRET`).
* **Expiration**: Configured via `JWT_EXPIRE` (defaulting to `7d`).

### 3. Token Verification (Authentication Middleware)
* Intercepts incoming requests on protected endpoints.
* Parses request headers for the `Authorization` bearer token.
* Calls `jwt.verify(token, process.env.JWT_SECRET)` to validate the token.
* Injects the decoded user ID into `req.userId` for route controllers.

---

## Maintenance Notes & Operational Risks

> [!WARNING]
> **No Password Complexity Rules**: The schema only enforces a minimum length of 6 characters. We recommend implementing password validation regex rules to require uppercase letters, numbers, and special characters.

> [!CAUTION]
> **Lack of Token Revocation**: The JWT system is stateless, meaning tokens cannot be revoked before they expire. If a token is compromised, it remains valid until it expires. We recommend implementing a token blacklist using Redis to handle user logouts and account deletions.

For details on the receipt scan pipeline and Gemini AI integrations, refer to [08_Receipt_Analysis.md](file:///c:/Flutter/flutter_windows_3.41.9-stable/Smartscanner-backend-main/Smartscanner-backend-main/docs/08_Receipt_Analysis.md).
