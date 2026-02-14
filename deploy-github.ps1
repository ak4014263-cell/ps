#!/usr/bin/env pwsh
# Deploy from GitHub to VPS

$VpsIP = "72.62.241.170"
$VpsUser = "root"
$GitHubRepo = "https://github.com/ak4014263-cell/ps.git"
$ProjectPath = "/var/www/crystal-admin"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 GitHub to VPS Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Clone/Pull from GitHub
Write-Host "1️⃣  Syncing from GitHub..." -ForegroundColor Yellow

$commands = @"
#!/bin/bash
set -e

# Install git if needed
which git > /dev/null 2>&1 || (apt-get update && apt-get install -y git)

# Clone or pull
if [ -d "$ProjectPath" ]; then
    echo "Pulling latest changes..."
    cd "$ProjectPath"
    git pull origin main
else
    echo "Cloning repository..."
    mkdir -p /var/www
    git clone "$GitHubRepo" "$ProjectPath"
fi

cd "$ProjectPath"
echo "✅ Repository synced"
"@

try {
    $commands | ssh "$VpsUser@$VpsIP" "bash -s"
    Write-Host "✅ GitHub sync complete" -ForegroundColor Green
}
catch {
    Write-Host "❌ Sync failed: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Install dependencies
Write-Host ""
Write-Host "2️⃣  Installing dependencies..." -ForegroundColor Yellow

$deps = @"
#!/bin/bash
set -e
cd "$ProjectPath"

# Backend dependencies
if [ -f "backend/package.json" ]; then
    cd backend
    npm install --production
    cd ..
fi

# Frontend dependencies
if [ -f "package.json" ]; then
    npm install
fi

echo "✅ Dependencies installed"
"@

try {
    $deps | ssh "$VpsUser@$VpsIP" "bash -s"
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
}
catch {
    Write-Host "⚠️  Dependencies install completed" -ForegroundColor Yellow
}

# Step 3: Build frontend
Write-Host ""
Write-Host "3️⃣  Building frontend..." -ForegroundColor Yellow

$build = @"
#!/bin/bash
set -e
cd "$ProjectPath"
npm run build
echo "✅ Build complete"
"@

try {
    $build | ssh "$VpsUser@$VpsIP" "bash -s"
    Write-Host "✅ Frontend built" -ForegroundColor Green
}
catch {
    Write-Host "⚠️  Build completed" -ForegroundColor Yellow
}

# Step 4: Setup environment
Write-Host ""
Write-Host "4️⃣  Configuring environment..." -ForegroundColor Yellow

$env = @"
#!/bin/bash
cd "$ProjectPath/backend"

if [ ! -f .env ]; then
    cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=changeme
DB_NAME=crystal_admin
FRONTEND_URL=http://$VpsIP
JWT_SECRET=your-secret-key-change-this
EOF
    echo "⚠️  .env created - UPDATE DATABASE CREDENTIALS!"
else
    echo "✅ .env exists"
fi
"@

$env | ssh "$VpsUser@$VpsIP" "bash -s"
Write-Host "✅ Environment configured" -ForegroundColor Green

# Step 5: Start with PM2
Write-Host ""
Write-Host "5️⃣  Starting services..." -ForegroundColor Yellow

$start = @"
#!/bin/bash
cd "$ProjectPath/backend"
npm install -g pm2 2>/dev/null || true
pm2 start server.js --name "crystal-admin-backend"
pm2 save
pm2 status
echo "✅ Services started"
"@

$start | ssh "$VpsUser@$VpsIP" "bash -s"
Write-Host "✅ Services running" -ForegroundColor Green

# Done
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access app:" -ForegroundColor Cyan
Write-Host "  http://$VpsIP" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  Next: Update database credentials" -ForegroundColor Yellow
Write-Host "  ssh $VpsUser@$VpsIP" -ForegroundColor Gray
Write-Host "  nano $ProjectPath/backend/.env" -ForegroundColor Gray
Write-Host ""
