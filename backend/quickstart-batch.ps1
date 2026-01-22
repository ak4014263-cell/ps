#!/bin/bash

# Windows Quick Start (PowerShell)
# One-command setup for local development

Write-Host ""
Write-Host "🚀 Batch Processing Pipeline - Quick Start" -ForegroundColor Blue
Write-Host "==========================================" -ForegroundColor Blue
Write-Host ""

# Check prerequisites
Write-Host "📦 Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "❌ Node.js not found. Please install Node.js 18+" -ForegroundColor Red
  exit 1
}

Write-Host "✅ Node.js found: $(node --version)" -ForegroundColor Green

# Check Docker
$hasDocker = Get-Command docker -ErrorAction SilentlyContinue
if ($hasDocker) {
  Write-Host "✅ Docker found" -ForegroundColor Green
} else {
  Write-Host "⚠️  Docker not found. You can still run Redis with WSL or local Redis" -ForegroundColor Yellow
}

Write-Host ""

# Step 1: Install dependencies
Write-Host "📥 Installing dependencies..." -ForegroundColor Yellow
Set-Location backend

if (Test-Path "node_modules") {
  Write-Host "✅ node_modules already exists" -ForegroundColor Green
} else {
  npm install
}

Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Step 2: Start Redis (if Docker available)
if ($hasDocker) {
  Write-Host "🐳 Starting Redis (Docker)..." -ForegroundColor Yellow
  
  $redisRunning = docker ps | Select-String "batch-processing-redis"
  if ($redisRunning) {
    Write-Host "✅ Redis already running" -ForegroundColor Green
  } else {
    docker run -d -p 6379:6379 --name batch-processing-redis redis:7-alpine
    Start-Sleep -Seconds 2
    Write-Host "✅ Redis started" -ForegroundColor Green
  }
} else {
  Write-Host "⚠️  Docker not available. Please start Redis manually:" -ForegroundColor Yellow
  Write-Host "   1. Install Redis via WSL: wsl apt install redis-server" -ForegroundColor Cyan
  Write-Host "   2. Or use: choco install redis (requires Chocolatey)" -ForegroundColor Cyan
  Write-Host "   3. Then run: redis-server" -ForegroundColor Cyan
}

Write-Host ""

# Step 3: Show startup commands
Write-Host "🎯 Next steps:" -ForegroundColor Blue
Write-Host ""
Write-Host "Terminal 1 - Backend Server:" -ForegroundColor Cyan
Write-Host "  cd backend && npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "Terminal 2 - Worker (with concurrency 2):" -ForegroundColor Cyan
Write-Host "  cd backend && `$env:WORKER_ID='worker-1'; `$env:WORKER_CONCURRENCY='2'; node worker-batch.js" -ForegroundColor Gray
Write-Host ""
Write-Host "Terminal 3 - Optional: More workers (for faster processing):" -ForegroundColor Cyan
Write-Host "  cd backend && `$env:WORKER_ID='worker-2'; `$env:WORKER_CONCURRENCY='2'; node worker-batch.js" -ForegroundColor Gray
Write-Host ""

# Step 4: Show test commands
Write-Host "📤 Test batch upload:" -ForegroundColor Blue
Write-Host ""
Write-Host "curl -X POST http://localhost:5000/api/batch/queue-stats | jq" -ForegroundColor Gray
Write-Host ""

# Step 5: Show monitoring commands
Write-Host "📊 Monitor queue progress:" -ForegroundColor Blue
Write-Host ""
Write-Host "docker exec batch-processing-redis redis-cli LLEN bull:face-detection:wait" -ForegroundColor Gray
Write-Host "docker exec batch-processing-redis redis-cli LLEN bull:face-detection:active" -ForegroundColor Gray
Write-Host ""

# Step 6: Show cleanup
Write-Host "🧹 Cleanup (when done):" -ForegroundColor Blue
Write-Host ""
Write-Host "docker stop batch-processing-redis" -ForegroundColor Gray
Write-Host "docker rm batch-processing-redis" -ForegroundColor Gray
Write-Host ""

Write-Host "Full documentation: ../BATCH_PROCESSING_GUIDE.md" -ForegroundColor Yellow
Write-Host ""
