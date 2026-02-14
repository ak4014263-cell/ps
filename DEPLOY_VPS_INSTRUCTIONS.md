# VPS Deployment Guide

## Prerequisites
- VPS running Ubuntu/Linux (your VPS: **72.62.241.170**)
- SSH access to root account
- At least 4GB RAM, 20GB storage recommended

---

## Deployment Steps

### Step 1: Prepare Deployment Package (LOCAL MACHINE)

The frontend has been built successfully. Now create a deployment package:

```bash
# Navigate to project root
cd "c:\Users\ajayk\Downloads\remix-of-crystal-admin-42-main (1)\remix-of-crystal-admin-42-main"

# Create deployment package
tar -czf deploy.tar.gz \
  dist/ \
  backend/ \
  rembg-microservice/ \
  MYSQL_SCHEMA_id_card.sql \
  setup_vps.sh \
  package.json
```

Or create a ZIP file:
```bash
# Windows - create compressed archive
# Compress: dist, backend, rembg-microservice, MYSQL_SCHEMA_id_card.sql, setup_vps.sh
```

---

### Step 2: Upload to VPS

```bash
# From your local machine, upload the deployment package:
scp deploy.tar.gz root@72.62.241.170:/tmp/

# Or if using Windows PowerShell:
# Install-Module Posh-SSH (if needed)
# Set-SCPItem -ComputerName 72.62.241.170 -Source "deploy.tar.gz" -Destination "/tmp/" -Credential (Get-Credential)
```

---

### Step 3: SSH into VPS and Run Setup

```bash
# SSH into your VPS
ssh root@72.62.241.170

# Extract deployment package
cd /tmp
tar -xzf deploy.tar.gz

# Run setup script
bash setup_vps.sh
```

---

### Step 4: Configure Environment Variables

SSH into VPS and edit backend configuration:

```bash
nano /var/www/crystal-admin/backend/.env
```

Set these required variables:
```
PORT=3001
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=<your-mysql-password>
DB_NAME=id_card
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-here
API_BASE_URL=http://72.62.241.170:3001
NODE_ENV=production
```

---

### Step 5: Start Services

```bash
# Navigate to backend
cd /var/www/crystal-admin/backend

# Start backend with PM2
pm2 start app.js --name "crystal-admin-backend"

# Start Python microservice
cd /var/www/crystal-admin/rembg-microservice
source venv/bin/activate
pm2 start "uvicorn main:app --host 0.0.0.0 --port 5001" --name "rembg-service"

# Save PM2 config to auto-start on reboot
pm2 startup
pm2 save

# Restart Nginx
sudo systemctl restart nginx
```

---

### Step 6: Verify Deployment

```bash
# Check if services are running
pm2 status

# Test frontend
curl http://72.62.241.170

# Test backend API
curl http://72.62.241.170/api/health

# Check logs
pm2 logs crystal-admin-backend
pm2 logs rembg-service
```

---

## Troubleshooting

### ❌ Port 80 already in use
```bash
sudo lsof -i :80
sudo killall nginx
sudo systemctl restart nginx
```

### ❌ Database connection fails
```bash
# Check MySQL status
sudo systemctl status mysql

# Reset MySQL password
sudo mysql
ALTER USER 'root'@'localhost' IDENTIFIED BY 'new-password';
FLUSH PRIVILEGES;
```

### ❌ Node modules missing on VPS
```bash
cd /var/www/crystal-admin/backend
npm install --production
```

### ❌ Python microservice fails
```bash
cd /var/www/crystal-admin/rembg-microservice
source venv/bin/activate
pip install -r requirements.txt
```

---

## Post-Deployment

1. **Access your application**: http://72.62.241.170
2. **Default admin credentials**: Check `create-admin.js` in root
3. **Monitor processes**: 
   ```bash
   pm2 monit
   ```
4. **View logs**:
   ```bash
   pm2 logs
   ```
5. **Enable HTTPS** (optional but recommended):
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot certonly --nginx -d your-domain.com
   ```

---

## Quick Commands Reference

| Command | Purpose |
|---------|---------|
| `pm2 status` | View all running services |
| `pm2 logs` | View application logs |
| `pm2 restart all` | Restart all services |
| `sudo systemctl restart nginx` | Restart web server |
| `sudo mysql id_card < setup.sql` | Import database |

---

## What's Running

- **Frontend**: React app served via Nginx (port 80)
- **Backend API**: Node.js server (port 3001)
- **Rembg Service**: Python microservice (port 5001)
- **Database**: MySQL (port 3306)
- **Cache**: Redis (port 6379)

---

## Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check MySQL logs: `sudo tail -f /var/log/mysql/error.log`

