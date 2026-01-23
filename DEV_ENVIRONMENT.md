# CCJK 2.0 Development Environment

This document provides comprehensive instructions for setting up and working with the CCJK 2.0 development environment.

## 🚀 Quick Start

### One-Click Setup

```bash
# Clone the repository
git clone https://github.com/miounet11/ccjk.git
cd ccjk

# Run the automated setup script
pnpm v2:setup
```

This will:
- ✅ Check system requirements
- ✅ Install dependencies
- ✅ Create environment file
- ✅ Start Docker services
- ✅ Initialize database
- ✅ Configure VS Code
- ✅ Run initial tests

### Manual Setup

If you prefer manual setup or need to troubleshoot:

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment file
cp .env.example .env

# 3. Edit .env with your configuration
nano .env

# 4. Start services
pnpm v2:services:up

# 5. Check health
pnpm v2:health
```

## 📋 System Requirements

### Required Software

| Software | Version | Installation |
|----------|---------|--------------|
| **Node.js** | >=20.0.0 | [nodejs.org](https://nodejs.org/) |
| **pnpm** | >=8.0.0 | `npm install -g pnpm` |
| **Docker** | >=24.0.0 | [docker.com](https://docs.docker.com/get-docker/) |
| **Docker Compose** | >=2.0.0 | Included with Docker Desktop |
| **Git** | >=2.30.0 | [git-scm.com](https://git-scm.com/) |

### Optional Software

| Software | Purpose | Installation |
|----------|---------|--------------|
| **VS Code** | IDE | [code.visualstudio.com](https://code.visualstudio.com/) |
| **Postman** | API Testing | [postman.com](https://www.postman.com/) |
| **TablePlus** | Database GUI | [tableplus.com](https://tableplus.com/) |

### System Resources

- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 10GB free space
- **CPU**: 4 cores recommended for optimal performance

## 🐳 Docker Services

The development environment includes the following services:

### Core Services

| Service | Port | Purpose | Health Check |
|---------|------|---------|--------------|
| **PostgreSQL** | 5432 | Main database | `pnpm v2:health` |
| **PostgreSQL Test** | 5433 | Test database | Auto-configured |
| **Redis** | 6379 | Cache & sessions | `redis-cli ping` |
| **Elasticsearch** | 9200 | Search & analytics | `curl localhost:9200` |

### Optional Services

| Service | Port | Purpose | Profile |
|---------|------|---------|---------|
| **Kibana** | 5601 | Elasticsearch UI | Default |
| **MinIO** | 9000/9001 | S3-compatible storage | Default |
| **Prometheus** | 9090 | Metrics collection | `monitoring` |
| **Grafana** | 3001 | Metrics visualization | `monitoring` |
| **Jaeger** | 16686 | Distributed tracing | `tracing` |

### Service Management

```bash
# Start all services
pnpm v2:services:up

# Stop all services
pnpm v2:services:down

# Restart services
pnpm v2:services:restart

# View service status
pnpm v2:services:status

# View service logs
pnpm v2:services:logs

# Start monitoring stack
pnpm v2:monitoring:up

# Start tracing stack
pnpm v2:tracing:up
```

## 🔧 Environment Configuration

### Environment Variables

The `.env` file contains all configuration options. Key sections:

#### Core Application
```env
NODE_ENV=development
PORT=3000
JWT_SECRET=your-secret-here
```

#### Database
```env
DATABASE_URL=postgresql://ccjk_user:ccjk_password@localhost:5432/ccjk_dev
REDIS_URL=redis://localhost:6379/0
ELASTICSEARCH_URL=http://localhost:9200
```

#### AI Providers
```env
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
OPENAI_API_KEY=sk-your-openai-key-here
GOOGLE_API_KEY=your-google-api-key-here
```

#### CCJK 2.0 Features
```env
BRAIN_CONTEXT_COMPRESSION_ENABLED=true
CLOUD_SYNC_ENABLED=true
SKILLS_HOT_RELOAD_ENABLED=true
AGENTS_MAX_CONCURRENT=5
```

### Configuration Validation

```bash
# Validate configuration
pnpm v2:health

# Test database connection
docker exec ccjk-postgres-dev psql -U ccjk_user -d ccjk_dev -c "SELECT version();"

# Test Redis connection
docker exec ccjk-redis-dev redis-cli ping

# Test Elasticsearch connection
curl -s http://localhost:9200/_cluster/health
```

## 🧪 Testing

### Test Types

| Type | Command | Purpose | Coverage |
|------|---------|---------|----------|
| **Unit** | `pnpm test` | Individual functions | 80%+ |
| **Integration** | `pnpm v2:test:integration` | Service interactions | 70%+ |
| **E2E** | `pnpm v2:test:e2e` | Full workflows | 60%+ |

### Test Commands

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run tests with UI
pnpm test:ui

# Run specific test file
pnpm vitest src/utils/config.test.ts

# Run integration tests
pnpm v2:test:integration

# Run E2E tests
pnpm v2:test:e2e
```

### Test Configuration

- **Unit Tests**: `vitest.config.ts`
- **Integration Tests**: `vitest.integration.config.ts`
- **E2E Tests**: `vitest.e2e.config.ts`

## 🛠️ Development Workflow

### Daily Development

```bash
# Start development environment
pnpm v2:dev

# This runs:
# 1. Docker services
# 2. Development server with hot reload
# 3. TypeScript compilation
# 4. Test watcher (optional)
```

### Code Quality

```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format
```

### Database Operations

```bash
# Reset database
pnpm v2:db:reset

# Run migrations (to be implemented)
pnpm v2:db:migrate

# Seed test data (to be implemented)
pnpm v2:db:seed
```

### Cache Operations

```bash
# Clear Redis cache
pnpm v2:cache:clear

# Reindex Elasticsearch
pnpm v2:search:reindex
```

## 🎯 VS Code Integration

### Extensions

The project includes recommended VS Code extensions:

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Vitest** - Test runner integration
- **TypeScript** - Language support
- **Docker** - Container management
- **GitLens** - Git integration

### Debug Configurations

Available debug configurations:

| Configuration | Purpose |
|---------------|---------|
| 🚀 CCJK CLI Development | Main development debugging |
| 🧪 Run Current Test File | Debug current test |
| 🎯 CCJK CLI with Args | Debug with specific arguments |
| 🧠 Brain System Debug | Debug brain system |
| ☁️ Cloud Sync Debug | Debug cloud sync |
| 🤖 Multi-Agent Debug | Debug agent orchestration |

### Tasks

Available VS Code tasks:

| Task | Purpose |
|------|---------|
| Start Development Services | Launch Docker services |
| Health Check | Check service status |
| Build Project | Build TypeScript |
| Run Tests | Execute test suite |
| Clean Project | Clean build artifacts |

## 🔍 Monitoring & Observability

### Metrics (Optional)

```bash
# Start monitoring stack
pnpm v2:monitoring:up

# Access Grafana
open http://localhost:3001
# Login: admin/ccjk_admin
```

### Tracing (Optional)

```bash
# Start tracing stack
pnpm v2:tracing:up

# Access Jaeger
open http://localhost:16686
```

### Logs

```bash
# View application logs
tail -f logs/ccjk-dev.log

# View service logs
pnpm v2:services:logs

# View specific service logs
docker-compose -f docker-compose.dev.yml logs postgres
```

## 🚨 Troubleshooting

### Common Issues

#### Docker Services Won't Start

```bash
# Check Docker is running
docker info

# Check port conflicts
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
lsof -i :9200  # Elasticsearch

# Reset Docker environment
pnpm v2:services:down
docker system prune -f
pnpm v2:services:up
```

#### Database Connection Issues

```bash
# Check PostgreSQL logs
docker-compose -f docker-compose.dev.yml logs postgres

# Reset database
pnpm v2:db:reset

# Manual connection test
docker exec -it ccjk-postgres-dev psql -U ccjk_user -d ccjk_dev
```

#### Redis Connection Issues

```bash
# Check Redis logs
docker-compose -f docker-compose.dev.yml logs redis

# Test Redis connection
docker exec ccjk-redis-dev redis-cli ping

# Clear Redis data
pnpm v2:cache:clear
```

#### Elasticsearch Issues

```bash
# Check Elasticsearch logs
docker-compose -f docker-compose.dev.yml logs elasticsearch

# Check cluster health
curl http://localhost:9200/_cluster/health

# Reset Elasticsearch
pnpm v2:search:reindex
```

#### Test Failures

```bash
# Run tests with verbose output
pnpm test -- --reporter=verbose

# Run specific failing test
pnpm vitest path/to/failing/test.ts

# Clear test cache
rm -rf node_modules/.vitest
```

### Performance Issues

```bash
# Check system resources
docker stats

# Reduce service memory limits
# Edit docker-compose.dev.yml memory limits

# Use fewer test workers
# Edit vitest.config.ts poolOptions
```

### Clean Slate Reset

```bash
# Nuclear option - reset everything
pnpm v2:clean

# This will:
# 1. Stop all services
# 2. Remove all volumes
# 3. Clean Docker system
# 4. Remove build artifacts
```

## 📚 Additional Resources

### Documentation

- [Project README](./README.md)
- [Architecture Guide](./CLAUDE.md)
- [API Documentation](./docs/api/)
- [Contributing Guide](./CONTRIBUTING.md)

### External Links

- [CCJK GitHub Repository](https://github.com/miounet11/ccjk)
- [Claude Code Documentation](https://docs.anthropic.com/claude/docs)
- [Docker Documentation](https://docs.docker.com/)
- [Vitest Documentation](https://vitest.dev/)

## 🤝 Getting Help

### Community

- **GitHub Issues**: [Report bugs and request features](https://github.com/miounet11/ccjk/issues)
- **Discussions**: [Ask questions and share ideas](https://github.com/miounet11/ccjk/discussions)

### Development Team

- **Email**: 9248293@gmail.com
- **Maintainer**: CCJK Team

---

**Happy coding! 🚀**

*Last updated: 2026-01-23*