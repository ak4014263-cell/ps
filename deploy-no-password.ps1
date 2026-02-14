#!/usr/bin/env pwsh
# Deploy from GitHub to VPS - No Password Required with SSH Key

$VpsIP = "72.62.241.170"
$VpsUser = "root"
$GitHubRepo = "https://github.com/ak4014263-cell/ps.git"
$ProjectPath = "/var/www/crystal-admin"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 GitHub to VPS Deployment (No Password)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Helper function to run SSH commands
function Invoke-RemoteCommand {
    param(
        [string]$Command,
        [string]$Description = ""
    )
    
    if ($Description) {
        Write-Host $Description -ForegroundColor Yellow
    }
    
    ssh -i "$env:USERPROFILE/.ssh/id_ed25519" "$VpsUser@$VpsIP" $Command
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Command failed with exit code $LASTEXITCODE" -ForegroundColor Yellow
    }
}

# Step 1: Clone/Pull from GitHub
Invoke-RemoteCommand -Command "mkdir -p /var/www && cd /var/www && if [ -d crystal-admin ]; then cd crystal-admin && git pull origin main; else git clone $GitHubRepo crystal-admin; fi && echo '✅ Repository synced'" -Description "1️⃣  Syncing from GitHub..."

# Step 2: Install dependencies
Invoke-RemoteCommand -Command "cd $ProjectPath && cd backend && npm install --production && cd .. && npm install && echo '✅ Dependencies installed'" -Description "2️⃣  Installing dependencies..."

# Step 3: Build frontend
Invoke-RemoteCommand -Command "cd $ProjectPath && npm run build && echo '✅ Frontend built'" -Description "3️⃣  Building frontend..."

# Step 4: Setup environment
Invoke-RemoteCommand -Command "cd $ProjectPath/backend && if [ ! -f .env ]; then cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=changeme
DB_NAME=crystal_admin
FRONTEND_URL=http://$VpsIP
JWT_SECRET=change-this-secret-key
EOF
echo '⚠️  .env created - UPDATE DATABASE CREDENTIALS!'; else echo '✅ .env exists'; fi" -Description "4️⃣  Configuring environment..."

# Step 5: Stop existing PM2 services
Invoke-RemoteCommand -Command "pm2 delete crystal-admin-backend 2>/dev/null || true && echo '✅ Old services cleared'" -Description "5️⃣  Clearing old services..."

# Step 6: Start services with PM2
Invoke-RemoteCommand -Command "cd $ProjectPath/backend && npm install -g pm2 2>/dev/null && pm2 start server.js --name 'crystal-admin-backend' && pm2 save && echo '✅ Services started'" -Description "6️⃣  Starting services..."

# Step 7: Show status
Invoke-RemoteCommand -Command "pm2 status" -Description "7️⃣  Service status:"

# Done
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Access app:" -ForegroundColor Cyan
Write-Host "   http://$VpsIP" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  IMPORTANT - Update database credentials:" -ForegroundColor Yellow
Write-Host "   ssh $VpsUser@$VpsIP" -ForegroundColor Gray
Write-Host "   nano $ProjectPath/backend/.env" -ForegroundColor Gray
Write-Host ""
Write-Host "📊 View logs:" -ForegroundColor Cyan
Write-Host "   ssh $VpsUser@$VpsIP pm2 logs crystal-admin-backend" -ForegroundColor Gray
Write-Host ""
