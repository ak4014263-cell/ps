#!/bin/bash

# VPS Deployment Script - Deploy from GitHub
# Usage: bash deploy-from-github.sh

set -e

echo "=========================================="
echo "🚀 Crystal Admin - GitHub Deployment"
echo "=========================================="
echo ""

# Configuration
GITHUB_REPO="https://github.com/ak4014263-cell/ps.git"
APP_DIR="/var/www/crystal-admin"
NODE_ENV="production"
PORT=3001
REMBG_PORT=5001

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}1/8 Fixing system and cleaning broken packages...${NC}"
apt-get clean
apt-get autoclean
apt-get autoremove -y
dpkg --configure -a
apt-get update -qq
apt-get install --fix-broken --fix-missing -y -qq
apt-get upgrade -y -qq || true

echo -e "${YELLOW}2/8 Installing dependencies...${NC}"
export DEBIAN_FRONTEND=noninteractive
apt-get install -y -qq curl wget git > /dev/null 2>&1
apt-get install -y -qq nodejs npm > /dev/null 2>&1 || apt-get install -y -qq nodejs-npm > /dev/null 2>&1
apt-get install -y -qq python3 python3-pip python3-venv > /dev/null 2>&1 || true
apt-get install -y -qq redis-server > /dev/null 2>&1 || true
apt-get install -y -qq mysql-server > /dev/null 2>&1 || true

echo -e "${YELLOW}3/8 Installing PM2 globally...${NC}"
npm install -g pm2 -q

echo -e "${YELLOW}4/8 Cloning repository from GitHub...${NC}"
if [ -d "$APP_DIR" ]; then
    echo "   Repository already exists. Updating..."
    cd "$APP_DIR"
    git pull origin main
else
    echo "   Cloning fresh repository..."
    mkdir -p /var/www
    git clone $GITHUB_REPO $APP_DIR
    cd $APP_DIR
fi

echo -e "${YELLOW}5/8 Installing frontend dependencies...${NC}"
npm install -q

echo -e "${YELLOW}6/8 Building frontend...${NC}"
npm run build

echo -e "${YELLOW}7/8 Installing backend dependencies...${NC}"
cd backend
npm install -q
cd ..

echo -e "${YELLOW}8/8 Setting up Python microservice...${NC}"
cd rembg-microservice
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -q -r requirements.txt > /dev/null 2>&1
deactivate
cd ..

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Installation Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

echo "📋 Next steps:"
echo ""
echo "1. Configure environment variables:"
echo "   nano $APP_DIR/backend/.env"
echo ""
echo "   Required variables:"
echo "   PORT=3001"
echo "   DB_HOST=localhost"
echo "   DB_USER=root"
echo "   DB_PASSWORD=<your-password>"
echo "   DB_NAME=id_card"
echo "   REDIS_URL=redis://localhost:6379"
echo "   JWT_SECRET=<generate-random-string>"
echo "   NODE_ENV=production"
echo "   API_BASE_URL=http://72.62.241.170:3001"
echo ""

echo "2. Start services:"
echo "   cd $APP_DIR/backend"
echo "   pm2 start server.js --name 'crystal-admin-backend'"
echo "   pm2 start 'cd ../rembg-microservice && source venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 5001' --name 'rembg-service'"
echo "   pm2 save"
echo ""

echo "3. Verify services:"
echo "   pm2 status"
echo "   pm2 logs crystal-admin-backend"
echo ""

echo "4. Access application:"
echo "   Frontend: http://72.62.241.170"
echo "   API: http://72.62.241.170:3001/api"
echo ""

echo -e "${YELLOW}⚠️  Important: Set up Ubuntu Firewall${NC}"
echo "   sudo ufw allow 22/tcp"
echo "   sudo ufw allow 80/tcp"
echo "   sudo ufw allow 3001/tcp"
echo "   sudo ufw allow 5001/tcp"
echo "   sudo ufw enable"
echo ""
