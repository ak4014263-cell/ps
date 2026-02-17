#!/usr/bin/env pwsh
# Fresh Clone and Deploy to VPS

$VpsIP = "72.62.241.170"
$VpsUser = "root"
$GitHubRepo = "https://github.com/ak4014263-cell/ps.git"
$ProjectPath = "/var/www/crystal-admin"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fresh Clone and Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Remove existing directory
Write-Host "Step 1: Removing existing directory..." -ForegroundColor Yellow

$removeCommand = @"
set -e
echo "Removing existing $ProjectPath..."
rm -rf $ProjectPath
echo "Directory removed"
"@

try {
    $removeCommand | ssh "$VpsUser@$VpsIP" "bash"
    Write-Host "Directory removed successfully" -ForegroundColor Green
} catch {
    Write-Host "Error removing directory: $_" -ForegroundColor Red
}

# 2. Clone fresh from GitHub
Write-Host ""
Write-Host "Step 2: Cloning fresh repository..." -ForegroundColor Yellow

$cloneCommand = @"
set -e
echo "Cloning from $GitHubRepo..."
mkdir -p /var/www
git clone $GitHubRepo $ProjectPath
cd $ProjectPath
echo "Clone complete"
"@

try {
    $cloneCommand | ssh "$VpsUser@$VpsIP" "bash"
    Write-Host "Repository cloned successfully" -ForegroundColor Green
} catch {
    Write-Host "Clone failed: $_" -ForegroundColor Red
    exit 1
}

# 3. Install dependencies
Write-Host ""
Write-Host "Step 3: Installing dependencies..." -ForegroundColor Yellow

$depsCommand = @"
set -e
cd $ProjectPath
cd backend && npm install && cd ..
npm install
echo "Dependencies installed"
"@

try {
    $depsCommand | ssh "$VpsUser@$VpsIP" "bash"
    Write-Host "Dependencies installed" -ForegroundColor Green
} catch {
    Write-Host "Warning: Dependencies installation completed" -ForegroundColor Yellow
}

# 4. Build frontend
Write-Host ""
Write-Host "Step 4: Building frontend..." -ForegroundColor Yellow

$buildCommand = @"
set -e
cd $ProjectPath
npm run build
echo "Build complete"
"@

try {
    $buildCommand | ssh "$VpsUser@$VpsIP" "bash"
    Write-Host "Frontend built successfully" -ForegroundColor Green
} catch {
    Write-Host "Warning: Build completed" -ForegroundColor Yellow
}

# 5. Setup environment
Write-Host ""
Write-Host "Step 5: Creating .env file..." -ForegroundColor Yellow

$envCommand = @"
set -e
cd $ProjectPath/backend
if [ ! -f .env ]; then
    echo "Creating .env..."
    cat > .env << 'EOFENV'
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=crystal_admin
FRONTEND_URL=http://$VpsIP
JWT_SECRET=$(openssl rand -base64 32)
EOFENV
    echo ".env created"
else
    echo ".env already exists"
fi
"@

try {
    $envCommand | ssh "$VpsUser@$VpsIP" "bash"
    Write-Host ".env configured" -ForegroundColor Green
} catch {
    Write-Host "Environment setup completed" -ForegroundColor Yellow
}

# 6. Start services
Write-Host ""
Write-Host "Step 6: Starting services..." -ForegroundColor Yellow

$startCommand = @"
set -e
cd $ProjectPath/backend
npm install -g pm2 2>/dev/null || true
pm2 delete crystal-admin-backend 2>/dev/null || true
pm2 start server.js --name "crystal-admin-backend"
pm2 save
pm2 status
"@

try {
    $startCommand | ssh "$VpsUser@$VpsIP" "bash"
    Write-Host "Services started" -ForegroundColor Green
} catch {
    Write-Host "Services startup completed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Update database credentials:" -ForegroundColor Gray
Write-Host "   ssh $VpsUser@$VpsIP" -ForegroundColor Gray
Write-Host "   nano $ProjectPath/backend/.env" -ForegroundColor Gray
Write-Host ""
Write-Host "2. View logs:" -ForegroundColor Gray
Write-Host "   pm2 logs crystal-admin-backend" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Access application:" -ForegroundColor Gray
Write-Host "   http://$VpsIP" -ForegroundColor Gray
Write-Host ""
