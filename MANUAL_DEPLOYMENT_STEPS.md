# 🚀 Manual VPS Deployment from GitHub

Your GitHub repo: **https://github.com/ak4014263-cell/ps**  
Your VPS: **72.62.241.170**

---

## Step 1: Connect to VPS

```bash
ssh root@72.62.241.170
```

Enter your VPS password when prompted.

---

## Step 2: Clone the Repository

```bash
cd /var/www
git clone https://github.com/ak4014263-cell/ps.git crystal-admin
cd crystal-admin
```

(If already cloned, just pull latest):
```bash
cd /var/www/crystal-admin
git pull origin main
```

---

## Step 3: Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install --production
cd ..

# Install frontend dependencies
npm install
```

---

## Step 4: Build Frontend

```bash
npm run build
```

---

## Step 5: Configure Environment

```bash
cd backend
nano .env
```

Create/update with these values:
```env
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=crystal_admin
FRONTEND_URL=http://72.62.241.170
JWT_SECRET=your_random_secret_key
```

Save and exit: `CTRL+X`, then `Y`, then `Enter`

---

## Step 6: Install/Update PM2

```bash
npm install -g pm2
```

---

## Step 7: Start Services

```bash
# Make sure you're in backend directory
cd /var/www/crystal-admin/backend

# Start backend
pm2 start server.js --name "crystal-admin-backend"

# Save PM2 configuration
pm2 save

# Check status
pm2 status
```

---

## Step 8: Setup PM2 Autostart (On Reboot)

```bash
pm2 startup
pm2 save
```

---

## 🌐 Access Your App

Open browser: **http://72.62.241.170**

---

## 📊 Useful Commands

**View logs:**
```bash
pm2 logs crystal-admin-backend
```

**View all services:**
```bash
pm2 status
```

**Restart service:**
```bash
pm2 restart crystal-admin-backend
```

**Pull latest from GitHub:**
```bash
cd /var/www/crystal-admin
git pull origin main
npm install
npm run build
pm2 restart crystal-admin-backend
```

**Stop service:**
```bash
pm2 stop crystal-admin-backend
```

**Start service:**
```bash
pm2 start crystal-admin-backend
```

---

## 🔧 Troubleshooting

**Check if port 3001 is listening:**
```bash
netstat -tuln | grep 3001
```

**View Node process:**
```bash
ps aux | grep node
```

**Check disk space:**
```bash
df -h
```

**Check database connection:**
```bash
# From backend directory
node -e "require('dotenv').config(); console.log(process.env.DB_HOST, process.env.DB_USER, process.env.DB_NAME)"
```

---

## 📝 Deployment Script Alternative

Or run this automated script on the VPS:

```bash
cd /var/www/crystal-admin
bash deploy-vps-setup.sh
```

Make sure you've copied `deploy-vps-setup.sh` to the VPS first.

