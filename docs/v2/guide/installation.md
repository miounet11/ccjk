# Installation Guide | 安装指南

This guide covers all installation methods for CCJK v2.0, including system requirements and troubleshooting.

## 📋 Prerequisites | 系统要求

### Required Software
- **Node.js**: >= 18.0.0 (recommended: 20.x LTS)
- **Package Manager**: npm >= 9.0.0, pnpm >= 8.0.0, or yarn >= 1.22.0
- **Git**: >= 2.40 (required for traceability features)
- **Redis**: >= 7.0 (required for agents network)

### Optional Software
- **Docker**: >= 24.0 (for Redis container)
- **VS Code**: latest version (for best development experience)
- **TypeScript**: >= 5.3 (if using TypeScript)

## 🔍 Verify Your Environment

Check if your environment meets the requirements:

```bash
# Check Node.js version
node --version  # Should be >= 18.0.0

# Check npm version
npm --version   # Should be >= 9.0.0

# Check Git version
git --version   # Should be >= 2.40

# Check Redis (if installed)
redis-cli --version  # Should be >= 7.0
```

## 📦 Installation Methods

### Method 1: Global Installation (Recommended)

Install CCJK globally to use it from any project:

```bash
# Using npm
npm install -g ccjk@latest

# Using pnpm (recommended for better performance)
pnpm install -g ccjk@latest

# Using yarn
yarn global add ccjk@latest
```

**Verify installation**:
```bash
ccjk --version
# Expected output: CCJK v2.0.0
```

### Method 2: Project-Specific Installation

Install CCJK in a specific project:

```bash
# Navigate to your project
cd /path/to/your/project

# Install as dev dependency
npm install -D ccjk@latest

# Or using pnpm
pnpm install -D ccjk@latest
```

Use via npx:
```bash
npx ccjk --version
```

### Method 3: One-Time Execution (No Installation)

Use CCJK without installing:

```bash
npx ccjk@latest init
```

## 🔧 Redis Installation (Required for Agents)

### Option 1: Docker (Recommended)

```bash
# Pull and run Redis
docker run -d -p 6379:6379 --name ccjk-redis redis:7-alpine

# Verify Redis is running
docker ps | grep ccjk-redis

# Test connection
redis-cli ping
# Expected output: PONG
```

### Option 2: System Installation

**macOS** (using Homebrew):
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian**:
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
```

**Windows** (using WSL):
```bash
# Install Redis inside WSL
sudo apt update
sudo apt install redis-server
sudo service redis-server start
```

### Option 3: Cloud Redis

Use a cloud Redis provider:
- [Redis Cloud](https://redis.com/try-free/)
- [AWS ElastiCache](https://aws.amazon.com/elasticache/)
- [Azure Cache for Redis](https://azure.microsoft.com/services/cache/)

Set environment variable:
```bash
export CCJK_REDIS_URL=redis://your-redis-endpoint:6379
```

## 🚀 Initial Setup

After installation, run the initialization wizard:

```bash
# Interactive setup
ccjk init

# Or with specific options
ccjk init --with-redis --with-hooks --with-skills
```

The wizard will:
1. Create `ccjk.config.json` in your project
2. Set up Git hooks for traceability
3. Configure Redis connection (if enabled)
4. Initialize skills directory
5. Create default hooks

## 📁 Directory Structure

After initialization, your project will have:

```
your-project/
├── ccjk.config.json          # CCJK configuration
├── .ccjk/                    # CCJK working directory
│   ├── hooks/                # Hook definitions
│   ├── skills/               # Skills DSL files
│   ├── agents/               # Agent configurations
│   └── traces/               # Traceability data
├── .git/
│   └── hooks/                # Git hooks (auto-created)
└── node_modules/
    └── ccjk/                 # CCJK installation
```

## ⚙️ Configuration

### Basic Configuration

Create or edit `ccjk.config.json`:

```json
{
  "$schema": "https://ccjk.dev/schema/v2.0.0/config.json",
  "version": "2.0.0",
  "project": {
    "name": "your-project",
    "root": "."
  },
  "hooks": {
    "enabled": true,
    "directory": ".ccjk/hooks",
    "enforcementLevel": "L2_STRONGLY_RECOMMENDED"
  },
  "skills": {
    "enabled": true,
    "directory": ".ccjk/skills"
  },
  "agents": {
    "enabled": true,
    "redis": {
      "host": "localhost",
      "port": 6379,
      "db": 0
    }
  },
  "traceability": {
    "enabled": true,
    "level": "full",
    "autoTrace": true
  }
}
```

### Environment Variables

Create `.env` file:

```bash
# Redis configuration
CCJK_REDIS_HOST=localhost
CCJK_REDIS_PORT=6379
CCJK_REDIS_DB=0

# Traceability
CCJK_TRACE_LEVEL=full
CCJK_AUTO_TRACE=true

# Hooks
CCJK_HOOK_ENFORCEMENT=L2_STRONGLY_RECOMMENDED

# Skills
CCJK_SKILLS_DIR=.ccjk/skills

# Logging
CCJK_LOG_LEVEL=info
CCJK_LOG_FILE=.ccjk/logs/ccjk.log
```

## 🧪 Verify Installation

Run the verification command:

```bash
ccjk doctor
```

Expected output:
```
✓ Node.js: v20.11.0
✓ npm: 10.2.4
✓ Git: 2.43.0
✓ Redis: 7.2.3 (connected)
✓ Configuration: valid
✓ Hooks: enabled
✓ Skills: enabled
✓ Agents: ready

All systems operational!
```

## 🔄 Updating CCJK

Update to the latest version:

```bash
# Global installation
npm update -g ccjk@latest

# Project-specific
npm update ccjk@latest

# Check version
ccjk --version
```

## 🗑️ Uninstallation

### Global Removal

```bash
npm uninstall -g ccjk

# Remove configuration files (optional)
rm -rf ~/.ccjk
```

### Project-Specific Removal

```bash
npm uninstall ccjk

# Remove CCJK files from project
rm -rf .ccjk
rm ccjk.config.json
```

### Remove Redis (if installed via Docker)

```bash
# Stop and remove container
docker stop ccjk-redis
docker rm ccjk-redis

# Remove Redis image (optional)
docker rmi redis:7-alpine
```

## 🔧 Troubleshooting

### Issue: "command not found: ccjk"

**Cause**: CCJK not installed or not in PATH

**Solution**:
```bash
# Verify installation
npm list -g ccjk

# Reinstall
npm install -g ccjk@latest

# Check PATH
echo $PATH | grep -q "$(npm config get prefix)/bin"
```

### Issue: "Redis connection refused"

**Cause**: Redis not running

**Solution**:
```bash
# Check if Redis is running
redis-cli ping

# If not running, start Redis
docker start ccjk-redis
# or
sudo systemctl start redis
```

### Issue: "Permission denied" when installing globally

**Cause**: Insufficient permissions

**Solution**:
```bash
# Fix npm permissions
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Reinstall
npm install -g ccjk@latest
```

### Issue: "Git hooks not working"

**Cause**: Git hooks not initialized

**Solution**:
```bash
# Reinitialize hooks
ccjk hooks install --force

# Verify hooks
ls -la .git/hooks/
```

## 📚 Next Steps

- [Quick Start Guide](./getting-started.md) - Get up and running
- [Configuration Guide](./configuration.md) - Detailed configuration options
- [Hook Enforcement Tutorial](./tutorials/hook-enforcement.md) - Learn about hooks

## 🆘 Getting Help

If you encounter issues not covered here:

- Check [Troubleshooting](./troubleshooting.md)
- Search [GitHub Issues](https://github.com/ccjk/ccjk/issues)
- Ask in [GitHub Discussions](https://github.com/ccjk/ccjk/discussions)
- Join our [Discord Community](https://discord.gg/ccjk)
