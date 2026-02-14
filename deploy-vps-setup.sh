#!/bin/bash
# Deploy Crystal Admin from GitHub to VPS - Run this on the VPS server

set -e

echo "=========================================="
echo "🚀 Crystal Admin - GitHub VPS Deploy"
echo "=========================================="
echo ""

REPO_URL="https://github.com/ak4014263-cell/ps.git"
PROJECT_PATH="/var/www/crystal-admin"

# 1. Clone or pull
echo "1️⃣  Syncing from GitHub..."
if [ -d "$PROJECT_PATH" ]; then
    echo "   Pulling latest..."
    cd "$PROJECT_PATH"
    git pull origin main
else
    echo "   Cloning..."
    mkdir -p /var/www
    git clone "$REPO_URL" "$PROJECT_PATH"
fi
echo "✅ Repository synced"
echo ""

# 2. Install dependencies
echo "2️⃣  Installing dependencies..."
cd "$PROJECT_PATH"

# Backend
if [ -f "backend/package.json" ]; then
    cd backend
    npm install --production
    cd ..
fi

# Frontend
if [ -f "package.json" ]; then
    npm install
fi
echo "✅ Dependencies installed"
echo ""

# 3. Build frontend
echo "3️⃣  Building frontend..."
npm run build
echo "✅ Frontend built"
echo ""

# 4. Setup environment
echo "4️⃣  Configuring environment..."
cd backend

if [ ! -f .env ]; then
    echo "   Creating .env file..."
    cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=crystal_admin
FRONTEND_URL=http://72.62.241.170
JWT_SECRET=your_jwt_secret_here_change_this
EOF
    echo "⚠️  .env created with defaults - UPDATE DATABASE CREDENTIALS!"
else
    echo "✅ .env exists"
fi
echo ""

# 5. Stop existing services
echo "5️⃣  Stopping existing services..."
pm2 delete "crystal-admin-backend" 2>/dev/null || true
echo ""

# 6. Start services
echo "6️⃣  Starting services with PM2..."
pm2 start server.js --name "crystal-admin-backend" --append-env-to-name
pm2 save
echo "✅ Services started"
echo ""

# 7. Show status
echo "7️⃣  Current services:"
pm2 status
echo ""

echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "🌐 Access app at: http://72.62.241.170"
echo ""
echo "⚠️  IMPORTANT - Update .env file:"
echo "   nano $PROJECT_PATH/backend/.env"
echo "   Update DB_PASSWORD and JWT_SECRET"
echo ""
echo "📊 View logs:"
echo "   pm2 logs crystal-admin-backend"
echo ""
