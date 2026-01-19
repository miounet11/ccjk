# Migration Guide: From Basic to Advanced MCP Services

## Overview

This guide helps you migrate from basic MCP services (that Claude can handle natively) to advanced, production-ready services that provide unique value.

---

## Migration Timeline

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Phase 1: Immediate (Q1 2026)                               │
│  ├─ filesystem → Claude's native file access                │
│  └─ markdown → Claude's native markdown processing          │
│                                                             │
│  Phase 2: Short-term (Q2 2026)                              │
│  └─ fetch → Claude's web access (for simple requests)       │
│                                                             │
│  Phase 3: Long-term (Q3-Q4 2026)                            │
│  └─ sqlite → PostgreSQL/MongoDB (for production)            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Migration 1: filesystem → Claude's Native File Access

### Why Migrate?

**Claude can now:**
- ✅ Read files directly
- ✅ Write files directly
- ✅ List directory contents
- ✅ Create and delete files
- ✅ Handle file permissions

**No need for MCP service because:**
- No authentication required
- Simple file operations
- Claude has built-in file system access

### Before (Using filesystem MCP)

```typescript
import { filesystem } from '@modelcontextprotocol/server-filesystem';

// Read file
const content = await filesystem.readFile('/path/to/file.txt');

// Write file
await filesystem.writeFile('/path/to/output.txt', 'Hello World');

// List directory
const files = await filesystem.readdir('/path/to/directory');

// Create directory
await filesystem.mkdir('/path/to/new-directory');

// Delete file
await filesystem.unlink('/path/to/file.txt');
```

### After (Using Claude's Native Access)

```typescript
// Claude can handle these operations directly through conversation:

// Read file
"Please read the file at /path/to/file.txt"

// Write file
"Please write 'Hello World' to /path/to/output.txt"

// List directory
"Please list all files in /path/to/directory"

// Create directory
"Please create a directory at /path/to/new-directory"

// Delete file
"Please delete the file at /path/to/file.txt"
```

### Migration Steps

1. **Identify filesystem usage** in your codebase
2. **Replace with Claude's native access** through natural language
3. **Remove filesystem dependency** from package.json
4. **Update documentation** to reflect changes
5. **Test thoroughly** to ensure functionality

### Benefits of Migration

- ✅ **Simpler code** - No MCP service setup required
- ✅ **Fewer dependencies** - One less package to maintain
- ✅ **Better performance** - Direct access without MCP overhead
- ✅ **More flexible** - Natural language interface

### When to Keep filesystem MCP

Keep the filesystem MCP service if you need:
- ❗ **Complex file operations** - Advanced permissions, symbolic links
- ❗ **Batch operations** - Processing thousands of files
- ❗ **Performance-critical** - High-throughput file operations
- ❗ **Legacy systems** - Existing integrations that can't be changed

---

## Migration 2: markdown → Claude's Native Markdown Processing

### Why Migrate?

**Claude can now:**
- ✅ Parse markdown to HTML
- ✅ Generate markdown from text
- ✅ Transform markdown formats
- ✅ Extract metadata from markdown
- ✅ Validate markdown syntax

**No need for MCP service because:**
- Claude processes markdown natively
- No special tools required
- Built-in markdown understanding

### Before (Using markdown MCP)

```typescript
import { markdown } from '@modelcontextprotocol/server-markdown';

// Parse markdown to HTML
const html = await markdown.parse('# Hello World\n\nThis is **bold**.');

// Generate table of contents
const toc = await markdown.generateTOC(markdownContent);

// Validate markdown
const errors = await markdown.lint(markdownContent);

// Transform markdown
const transformed = await markdown.transform(markdownContent, {
  gfm: true,
  tables: true
});
```

### After (Using Claude's Native Processing)

```typescript
// Claude can handle these operations directly:

// Parse markdown to HTML
"Please convert this markdown to HTML: # Hello World\n\nThis is **bold**."

// Generate table of contents
"Please generate a table of contents for this markdown document"

// Validate markdown
"Please check this markdown for syntax errors"

// Transform markdown
"Please convert this markdown to GitHub-flavored markdown with tables"
```

### Migration Steps

1. **Identify markdown usage** in your codebase
2. **Replace with Claude's native processing** through natural language
3. **Remove markdown dependency** from package.json
4. **Update documentation** to reflect changes
5. **Test markdown rendering** to ensure compatibility

### Benefits of Migration

- ✅ **Simpler code** - No MCP service setup required
- ✅ **Better understanding** - Claude understands markdown context
- ✅ **More flexible** - Can handle custom markdown extensions
- ✅ **Fewer dependencies** - One less package to maintain

### When to Keep markdown MCP

Keep the markdown MCP service if you need:
- ❗ **Custom markdown extensions** - Proprietary syntax
- ❗ **Batch processing** - Converting thousands of markdown files
- ❗ **Specific rendering engine** - Must use particular markdown parser
- ❗ **Performance-critical** - High-throughput markdown processing

---

## Migration 3: fetch → Claude's Web Access (for simple requests)

### Why Migrate?

**Claude can now:**
- ✅ Make HTTP GET requests
- ✅ Fetch web pages
- ✅ Access public APIs
- ✅ Download content
- ✅ Parse responses

**No need for MCP service for:**
- Simple GET requests
- Public APIs without authentication
- Web scraping (basic)
- Content fetching

### Before (Using fetch MCP)

```typescript
import { fetch } from '@modelcontextprotocol/server-fetch';

// Simple GET request
const response = await fetch.get('https://api.example.com/data');

// Fetch web page
const html = await fetch.get('https://example.com');

// Download file
const file = await fetch.download('https://example.com/file.pdf');
```

### After (Using Claude's Web Access)

```typescript
// Claude can handle simple requests directly:

// Simple GET request
"Please fetch data from https://api.example.com/data"

// Fetch web page
"Please fetch the content from https://example.com"

// Download file
"Please download the file from https://example.com/file.pdf"
```

### When to Keep fetch MCP

**Keep the fetch MCP service for:**

✅ **Complex Authentication**
```typescript
// OAuth flows, JWT tokens, API keys
await fetch.get('https://api.example.com/data', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-API-Key': apiKey
  }
});
```

✅ **POST/PUT/DELETE Requests**
```typescript
// Creating, updating, deleting resources
await fetch.post('https://api.example.com/users', {
  body: JSON.stringify({ name: 'John' }),
  headers: { 'Content-Type': 'application/json' }
});
```

✅ **Custom Headers and Options**
```typescript
// Complex request configuration
await fetch.get('https://api.example.com/data', {
  headers: { 'Accept': 'application/vnd.api+json' },
  timeout: 30000,
  maxRedirects: 5,
  proxy: 'http://proxy.example.com:8080'
});
```

✅ **File Uploads**
```typescript
// Multipart form data
await fetch.post('https://api.example.com/upload', {
  body: formData,
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

### Migration Steps

1. **Audit fetch usage** - Identify simple vs. complex requests
2. **Migrate simple requests** to Claude's web access
3. **Keep complex requests** using fetch MCP
4. **Update documentation** to clarify when to use each approach
5. **Test API integrations** thoroughly

### Benefits of Partial Migration

- ✅ **Simpler code** for basic requests
- ✅ **Fewer dependencies** for simple use cases
- ✅ **Better performance** for public APIs
- ✅ **Keep fetch MCP** for complex scenarios

---

## Migration 4: sqlite → PostgreSQL/MongoDB (for production)

### Why Migrate?

**SQLite limitations:**
- ❌ File-based (not suitable for production)
- ❌ Limited concurrency
- ❌ No user authentication
- ❌ No replication or clustering
- ❌ Limited data types

**PostgreSQL/MongoDB advantages:**
- ✅ Production-ready with authentication
- ✅ High concurrency and performance
- ✅ Replication and high availability
- ✅ Advanced features (JSON, full-text search)
- ✅ Enterprise support

### Before (Using SQLite)

```typescript
import { sqlite } from '@modelcontextprotocol/server-sqlite';

// Connect to database
await sqlite.connect('~/data/app.db');

// Query data
const users = await sqlite.query('SELECT * FROM users WHERE active = 1');

// Insert data
await sqlite.query('INSERT INTO users (name, email) VALUES (?, ?)', ['John', 'john@example.com']);

// Transaction
await sqlite.transaction(async (tx) => {
  await tx.query('UPDATE accounts SET balance = balance - 100 WHERE id = 1');
  await tx.query('UPDATE accounts SET balance = balance + 100 WHERE id = 2');
});
```

### After (Using PostgreSQL)

```typescript
import { postgres } from '@modelcontextprotocol/server-postgres';

// Connect to database (with authentication)
await postgres.connect({
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  user: 'myuser',
  password: process.env.DB_PASSWORD
});

// Query data (same syntax)
const users = await postgres.query('SELECT * FROM users WHERE active = true');

// Insert data (same syntax)
await postgres.query('INSERT INTO users (name, email) VALUES ($1, $2)', ['John', 'john@example.com']);

// Transaction (same syntax)
await postgres.transaction(async (client) => {
  await client.query('UPDATE accounts SET balance = balance - 100 WHERE id = 1');
  await client.query('UPDATE accounts SET balance = balance + 100 WHERE id = 2');
});
```

### After (Using MongoDB)

```typescript
import { mongodb } from '@modelcontextprotocol/server-mongodb';

// Connect to database (with authentication)
await mongodb.connect({
  url: 'mongodb://localhost:27017',
  database: 'myapp',
  user: 'myuser',
  password: process.env.DB_PASSWORD
});

// Query data (NoSQL syntax)
const users = await mongodb.collection('users').find({ active: true }).toArray();

// Insert data (NoSQL syntax)
await mongodb.collection('users').insertOne({
  name: 'John',
  email: 'john@example.com',
  createdAt: new Date()
});

// Transaction (NoSQL syntax)
await mongodb.transaction(async (session) => {
  await mongodb.collection('accounts').updateOne(
    { _id: 1 },
    { $inc: { balance: -100 } },
    { session }
  );
  await mongodb.collection('accounts').updateOne(
    { _id: 2 },
    { $inc: { balance: 100 } },
    { session }
  );
});
```

### Migration Steps

#### Step 1: Choose Your Database

**Choose PostgreSQL if:**
- ✅ You need relational data with foreign keys
- ✅ You need ACID transactions
- ✅ You need complex joins and queries
- ✅ You have structured data with fixed schema

**Choose MongoDB if:**
- ✅ You need flexible schema
- ✅ You have document-based data
- ✅ You need horizontal scaling
- ✅ You have nested/hierarchical data

#### Step 2: Set Up Production Database

**PostgreSQL Setup:**
```bash
# Install PostgreSQL
brew install postgresql  # macOS
sudo apt install postgresql  # Ubuntu

# Create database and user
createdb myapp
createuser myuser -P  # Enter password

# Grant permissions
psql -d myapp -c "GRANT ALL PRIVILEGES ON DATABASE myapp TO myuser;"
```

**MongoDB Setup:**
```bash
# Install MongoDB
brew install mongodb-community  # macOS
sudo apt install mongodb  # Ubuntu

# Start MongoDB
brew services start mongodb-community  # macOS
sudo systemctl start mongodb  # Ubuntu

# Create user
mongosh
use myapp
db.createUser({
  user: "myuser",
  pwd: "password",
  roles: [{ role: "readWrite", db: "myapp" }]
})
```

#### Step 3: Migrate Schema

**PostgreSQL Schema Migration:**
```sql
-- Create tables
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  balance DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
```

**MongoDB Schema Migration:**
```javascript
// Create collections (schema-less, but define indexes)
db.createCollection('users');
db.createCollection('accounts');

// Create indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.accounts.createIndex({ userId: 1 });
```

#### Step 4: Migrate Data

**Export from SQLite:**
```bash
# Export to CSV
sqlite3 app.db ".mode csv" ".output users.csv" "SELECT * FROM users;"

# Or export to SQL
sqlite3 app.db .dump > dump.sql
```

**Import to PostgreSQL:**
```bash
# Import CSV
psql -d myapp -c "\COPY users FROM 'users.csv' CSV HEADER;"

# Or import SQL (after editing for PostgreSQL syntax)
psql -d myapp -f dump.sql
```

**Import to MongoDB:**
```bash
# Import CSV
mongoimport --db myapp --collection users --type csv --headerline --file users.csv

# Or import JSON
mongoimport --db myapp --collection users --file users.json
```

#### Step 5: Update Application Code

**Update connection configuration:**
```typescript
// Before (SQLite)
const db = await sqlite.connect('~/data/app.db');

// After (PostgreSQL)
const db = await postgres.connect({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'myapp',
  user: process.env.DB_USER || 'myuser',
  password: process.env.DB_PASSWORD
});

// After (MongoDB)
const db = await mongodb.connect({
  url: process.env.MONGODB_URL || 'mongodb://localhost:27017',
  database: process.env.DB_NAME || 'myapp',
  user: process.env.DB_USER || 'myuser',
  password: process.env.DB_PASSWORD
});
```

**Update queries (PostgreSQL - minimal changes):**
```typescript
// SQLite uses ? placeholders
await sqlite.query('SELECT * FROM users WHERE id = ?', [userId]);

// PostgreSQL uses $1, $2, etc.
await postgres.query('SELECT * FROM users WHERE id = $1', [userId]);
```

**Update queries (MongoDB - significant changes):**
```typescript
// SQLite SQL syntax
await sqlite.query('SELECT * FROM users WHERE active = 1');

// MongoDB NoSQL syntax
await mongodb.collection('users').find({ active: true }).toArray();
```

#### Step 6: Test Thoroughly

```typescript
// Test connection
await db.ping();

// Test queries
const users = await db.query('SELECT * FROM users LIMIT 10');
console.log(`Found ${users.length} users`);

// Test transactions
await db.transaction(async (client) => {
  // Your transaction logic
});

// Test performance
const start = Date.now();
await db.query('SELECT * FROM users WHERE active = true');
console.log(`Query took ${Date.now() - start}ms`);
```

#### Step 7: Deploy to Production

```bash
# Set environment variables
export DB_HOST=production-db.example.com
export DB_PORT=5432
export DB_NAME=myapp_production
export DB_USER=myapp_user
export DB_PASSWORD=secure_password

# Run migrations
npm run migrate

# Start application
npm start
```

### Benefits of Migration

- ✅ **Production-ready** - Authentication, replication, backups
- ✅ **Better performance** - Connection pooling, query optimization
- ✅ **Scalability** - Handle millions of records
- ✅ **High availability** - Replication and failover
- ✅ **Enterprise features** - Advanced security, compliance

### When to Keep SQLite

Keep SQLite if you need:
- ✅ **Embedded database** - Desktop applications
- ✅ **Prototyping** - Quick development and testing
- ✅ **Single-user apps** - No concurrency requirements
- ✅ **Edge computing** - IoT devices, mobile apps
- ✅ **Testing** - Unit tests with in-memory database

---

## Summary: Migration Decision Matrix

| Service | Migrate To | When to Migrate | When to Keep |
|---------|-----------|-----------------|--------------|
| **filesystem** | Claude's native access | ✅ Simple file operations | ❗ Complex permissions, batch ops |
| **markdown** | Claude's native processing | ✅ Basic markdown parsing | ❗ Custom extensions, batch processing |
| **fetch** | Claude's web access | ✅ Simple GET requests | ❗ Authentication, POST/PUT/DELETE |
| **sqlite** | PostgreSQL/MongoDB | ✅ Production applications | ❗ Embedded apps, prototyping |

---

## Migration Checklist

### Pre-Migration
- [ ] Audit current MCP service usage
- [ ] Identify simple vs. complex use cases
- [ ] Choose target solution (Claude native or advanced MCP)
- [ ] Review migration guide
- [ ] Plan migration timeline

### During Migration
- [ ] Update code to use new approach
- [ ] Update configuration and environment variables
- [ ] Migrate data (if applicable)
- [ ] Update documentation
- [ ] Update tests

### Post-Migration
- [ ] Test thoroughly in development
- [ ] Test in staging environment
- [ ] Monitor performance and errors
- [ ] Deploy to production
- [ ] Remove deprecated dependencies

### Rollback Plan
- [ ] Keep old code in version control
- [ ] Document rollback procedure
- [ ] Test rollback in staging
- [ ] Monitor for issues post-migration
- [ ] Have support team ready

---

## Support and Resources

### Documentation
- [Claude File Access Documentation](https://docs.anthropic.com/claude/file-access)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [MongoDB Documentation](https://docs.mongodb.com/)

### Community Support
- [MCP Community Forum](https://community.mcp.dev)
- [PostgreSQL Community](https://www.postgresql.org/community/)
- [MongoDB Community](https://www.mongodb.com/community/)

### Professional Support
- [Anthropic Support](https://support.anthropic.com)
- [PostgreSQL Professional Support](https://www.postgresql.org/support/professional_support/)
- [MongoDB Enterprise Support](https://www.mongodb.com/support)

---

## Conclusion

Migrating from basic to advanced MCP services ensures your applications are:
- ✅ **Production-ready** with proper authentication and security
- ✅ **Scalable** to handle growth
- ✅ **Maintainable** with fewer dependencies
- ✅ **Future-proof** against Claude's evolving capabilities

**Remember:** Migrate when it makes sense for your use case. Keep basic services for prototyping and simple applications, but upgrade to advanced services for production deployments.
