# ✅ GitHub Secrets Quick Reference - Copy & Paste Format

Use this checklist while adding secrets to: https://github.com/ak4014263-cell/ps/settings/secrets/actions

## 🔐 Required Secrets (Add Each One)

### 1. PROD_API_URL
```
Name: PROD_API_URL
Value: https://api.yourdomain.com
```
Replace `yourdomain.com` with your actual production domain.

---

### 2. PROD_DEPLOY_HOST
```
Name: PROD_DEPLOY_HOST
Value: prod.server.com
```
Replace with your production server IP or hostname (e.g., 192.168.1.100 or api.example.com)

---

### 3. PROD_DEPLOY_USER
```
Name: PROD_DEPLOY_USER
Value: ubuntu
```
Replace `ubuntu` with your SSH user (could be: ubuntu, ec2-user, deployuser, root, etc.)

---

### 4. PROD_DEPLOY_SSH_KEY ⚠️ CRITICAL
```
Name: PROD_DEPLOY_SSH_KEY
Value: [ENTIRE CONTENTS OF YOUR PRIVATE SSH KEY]
```

**Steps:**
1. Open your SSH private key file (e.g., C:\Users\YourUser\.ssh\id_rsa)
2. Select ALL content (Ctrl+A)
3. Copy it (Ctrl+C)
4. Paste here
5. Must include `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`

---

### 5. DEV_API_URL
```
Name: DEV_API_URL
Value: https://dev-api.yourdomain.com
```
Your development domain.

---

### 6. DEV_DEPLOY_HOST
```
Name: DEV_DEPLOY_HOST
Value: dev.server.com
```
Your development server IP/hostname.

---

### 7. DEV_DEPLOY_USER
```
Name: DEV_DEPLOY_USER
Value: ubuntu
```
SSH user for dev server (can be same as production).

---

### 8. DATABASE_URL
```
Name: DATABASE_URL
Value: mysql://username:password@hostname:3306/dbname
```

**Examples:**
- MySQL: `mysql://root:password@localhost:3306/crystal_admin`
- PostgreSQL: `postgresql://user:pass@host:5432/dbname`
- SQLite: `sqlite:///./db.sqlite3`

---

### 9. REDIS_URL
```
Name: REDIS_URL
Value: redis://localhost:6379
```

**Examples:**
- Local: `redis://localhost:6379`
- Remote: `redis://:password@redis-host:6379`
- Cluster: `redis://node1:6379,node2:6379`

---

### 10. JWT_SECRET
```
Name: JWT_SECRET
Value: your-super-long-and-random-secret-key-minimum-32-characters-here
```

**Generate a random one in PowerShell:**
```powershell
$bytes = [System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
[System.Convert]::ToBase64String($bytes)
```

**Or use any complex string (min 32 chars):**
```
crystal-admin-jwt-secret-key-2026-very-long-and-secure-string
```

---

## ✅ Optional Secrets (Only if using Supabase)

### 11. SUPABASE_URL (Optional)
```
Name: SUPABASE_URL
Value: https://your-project.supabase.co
```
Only add if using Supabase backend.

### 12. SUPABASE_KEY (Optional)
```
Name: SUPABASE_KEY
Value: your_supabase_anon_key
```
Only add if using Supabase backend.

---

## 📝 Step-by-Step Instructions

### For Each Secret Above:

1. **Go to:** https://github.com/ak4014263-cell/ps/settings/secrets/actions
2. **Click:** Green "New repository secret" button (top right)
3. **Fill in:**
   - **Name:** (Copy from the `Name:` field above)
   - **Secret:** (Copy from the `Value:` field above)
4. **Click:** "Add secret" button
5. **Repeat** for each secret

---

## ⏱️ Estimated Time

- Add all 10 secrets: **15-20 minutes**
- Set up server: **10-15 minutes**
- Test deployment: **5 minutes**

**Total: ~30-40 minutes until first automated deployment**

---

## ✨ What Happens After You Add Secrets

1. ✅ GitHub Actions workflows become fully active
2. ✅ Next push will automatically test & build your code
3. ✅ Push to `main` will attempt auto-deployment (needs server setup)
4. ✅ Health checks will run every 15 minutes

---

## 🚀 Complete Setup Sequence

```
1. Add 10 secrets here ← YOU ARE HERE
   ↓
2. Set up deployment server (run setup-ci-cd-server.sh)
   ↓
3. Push code to main/develop
   ↓
4. Watch GitHub Actions automatically deploy
   ↓
5. ✅ Enjoy automated deployments!
```

---

**Need help?** Open `GITHUB_SECRETS_MANUAL_SETUP.md` for detailed explanations.

**Ready?** Start adding secrets to GitHub above! 🎯
