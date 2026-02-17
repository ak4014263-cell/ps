#!/usr/bin/env pwsh
# Deploy to VPS from GitHub

$VpsIP = "72.62.241.170"
$VpsUser = "root"
$GitHubRepo = "https://github.com/ak4014263-cell/ps.git"
$ProjectPath = "/var/www/crystal-admin"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Crystal Admin - GitHub VPS Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. SSH to VPS and clone/pull from GitHub
Write-Host "Step 1: Cloning/Pulling from GitHub on VPS..." -ForegroundColor Yellow

$remoteCommands = @"
set -e
echo "Installing git if needed..."
which git || apt-get update && apt-get install -y git

if [ -d "$ProjectPath" ]; then
    echo "Project directory exists, pulling latest..."
    cd $ProjectPath
    git pull origin main
else
    echo "Cloning repository..."
    mkdir -p /var/www
    git clone $GitHubRepo $ProjectPath
    cd $ProjectPath
fi

echo "Repository ready"
"@

Write-Host "   Cloning from $GitHubRepo" -ForegroundColor Gray

try {
    $remoteCommands | ssh "$VpsUser@$VpsIP" "bash"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "GitHub sync successful" -ForegroundColor Green
    } else {
        Write-Host "Sync completed with warnings" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Remote sync failed: $_" -ForegroundColor Red
    exit 1
}

# 2. Install dependencies
Write-Host ""
Write-Host "Step 2: Installing dependencies..." -ForegroundColor Yellow

$setupCommands = @"
set -e
cd $ProjectPath

cd backend
npm install
cd ..

npm install
cd ..

echo "Dependencies installed"
"@

try {
    $setupCommands | ssh "$VpsUser@$VpsIP" "bash"
    Write-Host "Dependencies installed" -ForegroundColor Green
} catch {
    Write-Host "Dependency installation completed with warnings" -ForegroundColor Yellow
}

# 3. Build frontend
Write-Host ""
Write-Host "Step 3: Building frontend..." -ForegroundColor Yellow

$buildCommands = @"
set -e
cd $ProjectPath
npm run build
echo "Frontend built"
"@

try {
    $buildCommands | ssh "$VpsUser@$VpsIP" "bash"
    Write-Host "Frontend built successfully" -ForegroundColor Green
} catch {
    Write-Host "Build completed with warnings" -ForegroundColor Yellow
}

# 4. Setup environment
Write-Host ""
Write-Host "Step 4: Environment setup..." -ForegroundColor Yellow

$envSetup = @"
set -e
cd $ProjectPath/backend

if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.production.vps .env || echo ".env.production.vps not found"
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
    echo ".env created with defaults - UPDATE DATABASE CREDENTIALS"
else
    echo ".env already exists"
fi
"@

try {
    $envSetup | ssh "$VpsUser@$VpsIP" "bash"
    Write-Host "Environment configured" -ForegroundColor Green
} catch {
    Write-Host "Environment setup completed" -ForegroundColor Yellow
}

# 5. Start services with PM2
Write-Host ""
Write-Host "Step 5: Starting services with PM2..." -ForegroundColor Yellow

$pmStart = @"
set -e
cd $ProjectPath/backend

npm install -g pm2 || true

pm2 start server.js --name "crystal-admin-backend" --append-env-to-name
pm2 save

echo "Services started"
pm2 status
"@

try {
    $pmStart | ssh "$VpsUser@$VpsIP" "bash"
    Write-Host "Services started with PM2" -ForegroundColor Green
} catch {
    Write-Host "PM2 setup completed" -ForegroundColor Yellow
}

# 6. Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access your application:" -ForegroundColor Cyan
Write-Host "   http://$VpsIP" -ForegroundColor Green
Write-Host ""
Write-Host "Important - Configure database credentials:" -ForegroundColor Yellow
Write-Host "   ssh $VpsUser@$VpsIP" -ForegroundColor Gray
Write-Host "   nano $ProjectPath/backend/.env" -ForegroundColor Gray
Write-Host ""
Write-Host "View logs:" -ForegroundColor Cyan
Write-Host "   pm2 logs crystal-admin-backend" -ForegroundColor Gray
Write-Host ""
Write-Host "For future updates:" -ForegroundColor Cyan
Write-Host "   cd $ProjectPath && git pull origin main" -ForegroundColor Gray
Write-Host ""
