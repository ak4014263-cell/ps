#!/usr/bin/env pwsh
# Complete Deployment: Backend + Frontend + MySQL

$VpsIP = "72.62.241.170"
$VpsUser = "root"
$Repo = "https://github.com/ak4014263-cell/ps.git"
$Path = "/var/www/crystal-admin"

function RunSSH($cmd) {
    ssh -i "$env:USERPROFILE/.ssh/id_ed25519" "$VpsUser@$VpsIP" $cmd
}

Write-Host "COMPLETE DEPLOYMENT: Backend + Frontend + MySQL" -ForegroundColor Cyan
Write-Host "[1/15] Updating system..." -ForegroundColor Yellow
RunSSH "apt-get update -y && apt-get upgrade -y"

Write-Host "[2/15] Installing Node.js..." -ForegroundColor Yellow
RunSSH "curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs git"

Write-Host "[3/15] Installing PM2..." -ForegroundColor Yellow
RunSSH "npm install -g pm2"

Write-Host "[4/15] Installing MySQL..." -ForegroundColor Yellow
RunSSH "DEBIAN_FRONTEND=noninteractive apt-get install -y mysql-server"

Write-Host "[5/15] Setting up database..." -ForegroundColor Yellow
RunSSH @"
mysql -u root -e "CREATE DATABASE IF NOT EXISTS crystal_admin;"
mysql -u root -e "CREATE USER IF NOT EXISTS 'crystal_admin'@'localhost' IDENTIFIED BY 'changeme';"
mysql -u root -e "GRANT ALL PRIVILEGES ON crystal_admin.* TO 'crystal_admin'@'localhost';"
mysql -u root -e "FLUSH PRIVILEGES;"
"@

Write-Host "[6/15] Cloning from GitHub..." -ForegroundColor Yellow
RunSSH "mkdir -p /var/www && cd /var/www && if [ -d crystal-admin ]; then cd crystal-admin && git pull origin main; else git clone $Repo crystal-admin; fi"

Write-Host "[7/15] Installing backend dependencies..." -ForegroundColor Yellow
RunSSH "cd $Path/backend && npm install --production"

Write-Host "[8/15] Installing frontend dependencies..." -ForegroundColor Yellow
RunSSH "cd $Path && npm install"

Write-Host "[9/15] Building frontend..." -ForegroundColor Yellow
RunSSH "cd $Path && npm run build && du -sh dist"

Write-Host "[10/15] Creating .env file..." -ForegroundColor Yellow
RunSSH @"
cat > $Path/backend/.env << 'EOF'
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_USER=crystal_admin
DB_PASSWORD=changeme
DB_NAME=crystal_admin
FRONTEND_URL=http://$VpsIP
JWT_SECRET=change-this-to-random-secret
EOF
"@

Write-Host "[11/15] Loading database schema..." -ForegroundColor Yellow
RunSSH "if [ -f $Path/MYSQL_SCHEMA_id_card.sql ]; then mysql -u crystal_admin -pchangeme crystal_admin < $Path/MYSQL_SCHEMA_id_card.sql; fi"

Write-Host "[12/15] Installing Nginx..." -ForegroundColor Yellow
RunSSH "apt-get install -y nginx"

Write-Host "[13/15] Configuring Nginx..." -ForegroundColor Yellow
RunSSH @"
cat > /etc/nginx/sites-available/crystal-admin << 'EOF'
server {
  listen 80;
  server_name $VpsIP;
  client_max_body_size 100M;
  location / {
    root $Path/dist;
    try_files `$uri `$uri/ /index.html;
  }
  location /api {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade `$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host `$host;
  }
}
EOF
ln -sf /etc/nginx/sites-available/crystal-admin /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl restart nginx
"@

Write-Host "[14/15] Starting services..." -ForegroundColor Yellow
RunSSH "cd $Path/backend && pm2 delete crystal-admin-backend 2>/dev/null; pm2 start server.js --name crystal-admin-backend; pm2 save; pm2 startup"

Write-Host "[15/15] Checking services..." -ForegroundColor Yellow
RunSSH "pm2 status"

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Access: http://$VpsIP" -ForegroundColor Green
Write-Host "API: http://$VpsIP/api" -ForegroundColor Green
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. Update database password:" -ForegroundColor Gray
Write-Host "   ssh $VpsUser@$VpsIP nano $Path/backend/.env" -ForegroundColor Gray
Write-Host "2. Restart backend:" -ForegroundColor Gray
Write-Host "   ssh $VpsUser@$VpsIP pm2 restart crystal-admin-backend" -ForegroundColor Gray
Write-Host ""
