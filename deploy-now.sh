#!/bin/bash
set -e

echo "=== STEP 1: Clone Repository ==="
mkdir -p /var/www
cd /var/www
if [ ! -d "crystal-admin" ]; then
    git clone https://github.com/ak4014263-cell/cvd.git crystal-admin
    cd crystal-admin
else
    cd crystal-admin
    git pull origin main
fi

echo "=== STEP 2: Install Dependencies ==="
npm install --production

echo "=== STEP 3: Build Frontend ==="
npm run build

echo "=== STEP 4: Setup Backend ==="
cd backend
npm install --production
cd ..

echo "=== STEP 5: Install PM2 ==="
npm install -g pm2

echo "=== STEP 6: Create .env file ==="
cat > backend/.env << 'EOF'
PORT=3001
NODE_ENV=production
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=id_card
JWT_SECRET=$(openssl rand -hex 32)
API_BASE_URL=http://72.62.241.170:3001
REDIS_URL=redis://localhost:6379
EOF

echo "=== STEP 7: Start Backend Service ==="
cd backend
pm2 delete "crystal-admin-backend" 2>/dev/null || true
pm2 start server.js --name "crystal-admin-backend" --wait-ready

echo "=== STEP 8: Setup Python Microservice ==="
cd ../rembg-microservice
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -q -r requirements.txt 2>/dev/null || true

echo "=== STEP 9: Start Python Service ==="
pm2 delete "rembg-service" 2>/dev/null || true
pm2 start "uvicorn main:app --host 0.0.0.0 --port 5001" --name "rembg-service"

echo "=== STEP 10: Save PM2 Configuration ==="
pm2 save
pm2 startup -u root --hp /root

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "🌐 Access your application:"
echo "   Frontend: http://72.62.241.170"
echo "   API: http://72.62.241.170:3001/api"
echo ""
echo "📊 Check services:"
echo "   pm2 status"
echo "   pm2 logs"
echo ""
