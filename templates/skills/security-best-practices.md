---
name: security-best-practices
description: Common vulnerabilities, input validation, authentication patterns, and security scanning
description_zh: 常见漏洞、输入验证、身份验证模式和安全扫描
version: 1.0.0
category: security
triggers: ['/security-best-practices', '/security', '/vulnerabilities', '/auth-security']
use_when:
  - Implementing secure coding practices
  - Conducting security reviews and audits
  - Setting up authentication and authorization
  - Preventing common security vulnerabilities
use_when_zh:
  - 实现安全编码实践
  - 进行安全审查和审计
  - 设置身份验证和授权
  - 防止常见安全漏洞
auto_activate: true
priority: 9
agents: [security-expert, backend-architect]
tags: [security, vulnerabilities, authentication, validation, encryption]
---

# Security Best Practices | 安全最佳实践

## Context | 上下文

Use this skill when implementing secure applications, conducting security reviews, and protecting against common vulnerabilities. Essential for building trustworthy and resilient software systems.

在实现安全应用程序、进行安全审查和防范常见漏洞时使用此技能。对于构建可信赖和有弹性的软件系统至关重要。

## OWASP Top 10 Vulnerabilities | OWASP 十大漏洞

### 1. Injection Attacks | 注入攻击

```javascript
// ✅ Good: SQL Injection Prevention
const mysql = require('mysql2/promise');

// Use parameterized queries
async function getUserById(userId) {
  const connection = await mysql.createConnection(dbConfig);

  // Safe: Parameters are properly escaped
  const [rows] = await connection.execute(
    'SELECT * FROM users WHERE id = ?',
    [userId]
  );

  await connection.end();
  return rows[0];
}

async function searchUsers(searchTerm) {
  const connection = await mysql.createConnection(dbConfig);

  // Safe: Using LIKE with parameterized query
  const [rows] = await connection.execute(
    'SELECT id, name, email FROM users WHERE name LIKE ? OR email LIKE ?',
    [`%${searchTerm}%`, `%${searchTerm}%`]
  );

  await connection.end();
  return rows;
}

// ✅ Good: NoSQL Injection Prevention (MongoDB)
const { MongoClient, ObjectId } = require('mongodb');

async function getUserByIdMongo(userId) {
  const client = new MongoClient(mongoUrl);
  await client.connect();

  const db = client.db('myapp');
  const users = db.collection('users');

  // Safe: Validate and sanitize input
  if (!ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID format');
  }

  const user = await users.findOne({ _id: new ObjectId(userId) });

  await client.close();
  return user;
}

async function searchUsersMongo(searchCriteria) {
  const client = new MongoClient(mongoUrl);
  await client.connect();

  const db = client.db('myapp');
  const users = db.collection('users');

  // Safe: Validate search criteria structure
  const allowedFields = ['name', 'email', 'department'];
  const sanitizedCriteria = {};

  for (const [key, value] of Object.entries(searchCriteria)) {
    if (allowedFields.includes(key) && typeof value === 'string') {
      sanitizedCriteria[key] = { $regex: value, $options: 'i' };
    }
  }

  const users_result = await users.find(sanitizedCriteria).toArray();

  await client.close();
  return users_result;
}

// ❌ Bad: Vulnerable to SQL injection
async function vulnerableGetUser(userId) {
  const connection = await mysql.createConnection(dbConfig);

  // Dangerous: Direct string concatenation
  const query = `SELECT * FROM users WHERE id = ${userId}`;
  const [rows] = await connection.execute(query);

  return rows[0];
}

// ❌ Bad: Vulnerable to NoSQL injection
async function vulnerableSearchMongo(userInput) {
  const client = new MongoClient(mongoUrl);
  await client.connect();

  const db = client.db('myapp');
  const users = db.collection('users');

  // Dangerous: Direct use of user input
  const result = await users.find(userInput).toArray();

  return result;
}
```

### 2. Cross-Site Scripting (XSS) | 跨站脚本攻击

```javascript
// ✅ Good: XSS Prevention
const DOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const purify = DOMPurify(window);

// Input sanitization
function sanitizeHtml(dirty) {
  return purify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  });
}

// Output encoding for different contexts
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeJavaScript(unsafe) {
  return unsafe
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

// React component with proper escaping
import React from 'react';

function UserProfile({ user }) {
  return (
    <div>
      {/* Safe: React automatically escapes */}
      <h1>{user.name}</h1>
      <p>{user.bio}</p>

      {/* Safe: Sanitized HTML */}
      <div dangerouslySetInnerHTML={{
        __html: sanitizeHtml(user.description)
      }} />

      {/* Safe: URL validation */}
      {isValidUrl(user.website) && (
        <a href={user.website} target="_blank" rel="noopener noreferrer">
          {user.website}
        </a>
      )}
    </div>
  );
}

function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// ✅ Good: Content Security Policy
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://trusted-cdn.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "connect-src 'self' https://api.example.com; " +
    "frame-ancestors 'none';"
  );
  next();
});

// ❌ Bad: Vulnerable to XSS
function vulnerableRender(userInput) {
  // Dangerous: Direct HTML insertion
  document.getElementById('content').innerHTML = userInput;

  // Dangerous: Unescaped output in template
  return `<div>${userInput}</div>`;
}

// ❌ Bad: Dangerous use of eval
function vulnerableExecute(userCode) {
  // Extremely dangerous: Never use eval with user input
  eval(userCode);
}
```

### 3. Authentication and Session Management | 身份验证和会话管理

```javascript
// ✅ Good: Secure Authentication Implementation
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

// Password hashing
async function hashPassword(password) {
  const saltRounds = 12; // Adjust based on security requirements
  return await bcrypt.hash(password, saltRounds);
}

async function verifyPassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

// Secure password requirements
function validatePassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const errors = [];

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }

  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  }

  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// JWT token management
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || crypto.randomBytes(64).toString('hex');

function generateTokens(userId) {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
}

function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

// Rate limiting for authentication
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Secure login endpoint
app.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal whether user exists
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(423).json({ error: 'Account temporarily locked' });
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      // Increment failed attempts
      await user.incFailedAttempts();
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset failed attempts on successful login
    await user.resetFailedAttempts();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Store refresh token securely
    await user.updateRefreshToken(refreshToken);

    // Set secure cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Multi-factor authentication
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

async function setupTwoFactor(userId) {
  const secret = speakeasy.generateSecret({
    name: `MyApp (${userId})`,
    issuer: 'MyApp'
  });

  // Store secret temporarily (user must verify before enabling)
  await User.findByIdAndUpdate(userId, {
    tempTwoFactorSecret: secret.base32
  });

  // Generate QR code
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

  return {
    secret: secret.base32,
    qrCode: qrCodeUrl
  };
}

function verifyTwoFactor(token, secret) {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2 // Allow some time drift
  });
}

// ❌ Bad: Insecure authentication
async function insecureLogin(email, password) {
  // Bad: Plain text password storage
  const user = await User.findOne({ email, password });

  // Bad: Weak JWT secret
  const token = jwt.sign({ userId: user.id }, 'secret123');

  // Bad: No rate limiting, no input validation
  return { token };
}
```

### 4. Access Control and Authorization | 访问控制和授权

```javascript
// ✅ Good: Role-Based Access Control (RBAC)
const permissions = {
  'user:read': ['admin', 'manager', 'user'],
  'user:write': ['admin', 'manager'],
  'user:delete': ['admin'],
  'report:read': ['admin', 'manager'],
  'report:write': ['admin', 'manager'],
  'system:admin': ['admin']
};

function hasPermission(userRole, permission) {
  return permissions[permission]?.includes(userRole) || false;
}

// Middleware for permission checking
function requirePermission(permission) {
  return (req, res, next) => {
    const user = req.user; // Set by authentication middleware

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!hasPermission(user.role, permission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

// Resource-based authorization
async function canAccessResource(userId, resourceId, action) {
  const resource = await Resource.findById(resourceId);

  if (!resource) {
    return false;
  }

  // Owner can do anything
  if (resource.ownerId.toString() === userId.toString()) {
    return true;
  }

  // Check shared permissions
  const permission = await Permission.findOne({
    resourceId,
    userId,
    action: { $in: [action, 'all'] }
  });

  return !!permission;
}

// API endpoint with proper authorization
app.get('/api/users/:id',
  authenticateToken,
  requirePermission('user:read'),
  async (req, res) => {
    try {
      const requestedUserId = req.params.id;
      const currentUserId = req.user.id;

      // Users can only access their own data unless they have admin role
      if (requestedUserId !== currentUserId && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const user = await User.findById(requestedUserId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Filter sensitive data based on permissions
      const userData = filterUserData(user, req.user.role);

      res.json(userData);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

function filterUserData(user, viewerRole) {
  const baseData = {
    id: user._id,
    name: user.name,
    email: user.email
  };

  // Admin can see everything
  if (viewerRole === 'admin') {
    return {
      ...baseData,
      role: user.role,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      isActive: user.isActive
    };
  }

  // Regular users see limited data
  return baseData;
}

// ✅ Good: Attribute-Based Access Control (ABAC)
class AccessControlEngine {
  constructor() {
    this.policies = [];
  }

  addPolicy(policy) {
    this.policies.push(policy);
  }

  async evaluate(subject, action, resource, context = {}) {
    for (const policy of this.policies) {
      const result = await policy.evaluate(subject, action, resource, context);
      if (result === 'deny') {
        return false;
      }
      if (result === 'allow') {
        return true;
      }
    }

    // Default deny
    return false;
  }
}

class Policy {
  constructor(name, condition, effect) {
    this.name = name;
    this.condition = condition;
    this.effect = effect; // 'allow' or 'deny'
  }

  async evaluate(subject, action, resource, context) {
    if (await this.condition(subject, action, resource, context)) {
      return this.effect;
    }
    return 'not_applicable';
  }
}

// Example policies
const ownerPolicy = new Policy(
  'owner-access',
  async (subject, action, resource) => {
    return resource.ownerId === subject.id;
  },
  'allow'
);

const businessHoursPolicy = new Policy(
  'business-hours-only',
  async (subject, action, resource, context) => {
    const hour = new Date().getHours();
    return hour >= 9 && hour <= 17; // 9 AM to 5 PM
  },
  'allow'
);

const acEngine = new AccessControlEngine();
acEngine.addPolicy(ownerPolicy);
acEngine.addPolicy(businessHoursPolicy);
```

## Input Validation and Sanitization | 输入验证和清理

### 1. Comprehensive Input Validation | 全面输入验证

```javascript
// ✅ Good: Input validation with Joi
const Joi = require('joi');

// User registration schema
const userRegistrationSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Name can only contain letters and spaces'
    }),

  email: Joi.string()
    .email({ minDomainSegments: 2 })
    .required()
    .lowercase(),

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }),

  age: Joi.number()
    .integer()
    .min(13)
    .max(120)
    .required(),

  phone: Joi.string()
    .pattern(/^\+?[\d\s\-\(\)]+$/)
    .optional(),

  website: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .optional()
});

// Validation middleware
function validateInput(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    req.validatedData = value;
    next();
  };
}

// File upload validation
const multer = require('multer');
const path = require('path');

const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and PDF files are allowed.'), false);
  }
};

const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Maximum 5 files
  },
  fileFilter
});

// API endpoint with validation
app.post('/api/users',
  validateInput(userRegistrationSchema),
  async (req, res) => {
    try {
      const userData = req.validatedData;

      // Additional business logic validation
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      // Hash password
      userData.passwordHash = await hashPassword(userData.password);
      delete userData.password;

      const user = new User(userData);
      await user.save();

      res.status(201).json({
        message: 'User created successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        }
      });

    } catch (error) {
      console.error('User creation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ✅ Good: SQL injection prevention with parameterized queries
async function searchProducts(filters) {
  const { category, minPrice, maxPrice, searchTerm } = filters;

  let query = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  if (minPrice !== undefined) {
    query += ' AND price >= ?';
    params.push(minPrice);
  }

  if (maxPrice !== undefined) {
    query += ' AND price <= ?';
    params.push(maxPrice);
  }

  if (searchTerm) {
    query += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${searchTerm}%`, `%${searchTerm}%`);
  }

  const [rows] = await connection.execute(query, params);
  return rows;
}

// ❌ Bad: No input validation
app.post('/api/users', async (req, res) => {
  // Dangerous: No validation of input data
  const user = new User(req.body);
  await user.save();
  res.json(user);
});
```

## Cryptography and Data Protection | 密码学和数据保护

### 1. Encryption and Hashing | 加密和哈希

```javascript
// ✅ Good: Proper encryption implementation
const crypto = require('crypto');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16;  // 128 bits
    this.tagLength = 16; // 128 bits
  }

  // Generate a random encryption key
  generateKey() {
    return crypto.randomBytes(this.keyLength);
  }

  // Encrypt data
  encrypt(plaintext, key) {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipher(this.algorithm, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // Return IV + tag + encrypted data
    return {
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      encrypted: encrypted
    };
  }

  // Decrypt data
  decrypt(encryptedData, key) {
    const { iv, tag, encrypted } = encryptedData;

    const decipher = crypto.createDecipher(
      this.algorithm,
      key,
      Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(tag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // Hash data with salt
  hashWithSalt(data, salt = null) {
    if (!salt) {
      salt = crypto.randomBytes(32);
    }

    const hash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512');

    return {
      hash: hash.toString('hex'),
      salt: salt.toString('hex')
    };
  }

  // Verify hash
  verifyHash(data, hash, salt) {
    const { hash: computedHash } = this.hashWithSalt(
      data,
      Buffer.from(salt, 'hex')
    );

    return crypto.timingSafeEqual(
      Buffer.from(hash, 'hex'),
      Buffer.from(computedHash, 'hex')
    );
  }
}

// ✅ Good: Secure random token generation
function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

function generateApiKey() {
  const prefix = 'ak_';
  const randomPart = crypto.randomBytes(24).toString('base64url');
  return prefix + randomPart;
}

// ✅ Good: Digital signatures
class SignatureService {
  constructor() {
    this.algorithm = 'sha256';
  }

  // Generate key pair
  generateKeyPair() {
    return crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });
  }

  // Sign data
  sign(data, privateKey) {
    const sign = crypto.createSign(this.algorithm);
    sign.update(data);
    return sign.sign(privateKey, 'hex');
  }

  // Verify signature
  verify(data, signature, publicKey) {
    const verify = crypto.createVerify(this.algorithm);
    verify.update(data);
    return verify.verify(publicKey, signature, 'hex');
  }
}

// ✅ Good: Secure session management
const session = require('express-session');
const MongoStore = require('connect-mongo');

app.use(session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
  name: 'sessionId', // Don't use default name
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600 // Lazy session update
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    sameSite: 'strict' // CSRF protection
  }
}));

// ❌ Bad: Weak encryption
function weakEncryption(data) {
  // Bad: Using deprecated algorithm
  const cipher = crypto.createCipher('des', 'weak-key');
  return cipher.update(data, 'utf8', 'hex') + cipher.final('hex');
}

// ❌ Bad: Predictable tokens
function weakToken() {
  // Bad: Predictable timestamp-based token
  return Date.now().toString() + Math.random().toString();
}
```

### 2. Secure Communication | 安全通信

```javascript
// ✅ Good: HTTPS configuration
const https = require('https');
const fs = require('fs');

// SSL/TLS configuration
const httpsOptions = {
  key: fs.readFileSync('path/to/private-key.pem'),
  cert: fs.readFileSync('path/to/certificate.pem'),
  // Additional security options
  secureProtocol: 'TLSv1_2_method',
  ciphers: [
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-SHA256',
    'ECDHE-RSA-AES256-SHA384'
  ].join(':'),
  honorCipherOrder: true
};

const server = https.createServer(httpsOptions, app);

// ✅ Good: Security headers middleware
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.example.com"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// ✅ Good: API rate limiting
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Stricter limit for sensitive endpoints
  skipSuccessfulRequests: true
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', strictLimiter);

// ✅ Good: Request validation and sanitization
const validator = require('validator');

function sanitizeInput(req, res, next) {
  // Sanitize string inputs
  for (const key in req.body) {
    if (typeof req.body[key] === 'string') {
      req.body[key] = validator.escape(req.body[key]);
    }
  }

  // Validate and sanitize specific fields
  if (req.body.email) {
    req.body.email = validator.normalizeEmail(req.body.email);
    if (!validator.isEmail(req.body.email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
  }

  if (req.body.url) {
    if (!validator.isURL(req.body.url, { protocols: ['http', 'https'] })) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
  }

  next();
}

app.use(sanitizeInput);
```

## Security Testing and Monitoring | 安全测试和监控

### 1. Security Testing | 安全测试

```javascript
// ✅ Good: Security-focused unit tests
describe('Authentication Security', () => {
  describe('Password validation', () => {
    it('should reject weak passwords', () => {
      const weakPasswords = [
        'password',
        '123456',
        'qwerty',
        'abc123',
        'password123'
      ];

      weakPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(false);
      });
    });

    it('should accept strong passwords', () => {
      const strongPasswords = [
        'MyStr0ng!Pass',
        'C0mplex@Password123',
        'Secure#Pass2023!'
      ];

      strongPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('SQL injection prevention', () => {
    it('should handle malicious input safely', async () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'/*",
        "1; DELETE FROM users WHERE 1=1; --"
      ];

      for (const input of maliciousInputs) {
        const result = await getUserById(input);
        expect(result).toBeNull(); // Should not return any data
      }
    });
  });

  describe('XSS prevention', () => {
    it('should sanitize HTML input', () => {
      const maliciousInputs = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert("XSS")',
        '<svg onload="alert(1)">'
      ];

      maliciousInputs.forEach(input => {
        const sanitized = sanitizeHtml(input);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('onerror');
        expect(sanitized).not.toContain('onload');
      });
    });
  });
});

// ✅ Good: Penetration testing helpers
class SecurityTester {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async testSqlInjection(endpoint, params) {
    const sqlPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "1' UNION SELECT * FROM users --",
      "admin'/*"
    ];

    const results = [];

    for (const payload of sqlPayloads) {
      try {
        const testParams = { ...params };
        // Inject payload into each parameter
        for (const key in testParams) {
          testParams[key] = payload;

          const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testParams)
          });

          results.push({
            payload,
            parameter: key,
            status: response.status,
            vulnerable: response.status === 200 && response.headers.get('content-length') > 1000
          });
        }
      } catch (error) {
        results.push({
          payload,
          error: error.message
        });
      }
    }

    return results;
  }

  async testXss(endpoint, params) {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src="x" onerror="alert(1)">',
      'javascript:alert("XSS")',
      '<svg onload="alert(1)">'
    ];

    const results = [];

    for (const payload of xssPayloads) {
      const testParams = { ...params };

      for (const key in testParams) {
        testParams[key] = payload;

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testParams)
        });

        const responseText = await response.text();

        results.push({
          payload,
          parameter: key,
          vulnerable: responseText.includes(payload) && !responseText.includes('&lt;script&gt;')
        });
      }
    }

    return results;
  }
}
```

### 2. Security Monitoring | 安全监控

```javascript
// ✅ Good: Security event logging
const winston = require('winston');

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/security.log' }),
    new winston.transports.Console()
  ]
});

// Security event types
const SecurityEvents = {
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILURE: 'login_failure',
  LOGIN_BLOCKED: 'login_blocked',
  PASSWORD_CHANGE: 'password_change',
  PERMISSION_DENIED: 'permission_denied',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  DATA_ACCESS: 'data_access',
  ADMIN_ACTION: 'admin_action'
};

function logSecurityEvent(eventType, details) {
  securityLogger.info({
    event: eventType,
    timestamp: new Date().toISOString(),
    ...details
  });
}

// Middleware for security logging
function securityLoggingMiddleware(req, res, next) {
  const originalSend = res.send;

  res.send = function(data) {
    // Log failed authentication attempts
    if (res.statusCode === 401) {
      logSecurityEvent(SecurityEvents.LOGIN_FAILURE, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method
      });
    }

    // Log permission denied
    if (res.statusCode === 403) {
      logSecurityEvent(SecurityEvents.PERMISSION_DENIED, {
        ip: req.ip,
        userId: req.user?.id,
        endpoint: req.path,
        method: req.method
      });
    }

    originalSend.call(this, data);
  };

  next();
}

// ✅ Good: Intrusion detection
class IntrusionDetector {
  constructor() {
    this.suspiciousPatterns = [
      /(\bor\b|\band\b).*=.*=/i, // SQL injection patterns
      /<script[^>]*>.*?<\/script>/i, // XSS patterns
      /javascript:/i,
      /vbscript:/i,
      /onload|onerror|onclick/i,
      /\.\.\//g, // Path traversal
      /\/etc\/passwd/i,
      /cmd\.exe|powershell/i
    ];

    this.rateLimits = new Map();
  }

  analyzeRequest(req) {
    const threats = [];

    // Check for suspicious patterns in all input
    const inputs = [
      ...Object.values(req.query || {}),
      ...Object.values(req.body || {}),
      req.get('User-Agent') || '',
      req.get('Referer') || ''
    ];

    for (const input of inputs) {
      if (typeof input === 'string') {
        for (const pattern of this.suspiciousPatterns) {
          if (pattern.test(input)) {
            threats.push({
              type: 'suspicious_pattern',
              pattern: pattern.toString(),
              input: input.substring(0, 100) // Truncate for logging
            });
          }
        }
      }
    }

    // Rate limiting check
    const clientId = req.ip;
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 100;

    if (!this.rateLimits.has(clientId)) {
      this.rateLimits.set(clientId, []);
    }

    const requests = this.rateLimits.get(clientId);
    const recentRequests = requests.filter(time => now - time < windowMs);

    if (recentRequests.length >= maxRequests) {
      threats.push({
        type: 'rate_limit_exceeded',
        requestCount: recentRequests.length,
        windowMs
      });
    }

    recentRequests.push(now);
    this.rateLimits.set(clientId, recentRequests);

    return threats;
  }
}

const intrusionDetector = new IntrusionDetector();

app.use((req, res, next) => {
  const threats = intrusionDetector.analyzeRequest(req);

  if (threats.length > 0) {
    logSecurityEvent(SecurityEvents.SUSPICIOUS_ACTIVITY, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method,
      threats
    });

    // Block request if high-risk threats detected
    const highRiskThreats = threats.filter(t =>
      t.type === 'suspicious_pattern' || t.type === 'rate_limit_exceeded'
    );

    if (highRiskThreats.length > 0) {
      return res.status(429).json({ error: 'Request blocked due to suspicious activity' });
    }
  }

  next();
});
```

## Security Checklist | 安全检查清单

- [ ] Input validation is implemented for all user inputs
- [ ] SQL injection prevention with parameterized queries
- [ ] XSS prevention with proper output encoding
- [ ] Authentication uses strong password requirements
- [ ] Multi-factor authentication is available for sensitive accounts
- [ ] Authorization checks are implemented at all levels
- [ ] Sensitive data is encrypted at rest and in transit
- [ ] Security headers are properly configured
- [ ] Rate limiting is implemented for API endpoints
- [ ] Security logging and monitoring are in place
- [ ] Regular security testing and code reviews
- [ ] Dependencies are regularly updated and scanned for vulnerabilities
- [ ] Error messages don't reveal sensitive information
- [ ] Session management is secure
- [ ] File uploads are properly validated and sandboxed

## 安全检查清单

- [ ] 对所有用户输入实施输入验证
- [ ] 使用参数化查询防止 SQL 注入
- [ ] 通过适当的输出编码防止 XSS
- [ ] 身份验证使用强密码要求
- [ ] 敏感账户可使用多因素身份验证
- [ ] 在所有级别实施授权检查
- [ ] 敏感数据在静态和传输中加密
- [ ] 正确配置安全标头
- [ ] 为 API 端点实施速率限制
- [ ] 建立安全日志记录和监控
- [ ] 定期进行安全测试和代码审查
- [ ] 定期更新依赖项并扫描漏洞
- [ ] 错误消息不泄露敏感信息
- [ ] 会话管理安全
- [ ] 文件上传经过适当验证和沙箱化