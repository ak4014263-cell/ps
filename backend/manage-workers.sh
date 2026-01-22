#!/bin/bash

# Batch Processing Worker Management Script
# Scale workers up/down, monitor queue, view logs

set -e

COMPOSE_FILE="docker-compose.batch.yml"
PROJECT_NAME="batch-processing"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
  echo -e "${BLUE}===========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}===========================================${NC}"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_info() {
  echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Start batch infrastructure
start() {
  print_header "Starting Batch Processing Infrastructure"
  
  if [ ! -f .env ]; then
    print_error ".env file not found. Create one with MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE"
    exit 1
  fi

  docker compose -f $COMPOSE_FILE -p $PROJECT_NAME up -d
  print_success "Services started"
  print_info "Redis: localhost:6379"
  print_info "Workers: 2 instances (concurrency: 2 each = 4 parallel jobs)"
}

# Stop batch infrastructure
stop() {
  print_header "Stopping Batch Processing"
  docker compose -f $COMPOSE_FILE -p $PROJECT_NAME down
  print_success "Services stopped"
}

# View logs
logs() {
  if [ -z "$1" ]; then
    docker compose -f $COMPOSE_FILE -p $PROJECT_NAME logs -f
  else
    docker compose -f $COMPOSE_FILE -p $PROJECT_NAME logs -f $1
  fi
}

# View queue stats (requires curl + jq)
stats() {
  print_header "Queue Statistics"
  
  local result=$(curl -s http://localhost:5000/api/batch/queue-stats || echo '{"error": "Could not connect to backend"}')
  echo "$result" | jq . 2>/dev/null || echo "$result"
}

# Scale workers up
scale_up() {
  local count=${1:-3}
  print_header "Scaling Workers to $count"
  docker compose -f $COMPOSE_FILE -p $PROJECT_NAME up -d --scale worker=$count
  print_success "Scaled to $count workers"
}

# Get worker status
status() {
  print_header "Worker Status"
  docker compose -f $COMPOSE_FILE -p $PROJECT_NAME ps
}

# Test batch upload (requires test.zip)
test_batch() {
  if [ ! -f test.zip ]; then
    print_error "test.zip not found. Create a ZIP with sample images."
    exit 1
  fi

  print_header "Testing Batch Upload"
  
  # Get first project ID from database (requires mysql)
  # For now, just show the curl command
  echo ""
  print_info "Run this to upload a batch:"
  echo ""
  echo "curl -X POST http://localhost:5000/api/batch/upload-zip \\"
  echo "  -F 'file=@test.zip' \\"
  echo "  -F 'projectId=YOUR_PROJECT_ID' \\"
  echo "  -F 'priority=5'"
  echo ""
}

# Show help
help() {
  echo ""
  echo "Batch Processing Worker Management"
  echo ""
  echo "Usage: $0 {start|stop|logs|status|stats|scale-up|test}"
  echo ""
  echo "Commands:"
  echo "  start       - Start Redis + 2 workers"
  echo "  stop        - Stop all services"
  echo "  logs [svc]  - View logs (optionally for specific service)"
  echo "  status      - Show container status"
  echo "  stats       - Get queue statistics from backend"
  echo "  scale-up N  - Scale to N worker instances"
  echo "  test        - Show test batch upload command"
  echo ""
  echo "Example: $0 start"
  echo "         $0 logs worker-1"
  echo "         $0 scale-up 5"
  echo ""
}

# Main
case "${1:-help}" in
  start)
    start
    ;;
  stop)
    stop
    ;;
  logs)
    logs "$2"
    ;;
  stats)
    stats
    ;;
  status)
    status
    ;;
  scale-up)
    scale_up "$2"
    ;;
  test)
    test_batch
    ;;
  *)
    help
    ;;
esac
