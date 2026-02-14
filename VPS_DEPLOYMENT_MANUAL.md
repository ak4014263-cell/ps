# VPS Deployment Guide - Manual Steps

## Quick Summary
**VPS IP**: 72.62.241.170  
**GitHub Repo**: https://github.com/ak4014263-cell/cvd.git  
**App Directory**: /var/www/crystal-admin

---

## ⚠️ Fix Broken Packages First

If you encounter "Unable to correct problems, you have held broken packages", run these commands:

```bash
ssh root@72.62.241.170

# Fix broken packages
dpkg --configure -a
apt-get clean
apt-get update
apt-get install --fix-broken -y
apt-get autoremove -y
apt-get autoclean
```

---

## Step-by-Step Deployment

### Step 1: Clone Repository
```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/ak4014263-cell/cvd.git crystal-admin
cd crystal-admin
```

### Step 2: Install System Dependencies
```bash
# Update package manager
apt-get update
apt-get upgrade -y

# Install Node.js and npm
apt-get install -y curl wget git nodejs npm

# Install Python
apt-get install -y python3 python3-pip python3-venv

# Install databases (optional, for testing)
apt-get install -y redis-server
```

### Step 3: Install PM2 (Process Manager)
```bash
npm install -g pm2
```

### Step 4: Build Frontend
```bash
cd /var/www/crystal-admin
npm install
npm run build
```

### Step 5: Setup Backend
```bash
cd /var/www/crystal-admin/backend
npm install
```

### Step 6: Configure Backend Environment
```bash
nano .env
```

Add these variables:
```
PORT=3001
NODE_ENV=production
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=<YOUR_MYSQL_PASSWORD>
DB_NAME=id_card
JWT_SECRET=generate-strong-random-string-here
API_BASE_URL=http://72.62.241.170:3001
REDIS_URL=redis://localhost:6379
```

Save: `Ctrl+O` then `Enter` then `Ctrl+X`

### Step 7: Setup Python Microservice
```bash
cd /var/www/crystal-admin/rembg-microservice
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Step 8: Start Services with PM2
```bash
# Start backend
cd /var/www/crystal-admin/backend
pm2 start server.js --name "crystal-admin-backend" --wait-ready

# Start Python service
cd /var/www/crystal-admin/rembg-microservice
source venv/bin/activate
pm2 start "uvicorn main:app --host 0.0.0.0 --port 5001" --name "rembg-service"

# Save configuration
pm2 save
pm2 startup
```

### Step 9: Verify Services
```bash
pm2 status
pm2 logs
```

---

## 🌐 Access Your Application

- **Frontend**: http://72.62.241.170
- **API**: http://72.62.241.170:3001/api

---

## 📊 Useful Commands

### Check Service Status
```bash
pm2 status
pm2 list
```

### View Logs
```bash
pm2 logs              # All services
pm2 logs crystal-admin-backend
pm2 logs rembg-service
```

### Restart Services
```bash
pm2 restart all
pm2 restart crystal-admin-backend
```

### Stop Services
```bash
pm2 stop all
pm2 delete all
```

### Monitor in Real-time
```bash
pm2 monit
```

---

## 🔧 Troubleshooting

### Port 80/3001 Already in Use
```bash
lsof -i :3001
kill -9 <PID>

# OR restart PM2
pm2 restart all
```

### Not Enough Space
```bash
df -h
du -sh /var/www/crystal-admin
```

### Database Connection Failed
```bash
# Check MySQL
sudo systemctl status mysql
sudo mysql -u root -p

# Test connection
mysql -u root -p id_card -e "SELECT VERSION();"
```

### Missing Node Modules
```bash
cd /var/www/crystal-admin
npm install --production
cd backend && npm install --production
```

---

## 📝 One-Line Deploy (If All Dependencies Fixed)

```bash
ssh root@72.62.241.170 "bash <(curl -s https://raw.githubusercontent.com/ak4014263-cell/cvd/main/vps-deploy-quick.sh)"
```

---

## ⚡ Quick Auto-Deployment Script

Save this as `deploy.sh` locally:

```bash
#!/bin/bash
VPS_IP="72.62.241.170"
scp vps-deploy-quick.sh root@$VPS_IP:/tmp/
ssh root@$VPS_IP "bash /tmp/vps-deploy-quick.sh"
```

Then run:
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 📋 Post-Deployment Checklist

- [ ] Frontend builds without errors
- [ ] Backend starts without errors
- [ ] Can access frontend at http://72.62.241.170
- [ ] API responds at http://72.62.241.170:3001/api
- [ ] PM2 saved for auto-restart on reboot
- [ ] Environment variables configured
- [ ] Database connected successfully
- [ ] Services monitored with pm2 monit

---

## 🚨 Emergency Commands

```bash
# Full reset (caution!)
pm2 delete all
pm2 kill
cd /var/www/crystal-admin
git pull origin main
npm install
npm run build
cd backend && npm install
# Then restart services

# Check all ports
netstat -tulpn | grep LISTEN

# Free up space
apt-get clean && apt-get autoclean

# Restart everything
reboot
```
