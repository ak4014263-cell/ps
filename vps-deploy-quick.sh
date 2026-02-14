#!/bin/bash
# VPS Deployment - One-line executable from GitHub
# Run on VPS: bash <(curl -s https://raw.githubusercontent.com/ak4014263-cell/cvd/main/deploy-from-github.sh)

set -e
trap 'echo "Error on line $LINENO"' ERR

APP_DIR="/var/www/crystal-admin"
GITHUB_REPO="https://github.com/ak4014263-cell/cvd.git"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

log_info "=========================================="
log_info "🚀 Crystal Admin VPS Deployment"
log_info "=========================================="

# Step 1: Fix broken packages
log_info "Step 1/7: Fixing system packages..."
export DEBIAN_FRONTEND=noninteractive
dpkg --configure -a 2>/dev/null || true
apt-get update -qq 2>/dev/null || true
apt-get install --fix-broken -y 2>/dev/null || true
apt-get autoremove -y -qq 2>/dev/null || true
apt-get clean 2>/dev/null || true

# Step 2: Install essential packages
log_info "Step 2/7: Installing dependencies..."
apt-get update -qq
apt-get install -y curl wget git build-essential 2>&1 | grep -i "setting up\|already" | head -5
apt-get install -y nodejs npm 2>&1 | grep -i "setting up\|already" | head -3
apt-get install -y python3 python3-pip python3-venv 2>&1 | grep -i "setting up\|already" | head -3

# Step 3: Install PM2
log_info "Step 3/7: Setting up PM2..."
npm install -g pm2 2>&1 | tail -1

# Step 4: Clone/Update repository
log_info "Step 4/7: Cloning/updating from GitHub..."
if [ -d "$APP_DIR/.git" ]; then
    log_warn "Repository exists. Updating..."
    cd "$APP_DIR"
    git pull origin main 2>&1 | head -3
else
    log_warn "Cloning fresh repository..."
    mkdir -p /var/www
    git clone $GITHUB_REPO $APP_DIR 2>&1 | tail -2
    cd "$APP_DIR"
fi

# Step 5: Build frontend
log_info "Step 5/7: Installing and building frontend..."
npm install 2>&1 | tail -1
npm run build 2>&1 | tail -1

# Step 6: Setup backend
log_info "Step 6/7: Setting up backend..."
cd backend
npm install 2>&1 | tail -1
cd ..

# Step 7: Setup Python microservice
log_info "Step 7/7: Setting up Python microservice..."
cd rembg-microservice
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -q -r requirements.txt 2>/dev/null || pip install -q -r requirements.txt --no-cache-dir 2>/dev/null || true
deactivate
cd ..

log_info "=========================================="
log_info "✅ Deployment Complete!"
log_info "=========================================="
echo ""

echo "📝 Next Steps:"
echo ""
echo "1️⃣  Configure Backend (.env file):"
echo "   sudo nano $APP_DIR/backend/.env"
echo ""
echo "   Add these variables:"
echo "   ----"
echo "   PORT=3001"
echo "   NODE_ENV=production"
echo "   DB_HOST=localhost"
echo "   DB_USER=root"
echo "   DB_PASSWORD=YOUR_MYSQL_PASSWORD"
echo "   DB_NAME=id_card"
echo "   JWT_SECRET=$(openssl rand -hex 32)"
echo "   API_BASE_URL=http://72.62.241.170:3001"
echo "   REDIS_URL=redis://localhost:6379"
echo "   ----"
echo ""

echo "2️⃣  Start Backend Service:"
echo "   cd $APP_DIR/backend"
echo "   pm2 start server.js --name 'crystal-admin-backend' --wait-ready"
echo ""

echo "3️⃣  Start Python Microservice:"
echo "   cd $APP_DIR/rembg-microservice"
echo "   source venv/bin/activate"
echo "   pm2 start 'uvicorn main:app --host 0.0.0.0 --port 5001' --name 'rembg-service'"
echo ""

echo "4️⃣  Save PM2 Config:"
echo "   pm2 save"
echo "   pm2 startup"
echo ""

echo "5️⃣  Verify Services:"
echo "   pm2 status"
echo "   pm2 logs"
echo ""

echo "🌐 Access:"
echo "   Frontend: http://72.62.241.170"
echo "   API: http://72.62.241.170:3001/api"
echo ""

echo "📊 Check Deployment:"
echo "   cd $APP_DIR"
echo "   ls -la dist/ (frontend build)"
echo "   ls -la backend/ (backend code)"
echo ""
