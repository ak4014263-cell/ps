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

# SSH Command helper
function Run-SshCommand {
    param(
        [string]$Command
    )
    
    $Command | ssh "$VpsUser@$VpsIP" "bash -s"
}

# 1. Remove existing directory
Write-Host "Step 1: Removing existing directory..." -ForegroundColor Yellow

$removeCommand = "rm -rf $ProjectPath && echo 'Directory removed'"
Run-SshCommand $removeCommand
Write-Host "Done" -ForegroundColor Green

# 2. Clone fresh from GitHub
Write-Host ""
Write-Host "Step 2: Cloning fresh repository..." -ForegroundColor Yellow

$cloneCommand = "mkdir -p /var/www && git clone $GitHubRepo $ProjectPath && echo 'Clone complete'"
Run-SshCommand $cloneCommand
Write-Host "Done" -ForegroundColor Green

# 3. Install backend dependencies
Write-Host ""
Write-Host "Step 3: Installing backend dependencies..." -ForegroundColor Yellow

$backendDeps = "cd $ProjectPath/backend && npm install && echo 'Backend deps installed'"
Run-SshCommand $backendDeps
Write-Host "Done" -ForegroundColor Green

# 4. Install frontend dependencies
Write-Host ""
Write-Host "Step 4: Installing frontend dependencies..." -ForegroundColor Yellow

$frontendDeps = "cd $ProjectPath && npm install && echo 'Frontend deps installed'"
Run-SshCommand $frontendDeps
Write-Host "Done" -ForegroundColor Green

# 5. Build frontend
Write-Host ""
Write-Host "Step 5: Building frontend..." -ForegroundColor Yellow

$buildCommand = "cd $ProjectPath && npm run build && echo 'Build complete'"
Run-SshCommand $buildCommand
Write-Host "Done" -ForegroundColor Green

# 6. Setup environment
Write-Host ""
Write-Host "Step 6: Creating .env file..." -ForegroundColor Yellow

$envCommand = @"
cd $ProjectPath/backend
cat > .env << 'EOFENV'
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=crystal_admin
FRONTEND_URL=http://$VpsIP
JWT_SECRET=`$(openssl rand -base64 32)
EOFENV
echo '.env created'
"@

Run-SshCommand $envCommand
Write-Host "Done" -ForegroundColor Green

# 7. Start services
Write-Host ""
Write-Host "Step 7: Starting services with PM2..." -ForegroundColor Yellow

$startCommand = @"
cd $ProjectPath/backend
npm install -g pm2 2>/dev/null || true
pm2 delete crystal-admin-backend 2>/dev/null || true
pm2 start node_modules/.bin/tsx server.ts --name="crystal-admin-backend" 2>/dev/null || pm2 start server.js --name="crystal-admin-backend"
pm2 save
sleep 2
pm2 status
"@

Run-SshCommand $startCommand
Write-Host "Done" -ForegroundColor Green

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
