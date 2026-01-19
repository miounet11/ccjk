# Security Audit | 安全审计

A comprehensive skill for auditing code security vulnerabilities and enforcing security best practices.

全面的代码安全审计技能，用于检测安全漏洞并执行安全最佳实践。

## When to Apply | 适用场景

- When reviewing code for security vulnerabilities | 审查代码安全漏洞时
- When implementing authentication/authorization | 实现认证授权时
- When handling user input | 处理用户输入时
- When working with databases | 操作数据库时
- When managing sensitive data | 管理敏感数据时
- When auditing dependencies | 审计依赖项时
- Before deploying to production | 部署到生产环境前

## Overview | 概述

This skill helps identify and prevent common security vulnerabilities in your codebase. It covers OWASP Top 10 vulnerabilities and provides actionable remediation guidance.

此技能帮助识别和预防代码库中的常见安全漏洞。涵盖 OWASP Top 10 漏洞并提供可操作的修复指导。

---

## Rules | 规则

### `sec-001`: XSS Prevention | XSS 防护

**Priority**: CRITICAL | 优先级：严重

Cross-Site Scripting (XSS) allows attackers to inject malicious scripts into web pages viewed by other users.

跨站脚本攻击（XSS）允许攻击者将恶意脚本注入到其他用户查看的网页中。

#### Types of XSS | XSS 类型

| Type | Description | 描述 |
|------|-------------|------|
| Reflected | Script from URL parameters | URL 参数中的脚本 |
| Stored | Script saved in database | 存储在数据库中的脚本 |
| DOM-based | Script manipulates DOM | 脚本操作 DOM |

#### **❌ Bad | 错误示例:**

```javascript
// Directly inserting user input into HTML
// 直接将用户输入插入 HTML
document.innerHTML = userInput;

// Using eval with user data
// 使用 eval 处理用户数据
eval(userInput);

// Unescaped template literals
// 未转义的模板字符串
const html = `<div>${userInput}</div>`;
element.innerHTML = html;
```

```python
# Flask without escaping
# Flask 未转义
return f"<h1>Hello {username}</h1>"

# Django with safe filter on user input
# Django 对用户输入使用 safe 过滤器
{{ user_input|safe }}
```

#### **✅ Good | 正确示例:**

```javascript
// Use textContent for plain text
// 使用 textContent 处理纯文本
element.textContent = userInput;

// Use DOMPurify for HTML content
// 使用 DOMPurify 处理 HTML 内容
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(userInput);

// Use framework's built-in escaping (React)
// 使用框架内置转义（React）
return <div>{userInput}</div>;

// Content Security Policy header
// 内容安全策略头
Content-Security-Policy: default-src 'self'; script-src 'self'
```

```python
# Flask with auto-escaping (Jinja2)
# Flask 自动转义（Jinja2）
from markupsafe import escape
return f"<h1>Hello {escape(username)}</h1>"

# Django auto-escapes by default
# Django 默认自动转义
{{ user_input }}
```

---

### `sec-002`: SQL Injection Prevention | SQL 注入防护

**Priority**: CRITICAL | 优先级：严重

SQL injection allows attackers to execute arbitrary SQL commands on your database.

SQL 注入允许攻击者在数据库上执行任意 SQL 命令。

#### **❌ Bad | 错误示例:**

```javascript
// String concatenation in queries
// 查询中的字符串拼接
const query = `SELECT * FROM users WHERE id = ${userId}`;
db.query(query);

// Template literals without parameterization
// 未参数化的模板字符串
const sql = `SELECT * FROM products WHERE name = '${productName}'`;
```

```python
# String formatting in SQL
# SQL 中的字符串格式化
cursor.execute(f"SELECT * FROM users WHERE email = '{email}'")

# Percent formatting
# 百分号格式化
cursor.execute("SELECT * FROM users WHERE id = %s" % user_id)
```

```java
// String concatenation
// 字符串拼接
String query = "SELECT * FROM users WHERE username = '" + username + "'";
Statement stmt = connection.createStatement();
ResultSet rs = stmt.executeQuery(query);
```

#### **✅ Good | 正确示例:**

```javascript
// Parameterized queries
// 参数化查询
const query = 'SELECT * FROM users WHERE id = ?';
db.query(query, [userId]);

// Using ORM (Prisma)
// 使用 ORM（Prisma）
const user = await prisma.user.findUnique({
  where: { id: userId }
});

// Using query builder (Knex)
// 使用查询构建器（Knex）
const users = await knex('users').where('id', userId);
```

```python
# Parameterized queries
# 参数化查询
cursor.execute("SELECT * FROM users WHERE email = %s", (email,))

# Using ORM (SQLAlchemy)
# 使用 ORM（SQLAlchemy）
user = session.query(User).filter(User.email == email).first()

# Django ORM
# Django ORM
user = User.objects.get(email=email)
```

```java
// PreparedStatement
// 预处理语句
String query = "SELECT * FROM users WHERE username = ?";
PreparedStatement pstmt = connection.prepareStatement(query);
pstmt.setString(1, username);
ResultSet rs = pstmt.executeQuery();
```

---

### `sec-003`: CSRF Protection | CSRF 防护

**Priority**: HIGH | 优先级：高

Cross-Site Request Forgery tricks users into performing unwanted actions on authenticated sites.

跨站请求伪造诱骗用户在已认证的网站上执行非预期操作。

#### **❌ Bad | 错误示例:**

```html
<!-- Form without CSRF token -->
<!-- 没有 CSRF 令牌的表单 -->
<form action="/transfer" method="POST">
  <input name="amount" value="1000">
  <input name="to" value="attacker">
  <button type="submit">Transfer</button>
</form>
```

```javascript
// API without CSRF protection
// 没有 CSRF 保护的 API
app.post('/api/transfer', (req, res) => {
  // Process transfer without verification
  // 未验证直接处理转账
  processTransfer(req.body);
});
```

#### **✅ Good | 正确示例:**

```html
<!-- Form with CSRF token -->
<!-- 带有 CSRF 令牌的表单 -->
<form action="/transfer" method="POST">
  <input type="hidden" name="_csrf" value="{{ csrfToken }}">
  <input name="amount" value="1000">
  <button type="submit">Transfer</button>
</form>
```

```javascript
// Express with csurf middleware
// Express 使用 csurf 中间件
import csrf from 'csurf';
const csrfProtection = csrf({ cookie: true });

app.post('/api/transfer', csrfProtection, (req, res) => {
  processTransfer(req.body);
});

// SameSite cookie attribute
// SameSite cookie 属性
res.cookie('session', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict'
});
```

```python
# Django CSRF protection (enabled by default)
# Django CSRF 保护（默认启用）
{% csrf_token %}

# Flask-WTF CSRF protection
# Flask-WTF CSRF 保护
from flask_wtf.csrf import CSRFProtect
csrf = CSRFProtect(app)
```

---

### `sec-004`: Authentication & Authorization | 认证与授权

**Priority**: CRITICAL | 优先级：严重

Proper authentication verifies user identity; authorization controls access to resources.

正确的认证验证用户身份；授权控制对资源的访问。

#### **❌ Bad | 错误示例:**

```javascript
// Storing passwords in plain text
// 明文存储密码
const user = { password: req.body.password };
await db.users.insert(user);

// Weak password comparison
// 弱密码比较
if (user.password === inputPassword) { /* login */ }

// Missing authorization check
// 缺少授权检查
app.delete('/api/users/:id', (req, res) => {
  // No check if user can delete this resource
  // 未检查用户是否有权删除此资源
  deleteUser(req.params.id);
});

// JWT stored in localStorage
// JWT 存储在 localStorage
localStorage.setItem('token', jwt);
```

#### **✅ Good | 正确示例:**

```javascript
// Hash passwords with bcrypt
// 使用 bcrypt 哈希密码
import bcrypt from 'bcrypt';
const saltRounds = 12;
const hashedPassword = await bcrypt.hash(password, saltRounds);

// Secure password comparison
// 安全的密码比较
const isValid = await bcrypt.compare(inputPassword, user.hashedPassword);

// Authorization middleware
// 授权中间件
const authorize = (requiredRole) => (req, res, next) => {
  if (!req.user || req.user.role !== requiredRole) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

app.delete('/api/users/:id', authorize('admin'), (req, res) => {
  deleteUser(req.params.id);
});

// JWT in httpOnly cookie
// JWT 存储在 httpOnly cookie
res.cookie('token', jwt, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 3600000
});
```

```python
# Django password hashing (automatic)
# Django 密码哈希（自动）
from django.contrib.auth.hashers import make_password, check_password
hashed = make_password(password)
is_valid = check_password(input_password, hashed)

# Permission decorator
# 权限装饰器
from django.contrib.auth.decorators import permission_required

@permission_required('app.delete_user')
def delete_user(request, user_id):
    # Only users with permission can access
    # 只有有权限的用户才能访问
    pass
```

---

### `sec-005`: Sensitive Data Handling | 敏感数据处理

**Priority**: HIGH | 优先级：高

Sensitive data must be encrypted, masked, and never exposed in logs or responses.

敏感数据必须加密、脱敏，且永远不能暴露在日志或响应中。

#### **❌ Bad | 错误示例:**

```javascript
// Logging sensitive data
// 记录敏感数据
console.log('User login:', { email, password });

// Exposing sensitive data in API response
// 在 API 响应中暴露敏感数据
res.json(user); // includes password hash, SSN, etc.

// Hardcoded secrets
// 硬编码密钥
const API_KEY = 'sk-1234567890abcdef';
const DB_PASSWORD = 'admin123';

// Sensitive data in URL
// URL 中的敏感数据
fetch(`/api/users?ssn=${ssn}&creditCard=${cardNumber}`);
```

```python
# Secrets in code
# 代码中的密钥
DATABASE_URL = "postgresql://user:password123@localhost/db"

# Logging sensitive info
# 记录敏感信息
logger.info(f"Processing payment for card {card_number}")
```

#### **✅ Good | 正确示例:**

```javascript
// Use environment variables
// 使用环境变量
const API_KEY = process.env.API_KEY;
const DB_PASSWORD = process.env.DB_PASSWORD;

// Sanitize logs
// 清理日志
console.log('User login:', { email, password: '[REDACTED]' });

// Select specific fields for response
// 为响应选择特定字段
const safeUser = {
  id: user.id,
  email: user.email,
  name: user.name
};
res.json(safeUser);

// Mask sensitive data
// 脱敏敏感数据
const maskCard = (card) => `****-****-****-${card.slice(-4)}`;

// Use POST for sensitive data
// 使用 POST 传输敏感数据
fetch('/api/payment', {
  method: 'POST',
  body: JSON.stringify({ cardNumber, cvv })
});

// Encrypt sensitive data at rest
// 静态加密敏感数据
import crypto from 'crypto';
const encrypted = crypto.publicEncrypt(publicKey, Buffer.from(sensitiveData));
```

```python
# Environment variables
# 环境变量
import os
DATABASE_URL = os.environ.get('DATABASE_URL')

# Masked logging
# 脱敏日志
logger.info(f"Processing payment for card ****{card_number[-4:]}")

# Django SECRET_KEY from environment
# Django SECRET_KEY 从环境变量获取
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')
```

---

### `sec-006`: Dependency Security | 依赖安全

**Priority**: HIGH | 优先级：高

Third-party dependencies can introduce vulnerabilities into your application.

第三方依赖可能会将漏洞引入您的应用程序。

#### **❌ Bad | 错误示例:**

```json
// package.json with outdated/vulnerable packages
// 包含过时/有漏洞包的 package.json
{
  "dependencies": {
    "lodash": "4.17.15",  // Known prototype pollution
    "axios": "0.18.0",    // Known SSRF vulnerability
    "express": "3.0.0"    // End of life, many CVEs
  }
}
```

```python
# requirements.txt with vulnerable packages
# 包含有漏洞包的 requirements.txt
Django==2.0  # Multiple CVEs
requests==2.5.0  # Security issues
PyYAML==3.13  # Arbitrary code execution
```

#### **✅ Good | 正确示例:**

```json
// package.json with security practices
// 包含安全实践的 package.json
{
  "dependencies": {
    "lodash": "^4.17.21",
    "axios": "^1.6.0",
    "express": "^4.18.0"
  },
  "scripts": {
    "audit": "npm audit",
    "audit:fix": "npm audit fix"
  }
}
```

```bash
# Regular security audits
# 定期安全审计
npm audit
npm audit fix

# Use Snyk for continuous monitoring
# 使用 Snyk 进行持续监控
npx snyk test
npx snyk monitor

# Python security scanning
# Python 安全扫描
pip-audit
safety check

# Lock file for reproducible builds
# 锁定文件用于可重现构建
npm ci  # Uses package-lock.json
pip install -r requirements.txt --require-hashes
```

```yaml
# GitHub Actions security workflow
# GitHub Actions 安全工作流
name: Security Audit
on:
  push:
  schedule:
    - cron: '0 0 * * *'  # Daily
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=high
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

---

### `sec-007`: Input Validation | 输入验证

**Priority**: HIGH | 优先级：高

All user input must be validated, sanitized, and constrained.

所有用户输入必须经过验证、清理和约束。

#### **❌ Bad | 错误示例:**

```javascript
// No validation
// 无验证
app.post('/api/users', (req, res) => {
  const { email, age, role } = req.body;
  createUser({ email, age, role }); // Accepts anything
});

// Client-side only validation
// 仅客户端验证
<input type="email" required>  // Can be bypassed
```

#### **✅ Good | 正确示例:**

```javascript
// Server-side validation with Zod
// 使用 Zod 进行服务端验证
import { z } from 'zod';

const userSchema = z.object({
  email: z.string().email().max(255),
  age: z.number().int().min(0).max(150),
  role: z.enum(['user', 'admin']),
  name: z.string().min(1).max(100).regex(/^[a-zA-Z\s]+$/)
});

app.post('/api/users', (req, res) => {
  const result = userSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.issues });
  }
  createUser(result.data);
});

// Express-validator
// Express-validator
import { body, validationResult } from 'express-validator';

app.post('/api/users', [
  body('email').isEmail().normalizeEmail(),
  body('age').isInt({ min: 0, max: 150 }),
  body('role').isIn(['user', 'admin'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  createUser(req.body);
});
```

```python
# Pydantic validation
# Pydantic 验证
from pydantic import BaseModel, EmailStr, conint, constr

class UserCreate(BaseModel):
    email: EmailStr
    age: conint(ge=0, le=150)
    role: Literal['user', 'admin']
    name: constr(min_length=1, max_length=100, regex=r'^[a-zA-Z\s]+$')

@app.post('/api/users')
def create_user(user: UserCreate):
    # Automatically validated
    # 自动验证
    return save_user(user)
```

---

### `sec-008`: Secure Communication | 安全通信

**Priority**: HIGH | 优先级：高

All data in transit must be encrypted using TLS/HTTPS.

所有传输中的数据必须使用 TLS/HTTPS 加密。

#### **❌ Bad | 错误示例:**

```javascript
// HTTP instead of HTTPS
// 使用 HTTP 而非 HTTPS
fetch('http://api.example.com/data');

// Disabled SSL verification
// 禁用 SSL 验证
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Missing security headers
// 缺少安全头
app.get('/', (req, res) => {
  res.send('Hello');
});
```

#### **✅ Good | 正确示例:**

```javascript
// Always use HTTPS
// 始终使用 HTTPS
fetch('https://api.example.com/data');

// Force HTTPS redirect
// 强制 HTTPS 重定向
app.use((req, res, next) => {
  if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
    return res.redirect(`https://${req.get('host')}${req.url}`);
  }
  next();
});

// Security headers with Helmet
// 使用 Helmet 设置安全头
import helmet from 'helmet';
app.use(helmet());

// HSTS header
// HSTS 头
app.use(helmet.hsts({
  maxAge: 31536000,
  includeSubDomains: true,
  preload: true
}));

// Certificate pinning for mobile apps
// 移动应用的证书固定
const https = require('https');
const options = {
  hostname: 'api.example.com',
  port: 443,
  checkServerIdentity: (host, cert) => {
    // Verify certificate fingerprint
    // 验证证书指纹
  }
};
```

---

### `sec-009`: Error Handling | 错误处理

**Priority**: MEDIUM | 优先级：中

Error messages should not expose sensitive information or system details.

错误消息不应暴露敏感信息或系统详情。

#### **❌ Bad | 错误示例:**

```javascript
// Exposing stack traces
// 暴露堆栈跟踪
app.use((err, req, res, next) => {
  res.status(500).json({
    error: err.message,
    stack: err.stack,  // Reveals internal structure
    query: req.query   // Reveals user input
  });
});

// Detailed database errors
// 详细的数据库错误
catch (err) {
  res.json({ error: `Database error: ${err.message}` });
  // Reveals: "Database error: relation 'users' does not exist"
}
```

#### **✅ Good | 正确示例:**

```javascript
// Generic error messages for users
// 给用户的通用错误消息
app.use((err, req, res, next) => {
  // Log detailed error internally
  // 内部记录详细错误
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    requestId: req.id
  });

  // Return generic message to user
  // 返回通用消息给用户
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500
    ? 'An unexpected error occurred'
    : err.message;

  res.status(statusCode).json({
    error: message,
    requestId: req.id  // For support reference
  });
});

// Custom error classes
// 自定义错误类
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
  }
}

// Usage
throw new AppError('User not found', 404);
throw new AppError('Invalid credentials', 401);
```

---

### `sec-010`: File Upload Security | 文件上传安全

**Priority**: HIGH | 优先级：高

File uploads must be validated, sanitized, and stored securely.

文件上传必须经过验证、清理并安全存储。

#### **❌ Bad | 错误示例:**

```javascript
// No file validation
// 无文件验证
app.post('/upload', upload.single('file'), (req, res) => {
  // Accepts any file type and size
  // 接受任何文件类型和大小
  fs.rename(req.file.path, `./uploads/${req.file.originalname}`);
});

// Using user-provided filename
// 使用用户提供的文件名
const filename = req.body.filename;  // Could be "../../../etc/passwd"
fs.writeFile(`./uploads/${filename}`, data);
```

#### **✅ Good | 正确示例:**

```javascript
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

// Configure multer with restrictions
// 配置 multer 限制
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    // Generate random filename
    // 生成随机文件名
    const uniqueName = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueName}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,  // 5MB max
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Whitelist allowed types
    // 白名单允许的类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif'];

    const ext = path.extname(file.originalname).toLowerCase();
    const isValidType = allowedTypes.includes(file.mimetype);
    const isValidExt = allowedExts.includes(ext);

    if (isValidType && isValidExt) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Validate file content (magic bytes)
// 验证文件内容（魔术字节）
import fileType from 'file-type';

app.post('/upload', upload.single('file'), async (req, res) => {
  const buffer = fs.readFileSync(req.file.path);
  const type = await fileType.fromBuffer(buffer);

  if (!type || !['image/jpeg', 'image/png'].includes(type.mime)) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Invalid file content' });
  }

  res.json({ filename: req.file.filename });
});
```

---

## Security Checklist | 安全检查清单

### Pre-Deployment Checklist | 部署前检查清单

| Category | Check | 检查项 |
|----------|-------|--------|
| **XSS** | All user input escaped in HTML | 所有用户输入在 HTML 中已转义 |
| **XSS** | CSP headers configured | CSP 头已配置 |
| **SQL** | All queries parameterized | 所有查询已参数化 |
| **SQL** | ORM/Query builder used | 使用 ORM/查询构建器 |
| **CSRF** | CSRF tokens on all forms | 所有表单有 CSRF 令牌 |
| **CSRF** | SameSite cookies enabled | SameSite cookies 已启用 |
| **Auth** | Passwords hashed with bcrypt/argon2 | 密码使用 bcrypt/argon2 哈希 |
| **Auth** | Session tokens are secure | 会话令牌安全 |
| **Auth** | Authorization checks on all endpoints | 所有端点有授权检查 |
| **Data** | No secrets in code | 代码中无密钥 |
| **Data** | Sensitive data encrypted | 敏感数据已加密 |
| **Data** | Logs sanitized | 日志已清理 |
| **Deps** | No known vulnerabilities | 无已知漏洞 |
| **Deps** | Dependencies up to date | 依赖已更新 |
| **Input** | Server-side validation | 服务端验证 |
| **Comm** | HTTPS enforced | 强制 HTTPS |
| **Comm** | Security headers set | 安全头已设置 |
| **Error** | No stack traces exposed | 未暴露堆栈跟踪 |
| **Files** | Upload validation enabled | 上传验证已启用 |

---

## Integration | 集成

This skill works best with:

此技能最适合与以下工具配合使用：

- **Static Analysis Tools**: ESLint security plugins, Semgrep, SonarQube
- **Dependency Scanners**: npm audit, Snyk, Dependabot
- **DAST Tools**: OWASP ZAP, Burp Suite
- **Secret Scanners**: git-secrets, truffleHog, detect-secrets
- **CI/CD Integration**: GitHub Actions, GitLab CI security scanning

---

## Resources | 资源

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Django Security](https://docs.djangoproject.com/en/stable/topics/security/)
