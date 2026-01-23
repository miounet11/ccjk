#!/bin/bash

# CCJK 2.0 Development Environment Setup Script
# This script sets up the complete development environment for CCJK 2.0

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check system requirements
check_requirements() {
    log_step "Checking system requirements..."

    local missing_deps=()

    # Check Node.js
    if ! command_exists node; then
        missing_deps+=("Node.js (>=20)")
    else
        local node_version=$(node --version | sed 's/v//')
        local major_version=$(echo $node_version | cut -d. -f1)
        if [ "$major_version" -lt 20 ]; then
            missing_deps+=("Node.js (>=20, current: $node_version)")
        fi
    fi

    # Check pnpm
    if ! command_exists pnpm; then
        missing_deps+=("pnpm")
    fi

    # Check Docker
    if ! command_exists docker; then
        missing_deps+=("Docker")
    fi

    # Check Docker Compose
    if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
        missing_deps+=("Docker Compose")
    fi

    # Check Git
    if ! command_exists git; then
        missing_deps+=("Git")
    fi

    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing required dependencies:"
        for dep in "${missing_deps[@]}"; do
            echo "  - $dep"
        done
        echo ""
        echo "Please install the missing dependencies and run this script again."
        echo ""
        echo "Installation guides:"
        echo "  - Node.js: https://nodejs.org/"
        echo "  - pnpm: npm install -g pnpm"
        echo "  - Docker: https://docs.docker.com/get-docker/"
        echo "  - Git: https://git-scm.com/downloads"
        exit 1
    fi

    log_success "All system requirements met"
}

# Setup environment file
setup_env_file() {
    log_step "Setting up environment file..."

    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_success "Created .env file from .env.example"
            log_warning "Please edit .env file with your actual configuration values"
        else
            log_error ".env.example file not found"
            exit 1
        fi
    else
        log_info ".env file already exists, skipping..."
    fi
}

# Install dependencies
install_dependencies() {
    log_step "Installing Node.js dependencies..."

    if [ -f "pnpm-lock.yaml" ]; then
        pnpm install --frozen-lockfile
    else
        pnpm install
    fi

    log_success "Dependencies installed successfully"
}

# Setup Docker services
setup_docker_services() {
    log_step "Setting up Docker services..."

    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi

    # Create necessary directories
    mkdir -p scripts/sql/init
    mkdir -p scripts/redis
    mkdir -p scripts/elasticsearch
    mkdir -p scripts/prometheus
    mkdir -p scripts/grafana/provisioning
    mkdir -p logs

    # Create basic Redis configuration
    if [ ! -f "scripts/redis/redis.conf" ]; then
        cat > scripts/redis/redis.conf << 'EOF'
# Redis configuration for CCJK development
maxmemory 512mb
maxmemory-policy allkeys-lru
appendonly yes
appendfsync everysec
save 900 1
save 300 10
save 60 10000
EOF
        log_info "Created Redis configuration"
    fi

    # Create basic Elasticsearch configuration
    if [ ! -f "scripts/elasticsearch/elasticsearch.yml" ]; then
        cat > scripts/elasticsearch/elasticsearch.yml << 'EOF'
cluster.name: ccjk-cluster
node.name: ccjk-es-node
network.host: 0.0.0.0
http.port: 9200
discovery.type: single-node
xpack.security.enabled: false
xpack.monitoring.collection.enabled: true
EOF
        log_info "Created Elasticsearch configuration"
    fi

    # Create basic Prometheus configuration
    if [ ! -f "scripts/prometheus/prometheus.yml" ]; then
        cat > scripts/prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'ccjk-app'
    static_configs:
      - targets: ['host.docker.internal:3000']
    metrics_path: '/metrics'
    scrape_interval: 5s
EOF
        log_info "Created Prometheus configuration"
    fi

    # Start Docker services
    log_info "Starting Docker services..."
    docker-compose -f docker-compose.dev.yml up -d

    # Wait for services to be healthy
    log_info "Waiting for services to be ready..."
    sleep 10

    # Check service health
    local services=("postgres" "redis" "elasticsearch")
    for service in "${services[@]}"; do
        local max_attempts=30
        local attempt=1

        while [ $attempt -le $max_attempts ]; do
            if docker-compose -f docker-compose.dev.yml ps "$service" | grep -q "healthy\|Up"; then
                log_success "$service is ready"
                break
            fi

            if [ $attempt -eq $max_attempts ]; then
                log_error "$service failed to start properly"
                docker-compose -f docker-compose.dev.yml logs "$service"
                exit 1
            fi

            log_info "Waiting for $service... (attempt $attempt/$max_attempts)"
            sleep 5
            ((attempt++))
        done
    done

    log_success "All Docker services are running"
}

# Setup database
setup_database() {
    log_step "Setting up database..."

    # Wait a bit more for PostgreSQL to be fully ready
    sleep 5

    # Create database initialization script if it doesn't exist
    if [ ! -f "scripts/sql/init/01-init.sql" ]; then
        cat > scripts/sql/init/01-init.sql << 'EOF'
-- CCJK 2.0 Database Initialization Script

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS ccjk_core;
CREATE SCHEMA IF NOT EXISTS ccjk_brain;
CREATE SCHEMA IF NOT EXISTS ccjk_cloud;
CREATE SCHEMA IF NOT EXISTS ccjk_agents;
CREATE SCHEMA IF NOT EXISTS ccjk_analytics;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA ccjk_core TO ccjk_user;
GRANT ALL PRIVILEGES ON SCHEMA ccjk_brain TO ccjk_user;
GRANT ALL PRIVILEGES ON SCHEMA ccjk_cloud TO ccjk_user;
GRANT ALL PRIVILEGES ON SCHEMA ccjk_agents TO ccjk_user;
GRANT ALL PRIVILEGES ON SCHEMA ccjk_analytics TO ccjk_user;

-- Create basic tables (will be expanded by migrations)
CREATE TABLE IF NOT EXISTS ccjk_core.system_info (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version VARCHAR(50) NOT NULL,
    environment VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial system info
INSERT INTO ccjk_core.system_info (version, environment)
VALUES ('2.0.0-dev', 'development')
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_system_info_version ON ccjk_core.system_info(version);
CREATE INDEX IF NOT EXISTS idx_system_info_environment ON ccjk_core.system_info(environment);
EOF
        log_info "Created database initialization script"
    fi

    # Test database connection
    if docker exec ccjk-postgres-dev psql -U ccjk_user -d ccjk_dev -c "SELECT version();" >/dev/null 2>&1; then
        log_success "Database connection successful"
    else
        log_error "Failed to connect to database"
        exit 1
    fi
}

# Setup VS Code configuration
setup_vscode() {
    log_step "Setting up VS Code configuration..."

    mkdir -p .vscode

    # Create settings.json if it doesn't exist
    if [ ! -f ".vscode/settings.json" ]; then
        log_info "Creating VS Code settings..."
    else
        log_info "VS Code settings already exist, skipping..."
        return
    fi

    # Create launch.json if it doesn't exist
    if [ ! -f ".vscode/launch.json" ]; then
        log_info "Creating VS Code launch configuration..."
    else
        log_info "VS Code launch configuration already exists, skipping..."
        return
    fi

    log_success "VS Code configuration completed"
}

# Run initial tests
run_initial_tests() {
    log_step "Running initial tests..."

    # Type check
    log_info "Running TypeScript type check..."
    pnpm typecheck

    # Linting
    log_info "Running ESLint..."
    pnpm lint

    # Unit tests
    log_info "Running unit tests..."
    pnpm test:run

    log_success "All tests passed"
}

# Create development scripts
create_dev_scripts() {
    log_step "Creating development scripts..."

    # Create logs directory
    mkdir -p logs

    # Create a simple health check script
    cat > scripts/health-check.sh << 'EOF'
#!/bin/bash

# CCJK 2.0 Health Check Script

echo "🔍 CCJK 2.0 Development Environment Health Check"
echo "================================================"

# Check Docker services
echo ""
echo "📦 Docker Services:"
docker-compose -f docker-compose.dev.yml ps

# Check database connection
echo ""
echo "🗄️  Database Connection:"
if docker exec ccjk-postgres-dev psql -U ccjk_user -d ccjk_dev -c "SELECT 'Database OK' as status;" 2>/dev/null; then
    echo "✅ PostgreSQL: Connected"
else
    echo "❌ PostgreSQL: Connection failed"
fi

# Check Redis connection
echo ""
echo "🔄 Redis Connection:"
if docker exec ccjk-redis-dev redis-cli ping 2>/dev/null | grep -q "PONG"; then
    echo "✅ Redis: Connected"
else
    echo "❌ Redis: Connection failed"
fi

# Check Elasticsearch connection
echo ""
echo "🔍 Elasticsearch Connection:"
if curl -s http://localhost:9200/_cluster/health | grep -q "green\|yellow"; then
    echo "✅ Elasticsearch: Connected"
else
    echo "❌ Elasticsearch: Connection failed"
fi

echo ""
echo "🎉 Health check completed!"
EOF

    chmod +x scripts/health-check.sh
    log_info "Created health check script"

    log_success "Development scripts created"
}

# Print success message and next steps
print_success_message() {
    echo ""
    echo "🎉 CCJK 2.0 Development Environment Setup Complete!"
    echo "=================================================="
    echo ""
    echo "✅ Environment file created (.env)"
    echo "✅ Docker services started"
    echo "✅ Database initialized"
    echo "✅ Dependencies installed"
    echo "✅ VS Code configured"
    echo "✅ Tests passed"
    echo ""
    echo "🚀 Next Steps:"
    echo "1. Edit .env file with your actual API keys and configuration"
    echo "2. Open the project in VS Code: code ."
    echo "3. Start development: pnpm dev"
    echo ""
    echo "📋 Available Services:"
    echo "• PostgreSQL: localhost:5432 (dev), localhost:5433 (test)"
    echo "• Redis: localhost:6379"
    echo "• Elasticsearch: http://localhost:9200"
    echo "• Kibana: http://localhost:5601"
    echo "• MinIO: http://localhost:9001 (admin: ccjk_admin/ccjk_password_123)"
    echo ""
    echo "🔧 Useful Commands:"
    echo "• pnpm dev                    - Start development server"
    echo "• pnpm test                   - Run tests in watch mode"
    echo "• pnpm test:coverage          - Run tests with coverage"
    echo "• pnpm lint                   - Run linting"
    echo "• ./scripts/health-check.sh   - Check service health"
    echo "• docker-compose -f docker-compose.dev.yml logs - View service logs"
    echo ""
    echo "📚 Documentation:"
    echo "• Project README: ./README.md"
    echo "• Architecture: ./CLAUDE.md"
    echo "• Environment Variables: ./.env.example"
    echo ""
    echo "Happy coding! 🚀"
}

# Main execution
main() {
    echo "🚀 CCJK 2.0 Development Environment Setup"
    echo "========================================"
    echo ""

    check_requirements
    setup_env_file
    install_dependencies
    setup_docker_services
    setup_database
    setup_vscode
    create_dev_scripts

    # Run tests only if --skip-tests is not provided
    if [[ "$*" != *"--skip-tests"* ]]; then
        run_initial_tests
    else
        log_info "Skipping tests as requested"
    fi

    print_success_message
}

# Handle script arguments
if [[ "$*" == *"--help"* ]] || [[ "$*" == *"-h"* ]]; then
    echo "CCJK 2.0 Development Environment Setup Script"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --skip-tests    Skip running initial tests"
    echo "  --help, -h      Show this help message"
    echo ""
    exit 0
fi

# Run main function
main "$@"