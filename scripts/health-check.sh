#!/bin/bash

# CCJK 2.0 Health Check Script

echo "🔍 CCJK 2.0 Development Environment Health Check"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Docker services
echo ""
echo -e "${BLUE}📦 Docker Services:${NC}"
if command_exists docker-compose; then
    docker-compose -f docker-compose.dev.yml ps
elif docker compose version >/dev/null 2>&1; then
    docker compose -f docker-compose.dev.yml ps
else
    echo -e "${RED}❌ Docker Compose not found${NC}"
fi

# Check database connection
echo ""
echo -e "${BLUE}🗄️  Database Connection:${NC}"
if docker exec ccjk-postgres-dev psql -U ccjk_user -d ccjk_dev -c "SELECT 'Database OK' as status;" 2>/dev/null | grep -q "Database OK"; then
    echo -e "${GREEN}✅ PostgreSQL: Connected${NC}"
else
    echo -e "${RED}❌ PostgreSQL: Connection failed${NC}"
fi

# Check test database connection
if docker exec ccjk-postgres-test psql -U ccjk_user -d ccjk_test -c "SELECT 'Test DB OK' as status;" 2>/dev/null | grep -q "Test DB OK"; then
    echo -e "${GREEN}✅ PostgreSQL Test: Connected${NC}"
else
    echo -e "${YELLOW}⚠️  PostgreSQL Test: Connection failed${NC}"
fi

# Check Redis connection
echo ""
echo -e "${BLUE}🔄 Redis Connection:${NC}"
if docker exec ccjk-redis-dev redis-cli ping 2>/dev/null | grep -q "PONG"; then
    echo -e "${GREEN}✅ Redis: Connected${NC}"
else
    echo -e "${RED}❌ Redis: Connection failed${NC}"
fi

# Check Elasticsearch connection
echo ""
echo -e "${BLUE}🔍 Elasticsearch Connection:${NC}"
if curl -s http://localhost:9200/_cluster/health 2>/dev/null | grep -q "green\|yellow"; then
    echo -e "${GREEN}✅ Elasticsearch: Connected${NC}"

    # Show cluster status
    cluster_status=$(curl -s http://localhost:9200/_cluster/health 2>/dev/null | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    if [ "$cluster_status" = "green" ]; then
        echo -e "${GREEN}   Status: Green (All good)${NC}"
    elif [ "$cluster_status" = "yellow" ]; then
        echo -e "${YELLOW}   Status: Yellow (Functional but not optimal)${NC}"
    else
        echo -e "${RED}   Status: Red (Issues detected)${NC}"
    fi
else
    echo -e "${RED}❌ Elasticsearch: Connection failed${NC}"
fi

# Check MinIO connection
echo ""
echo -e "${BLUE}📦 MinIO Connection:${NC}"
if curl -s http://localhost:9000/minio/health/live 2>/dev/null >/dev/null; then
    echo -e "${GREEN}✅ MinIO: Connected${NC}"
else
    echo -e "${YELLOW}⚠️  MinIO: Connection failed (optional service)${NC}"
fi

# Check optional services
echo ""
echo -e "${BLUE}🔧 Optional Services:${NC}"

# Kibana
if curl -s http://localhost:5601/api/status 2>/dev/null | grep -q "available"; then
    echo -e "${GREEN}✅ Kibana: Available${NC}"
else
    echo -e "${YELLOW}⚠️  Kibana: Not available (optional)${NC}"
fi

# Prometheus
if curl -s http://localhost:9090/-/healthy 2>/dev/null >/dev/null; then
    echo -e "${GREEN}✅ Prometheus: Available${NC}"
else
    echo -e "${YELLOW}⚠️  Prometheus: Not available (optional)${NC}"
fi

# Grafana
if curl -s http://localhost:3001/api/health 2>/dev/null | grep -q "ok"; then
    echo -e "${GREEN}✅ Grafana: Available${NC}"
else
    echo -e "${YELLOW}⚠️  Grafana: Not available (optional)${NC}"
fi

# Jaeger
if curl -s http://localhost:16686/ 2>/dev/null >/dev/null; then
    echo -e "${GREEN}✅ Jaeger: Available${NC}"
else
    echo -e "${YELLOW}⚠️  Jaeger: Not available (optional)${NC}"
fi

# Check Node.js and dependencies
echo ""
echo -e "${BLUE}🟢 Node.js Environment:${NC}"
if command_exists node; then
    node_version=$(node --version)
    echo -e "${GREEN}✅ Node.js: $node_version${NC}"
else
    echo -e "${RED}❌ Node.js: Not found${NC}"
fi

if command_exists pnpm; then
    pnpm_version=$(pnpm --version)
    echo -e "${GREEN}✅ pnpm: $pnpm_version${NC}"
else
    echo -e "${RED}❌ pnpm: Not found${NC}"
fi

# Check environment file
echo ""
echo -e "${BLUE}⚙️  Configuration:${NC}"
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env file: Present${NC}"
else
    echo -e "${YELLOW}⚠️  .env file: Missing (copy from .env.example)${NC}"
fi

# Check TypeScript compilation
echo ""
echo -e "${BLUE}🔧 Build Status:${NC}"
if [ -d "dist" ]; then
    echo -e "${GREEN}✅ Build artifacts: Present${NC}"
else
    echo -e "${YELLOW}⚠️  Build artifacts: Missing (run 'pnpm build')${NC}"
fi

# Check logs directory
if [ -d "logs" ]; then
    echo -e "${GREEN}✅ Logs directory: Present${NC}"
else
    echo -e "${YELLOW}⚠️  Logs directory: Missing (will be created automatically)${NC}"
fi

# Summary
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo "================================================"

# Count services
total_services=0
healthy_services=0

# Core services
services=("postgres" "redis" "elasticsearch")
for service in "${services[@]}"; do
    total_services=$((total_services + 1))
    case $service in
        "postgres")
            if docker exec ccjk-postgres-dev psql -U ccjk_user -d ccjk_dev -c "SELECT 1;" >/dev/null 2>&1; then
                healthy_services=$((healthy_services + 1))
            fi
            ;;
        "redis")
            if docker exec ccjk-redis-dev redis-cli ping >/dev/null 2>&1; then
                healthy_services=$((healthy_services + 1))
            fi
            ;;
        "elasticsearch")
            if curl -s http://localhost:9200/_cluster/health >/dev/null 2>&1; then
                healthy_services=$((healthy_services + 1))
            fi
            ;;
    esac
done

echo "Core Services: $healthy_services/$total_services healthy"

if [ $healthy_services -eq $total_services ]; then
    echo -e "${GREEN}🎉 All core services are healthy!${NC}"
    echo ""
    echo -e "${GREEN}Ready for development! 🚀${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Open VS Code: code ."
    echo "2. Start development: pnpm dev"
    echo "3. Run tests: pnpm test"
elif [ $healthy_services -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Some services need attention${NC}"
    echo ""
    echo "Try running: pnpm v2:services:restart"
else
    echo -e "${RED}❌ Services are not running${NC}"
    echo ""
    echo "Try running: pnpm v2:services:up"
fi

echo ""
echo "For detailed logs: pnpm v2:services:logs"
echo "For service status: pnpm v2:services:status"
echo ""
echo "🔗 Service URLs:"
echo "• PostgreSQL: localhost:5432"
echo "• Redis: localhost:6379"
echo "• Elasticsearch: http://localhost:9200"
echo "• Kibana: http://localhost:5601"
echo "• MinIO Console: http://localhost:9001"
echo "• Prometheus: http://localhost:9090"
echo "• Grafana: http://localhost:3001"
echo "• Jaeger: http://localhost:16686"