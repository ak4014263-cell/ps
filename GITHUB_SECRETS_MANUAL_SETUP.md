# 🔐 GitHub Secrets Configuration - Manual Setup Guide

Since GitHub CLI is not available, follow this guide to manually add secrets to your GitHub repository.

## 📋 Required Secrets (Copy all of these)

### Minimum Required (10-12 secrets)
```
PROD_API_URL
PROD_DEPLOY_HOST
PROD_DEPLOY_USER
PROD_DEPLOY_SSH_KEY
DEV_API_URL
DEV_DEPLOY_HOST
DEV_DEPLOY_USER
DATABASE_URL
REDIS_URL
JWT_SECRET
SUPABASE_URL (optional)
SUPABASE_KEY (optional)
```

## 🔧 Step-by-Step: Add Secrets to GitHub

### Step 1: Go to Your Repository Settings
```
https://github.com/ak4014263-cell/ps/settings/secrets/actions
```

Or manually:
1. Go to: https://github.com/ak4014263-cell/ps
2. Click **Settings**
3. Click **Secrets and variables** (left sidebar)
4. Click **Actions**

### Step 2: Click "New Repository Secret"
You'll see a green button in the top right.

### Step 3: Add Each Secret

For each secret below, click "New repository secret" and fill in:
- **Name**: The secret name (copy exactly)
- **Secret**: The secret value (from your configuration)

**Click "Add secret" after each one.**

---

## 📝 Values to Enter

### Production Secrets

#### 1. PROD_API_URL
**Name:** `PROD_API_URL`
**Value:** Example: `https://api.yourdomain.com`
- Replace with your actual production API URL
- Must start with https://

#### 2. PROD_DEPLOY_HOST
**Name:** `PROD_DEPLOY_HOST`
**Value:** Example: `prod.server.com` or `192.168.1.100`
- Your production server IP address or hostname
- Don't include https:// or port

#### 3. PROD_DEPLOY_USER
**Name:** `PROD_DEPLOY_USER`
**Value:** Example: `deployuser` or `ubuntu`
- SSH username for your production server
- Usually: ubuntu, ec2-user, deployuser, or root

#### 4. PROD_DEPLOY_SSH_KEY
**Name:** `PROD_DEPLOY_SSH_KEY`
**Value:** [Contents of your private SSH key]

Steps:
1. Open your SSH private key file (e.g., `~/.ssh/id_rsa`)
2. Copy the ENTIRE contents (including `-----BEGIN...` and `-----END...` lines)
3. Paste it as the value
4. Click "Add secret"

**Important:** This is a PRIVATE key, treat it as sensitive.

---

### Development Secrets

#### 5. DEV_API_URL
**Name:** `DEV_API_URL`
**Value:** Example: `https://dev-api.yourdomain.com`

#### 6. DEV_DEPLOY_HOST
**Name:** `DEV_DEPLOY_HOST`
**Value:** Example: `dev.server.com` or IP address

#### 7. DEV_DEPLOY_USER
**Name:** `DEV_DEPLOY_USER`
**Value:** SSH user for dev server (usually same as production)

---

### Database & Services

#### 8. DATABASE_URL
**Name:** `DATABASE_URL`
**Value:** Connection string

**PostgreSQL example:**
```
postgresql://username:password@hostname:5432/dbname
```

**MySQL example:**
```
mysql://username:password@hostname:3306/dbname
```

**SQLite example:**
```
sqlite:///./db.sqlite3
```

#### 9. REDIS_URL
**Name:** `REDIS_URL`
**Value:** Example: `redis://localhost:6379`

Or for remote Redis:
```
redis://:password@redis-host:6379/0
```

#### 10. JWT_SECRET
**Name:** `JWT_SECRET`
**Value:** A long random string (minimum 32 characters)

**Generate a secure one:**
```powershell
# PowerShell
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)) | Write-Host
```

Or use any complex string like:
```
your-super-secret-jwt-key-with-at-least-32-characters-minimum
```

---

### Optional Secrets

#### 11. SUPABASE_URL (Optional)
**Name:** `SUPABASE_URL`
**Value:** Example: `https://your-project.supabase.co`

- Only if you're using Supabase
- Leave blank to skip

#### 12. SUPABASE_KEY (Optional)
**Name:** `SUPABASE_KEY`
**Value:** Your Supabase anon key

- Only if you're using Supabase
- Leave blank to skip

---

## ✅ Verification Checklist

After adding all secrets, verify they're set:

1. Go to Settings → Secrets and variables → Actions
2. You should see all added secrets listed
3. Values are masked (shown as dots)
4. No errors or warnings

**Secrets added should show:**
- ✅ PROD_API_URL
- ✅ PROD_DEPLOY_HOST
- ✅ PROD_DEPLOY_USER
- ✅ PROD_DEPLOY_SSH_KEY
- ✅ DEV_API_URL
- ✅ DEV_DEPLOY_HOST
- ✅ DEV_DEPLOY_USER
- ✅ DATABASE_URL
- ✅ REDIS_URL
- ✅ JWT_SECRET
- ⚠️ SUPABASE_URL (optional)
- ⚠️ SUPABASE_KEY (optional)

---

## 🚀 What Happens Next

Once all secrets are configured:

1. **Your workflows are ready** but won't deploy yet
   - CI workflow will run (tests, builds)
   - Docker workflow will run (builds images)
   - Deploy workflow needs server to be ready

2. **Next step: Set up your deployment server**
   ```bash
   ssh user@your-server.com
   curl -O https://raw.githubusercontent.com/ak4014263-cell/ps/main/setup-ci-cd-server.sh
   sudo bash setup-ci-cd-server.sh
   ```

3. **Then: Test the deployment**
   ```bash
   git push origin main
   # Watch: https://github.com/ak4014263-cell/ps/actions
   ```

---

## 🔒 Security Tips

- ✅ Keep SSH private key SECRET (don't share)
- ✅ Don't commit secrets to GitHub
- ✅ GitHub masks secret values in logs
- ✅ Rotate keys quarterly
- ✅ Use different keys for prod/dev (if possible)
- ✅ Review secret access logs regularly

---

## 🆘 Troubleshooting

### "Secret not found" error in workflow
- **Solution:** Verify secret name matches exactly (case-sensitive)
- Go to Settings → Secrets and verify it exists

### SSH Connection fails
- **Solution:** Verify SSH_KEY is complete (includes -----BEGIN and -----END lines)
- Test SSH manually: `ssh -i your-key.pem user@host`

### Database connection fails
- **Solution:** Verify DATABASE_URL format
- Test locally: `psql "your-connection-string"`

### Workflow still won't deploy
- **Possible causes:**
  1. Not all required secrets are set
  2. Server is not properly configured (run setup-ci-cd-server.sh)
  3. SSH key doesn't match server's authorized_keys
  4. Firewall blocking deployment

---

## 📖 Documentation

- **After secrets:** Read `CI_CD_SETUP.md`
- **Server setup:** Run `setup-ci-cd-server.sh`
- **Understanding workflows:** See `.github/workflows/`

---

## ⏱️ Time to Complete

- **Adding secrets:** 15-20 minutes
- **Setting up server:** 10-15 minutes
- **Testing first deploy:** 30 minutes

**Total:** About 1 hour for full setup

---

**If you have any issues, check the documentation files in the project root or review GitHub's Actions logs for specific error messages.**

Ready? Start adding secrets now! 🎯
