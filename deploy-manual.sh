#!/bin/bash

# Manual Deployment Script - Bypasses apt conflicts
set -e
cd /var/www/crystal-admin

echo "=== Step 1: Setup MySQL Database ==="
sudo mysql -e "CREATE DATABASE IF NOT EXISTS id_card CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || true
sudo mysql id_card < MYSQL_SCHEMA_id_card.sql 2>/dev/null || echo "Database already imported"

echo "=== Step 2: Install Backend Dependencies ==="
cd /var/www/crystal-admin/backend
if [ ! -d "node_modules" ]; then
  npm install --production
else
  echo "Node modules already installed"
fi

echo "=== Step 3: Create Backend .env ==="
if [ ! -f .env ]; then
  cat > .env << 'ENVEOF'
PORT=3001
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=id_card
REDIS_URL=redis://localhost:6379
ENVEOF
fi

echo "=== Step 4: Setup Python Microservice ==="
cd /var/www/crystal-admin/rembg-microservice
if [ ! -d "venv" ]; then
  python3 -m venv venv
  source venv/bin/activate
  pip install --upgrade pip
  pip install fastapi uvicorn rembg pillow python-multipart python-socketio
  deactivate
else
  echo "Python venv already setup"
fi

echo "=== Step 5: Configure Nginx ==="
sudo tee /etc/nginx/sites-available/crystal-admin > /dev/null << 'NGINXEOF'
server {
    listen 80;
    server_name 72.62.241.170;

    location / {
        root /var/www/crystal-admin/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads {
        alias /var/www/crystal-admin/backend/uploads;
        add_header Access-Control-Allow-Origin *;
    }

    location /rembg {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        rewrite ^/rembg/(.*) /$1 break;
    }
}
NGINXEOF

sudo ln -sf /etc/nginx/sites-available/crystal-admin /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default || true
sudo nginx -t
sudo systemctl restart nginx

echo "=== Step 6: Install PM2 Globally ==="
if ! command -v pm2 &> /dev/null; then
  sudo npm install -g pm2
fi

echo "=== Step 7: Start Services with PM2 ==="
cd /var/www/crystal-admin/backend
pm2 delete crystal-backend || true
pm2 start server.js --name crystal-backend

cd /var/www/crystal-admin/rembg-microservice
pm2 delete rembg-service || true
pm2 start "venv/bin/python3 app.py" --name rembg-service --env PORT=5001

pm2 save
pm2 startup | tail -n 1 | sudo bash || true

echo ""
echo "✅ Deployment Complete!"
echo "📍 Frontend: http://72.62.241.170"
echo "📍 API: http://72.62.241.170/api"
echo "📍 Check status: pm2 status"
