#!/bin/bash
# Complete VPS Deployment Script
cd /var/www/crystal-admin

# Backend setup
echo "=== Installing Backend Dependencies ==="
cd backend && npm install --production
echo "✅ Backend dependencies installed"

# Create .env file
echo "=== Creating .env Configuration ==="
cat > .env << 'ENVEOF'
PORT=3001
NODE_ENV=production
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=id_card
JWT_SECRET=crystal-admin-jwt-2026-kfjdklfjdlkfjdlkjfd  
API_BASE_URL=http://72.62.241.170:3001
REDIS_URL=redis://localhost:6379
VITE_API_BASE_URL=http://72.62.241.170:3001
ENVEOF
echo "✅ .env created"

# Install PM2
echo "=== Installing PM2 ==="
npm install -g pm2 2>&1 | grep -i "added\|up to date"

# Start backend service
echo "=== Starting Backend Service ==="
pm2 delete crystal-admin-backend 2>/dev/null || true
pm2 start server.js --name "crystal-admin-backend" --wait-ready --max-memory-restart 500M
echo "✅ Backend started"

# Verify services
echo ""
echo "=== SERVICE STATUS ==="
pm2 status
pm2 save

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "🌐 Access:"
echo "   Frontend: http://72.62.241.170"
echo "   API: http://72.62.241.170:3001/api"
echo ""
echo "📊 Monitor:"
echo "   pm2 status"
echo "   pm2 logs"
