#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting VPS Setup for Crystal Admin"

# 1. Update and Install System Dependencies
echo "📦 Installing system dependencies..."
sudo apt update
sudo apt install -y nginx mysql-server redis-server python3-pip python3-venv zip unzip curl

# 2. Install PM2 globally
echo "📦 Installing PM2..."
pm2_install_cmd="npm install -g pm2"
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    $pm2_install_cmd
else
    echo "PM2 already installed"
fi

# 3. Create App Directory
echo "📁 Setting up app directory..."
sudo mkdir -p /var/www/crystal-admin
sudo chown -R $USER:$USER /var/www/crystal-admin

# 4. Extract Files
echo "📂 Extracting files..."
unzip -o /tmp/deploy.zip -d /var/www/crystal-admin
cd /var/www/crystal-admin

# 5. Setup MySQL
echo "🗄️ Setting up MySQL database..."
# Check if database exists, if not create it
sudo mysql -e "CREATE DATABASE IF NOT EXISTS id_card CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
# Import schema
sudo mysql id_card < MYSQL_SCHEMA_id_card.sql

# 6. Setup Backend (Node.js)
echo "☕ Setting up Node.js backend..."
# Node.js dependencies should be installed only if not already present
cd /var/www/crystal-admin/backend
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install --production
else
    echo "Node modules already installed"
fi
# Create .env if not exists (minimal)
if [ ! -f .env ]; then
  cat <<EOF > .env
PORT=3001
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=id_card
REDIS_URL=redis://localhost:6379
EOF
fi

# 7. Setup Rembg Microservice (Python)
echo "🐍 Setting up Python microservice..."
cd /var/www/crystal-admin/rembg-microservice
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install fastapi uvicorn rembg pillow python-multipart python-socketio
deactivate

# 8. Configure Nginx
echo "🌐 Configuring Nginx..."
cat <<EOF | sudo tee /etc/nginx/sites-available/crystal-admin
server {
    listen 80;
    server_name 72.62.241.170;

    # Frontend
    location / {
        root /var/www/crystal-admin/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Uploads static files
    location /uploads {
        alias /var/www/crystal-admin/backend/uploads;
        add_header Access-Control-Allow-Origin *;
    }

    # Rembg Microservice (if needed directly)
    location /rembg {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        rewrite ^/rembg/(.*) /\$1 break;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/crystal-admin /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default || true
sudo nginx -t
sudo systemctl restart nginx

# 9. Start Services with PM2
echo "🚀 Starting services with PM2..."
cd /var/www/crystal-admin/backend
pm2 delete crystal-backend || true
pm2 start server.js --name crystal-backend

cd /var/www/crystal-admin/rembg-microservice
pm2 delete rembg-service || true
pm2 start "venv/bin/python3 app.py" --name rembg-service --env PORT=5001

pm2 save
# Ensure PM2 starts on boot
pm2 startup | tail -n 1 | bash || true

echo "✅ Deployment Complete!"
echo "📍 Frontend: http://72.62.241.170"
echo "📍 API: http://72.62.241.170/api"
