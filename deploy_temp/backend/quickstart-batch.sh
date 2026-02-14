#!/bin/bash

# Quick Start: Batch Processing Pipeline
# One-command setup for local development

set -e

echo ""
echo "🚀 Batch Processing Pipeline - Quick Start"
echo "=========================================="
echo ""

# Check prerequisites
echo "📦 Checking prerequisites..."

if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Please install Node.js 18+"
  exit 1
fi

if ! command -v docker &> /dev/null; then
  echo "⚠️  Docker not found. You can still run Redis locally with: redis-server"
fi

if ! command -v redis-cli &> /dev/null; then
  echo "⚠️  Redis CLI not found. You can check status with: docker exec batch-processing-redis redis-cli PING"
fi

echo "✅ Prerequisites OK"
echo ""

# Step 1: Install dependencies
echo "📥 Installing dependencies..."
cd backend

if [ -d node_modules ]; then
  echo "✅ node_modules already exists"
else
  npm install
fi

echo "✅ Dependencies installed"
echo ""

# Step 2: Start Redis (if Docker available)
if command -v docker &> /dev/null; then
  echo "🐳 Starting Redis (Docker)..."
  if docker ps | grep -q batch-processing-redis; then
    echo "✅ Redis already running"
  else
    docker run -d -p 6379:6379 --name batch-processing-redis redis:7-alpine
    sleep 2
    echo "✅ Redis started"
  fi
else
  echo "⚠️  Starting Redis without Docker..."
  if command -v redis-server &> /dev/null; then
    redis-server --daemonize yes --port 6379
    echo "✅ Redis started (daemonized)"
  else
    echo "❌ Please start Redis manually: redis-server"
    echo "   Or install via: brew install redis (macOS) or apt install redis-server (Linux)"
    exit 1
  fi
fi

echo ""

# Step 3: Show startup commands
echo "🎯 Next steps:"
echo ""
echo "Terminal 1 - Backend Server:"
echo "  cd backend && npm run dev"
echo ""
echo "Terminal 2 - Worker (with concurrency 2):"
echo "  cd backend && WORKER_ID=worker-1 WORKER_CONCURRENCY=2 node worker-batch.js"
echo ""
echo "Terminal 3 - Optional: More workers (for faster processing):"
echo "  cd backend && WORKER_ID=worker-2 WORKER_CONCURRENCY=2 node worker-batch.js"
echo ""

# Step 4: Show test commands
echo "📤 Test batch upload:"
echo ""
echo "curl -X POST http://localhost:5000/api/batch/queue-stats | jq"
echo ""

# Step 5: Show monitoring commands
echo "📊 Monitor queue progress:"
echo ""
echo "docker exec batch-processing-redis redis-cli LLEN bull:face-detection:wait"
echo "docker exec batch-processing-redis redis-cli LLEN bull:face-detection:active"
echo ""

# Step 6: Show cleanup
echo "🧹 Cleanup (when done):"
echo ""
echo "docker stop batch-processing-redis"
echo "docker rm batch-processing-redis"
echo ""

echo "📖 Full documentation: ../BATCH_PROCESSING_GUIDE.md"
echo ""
