# GitHub Actions CI/CD Configuration Guide

This guide explains how to set up and configure the CI/CD pipeline for the Crystal Admin project.

## 📋 Prerequisites

- GitHub repository with Actions enabled
- Server(s) for deployment (production and development)
- SSH access to deployment servers
- Docker installed on servers
- Database credentials and API keys

## 🔐 GitHub Secrets Configuration

Add these secrets in your GitHub repository settings (Settings → Secrets and variables → Actions):

### Production Environment
```
PROD_API_URL              # Production API URL (e.g., https://api.example.com)
PROD_DEPLOY_HOST          # Production server hostname or IP
PROD_DEPLOY_USER          # SSH user for production server
PROD_DEPLOY_SSH_KEY       # Private SSH key for deployment
DATABASE_URL              # PostgreSQL/MySQL connection string
REDIS_URL                 # Redis connection URL
SUPABASE_URL              # Supabase project URL
SUPABASE_KEY              # Supabase anon key
JWT_SECRET                # JWT signing secret
```

### Development Environment
```
DEV_API_URL               # Development API URL (e.g., https://dev-api.example.com)
DEV_DEPLOY_HOST           # Dev server hostname or IP
DEV_DEPLOY_USER           # SSH user for dev server
DEV_DEPLOY_SSH_KEY        # Private SSH key for dev (can be same as prod)
```

### Docker & Registry
```
DOCKER_USERNAME           # Docker Hub username (optional)
DOCKER_PASSWORD           # Docker Hub password (optional)
GITHUB_TOKEN              # Automatically available (for GHCR)
```

### Backend Configuration
```
BACKEND_PORT              # Backend port (default: 3001)
```

## 📁 Workflow Files

### 1. `.github/workflows/ci.yml` - Continuous Integration
**Triggers:** Push to main/develop, Pull requests

**Tasks:**
- ✅ Run linting (ESLint) on frontend and backend
- ✅ Build frontend and backend
- ✅ Run security audits (npm audit)
- ✅ Upload build artifacts

**Duration:** ~5-10 minutes

### 2. `.github/workflows/deploy.yml` - Automatic Deployment
**Triggers:** Push to main (production) or develop (development)

**Tasks:**
- ✅ Build Docker images
- ✅ Push to GitHub Container Registry (GHCR)
- ✅ SSH into deployment server
- ✅ Pull latest code and Docker images
- ✅ Stop old containers
- ✅ Start new containers
- ✅ Run database migrations
- ✅ Health checks
- ✅ Rollback on failure

**Duration:** ~15-30 minutes

### 3. `.github/workflows/docker.yml` - Docker Build & Push
**Triggers:** Changes to Dockerfile or code, manual trigger

**Tasks:**
- ✅ Build Docker images
- ✅ Push to GHCR and Docker Hub
- ✅ Multi-platform support (amd64, arm64)
- ✅ Layer caching

**Duration:** ~10-20 minutes

### 4. `.github/workflows/health-check.yml` - Health Monitoring
**Triggers:** Every 15 minutes (health check), every 6 hours (full check)

**Tasks:**
- ✅ Check API health/availability
- ✅ Check DNS resolution
- ✅ Monitor Docker containers
- ✅ Performance metrics
- ✅ Security header verification
- ✅ Alert creation on failure

## 🚀 Quick Start

### Step 1: Set Up SSH Key for Deployment

Generate an SSH key (if you don't have one):
```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/github_deploy -N ""
```

Add the public key to your servers:
```bash
ssh-copy-id -i ~/.ssh/github_deploy.pub user@your-server.com
```

Add the private key as a GitHub secret:
```bash
cat ~/.ssh/github_deploy | base64 -w 0  # Copy the output
```

Paste the output in GitHub → Settings → Secrets → `PROD_DEPLOY_SSH_KEY`

### Step 2: Create GitHub Secrets

Go to your GitHub repository:
1. Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add all required secrets from the list above

### Step 3: Configure Environment on Server

On your deployment server, create `/app/crystal-admin` directory:

```bash
mkdir -p /app/crystal-admin
cd /app/crystal-admin
git clone <your-repo-url> .
```

Create production environment file:
```bash
cat > /app/crystal-admin/.env.production << EOF
NODE_ENV=production
PORT=3001
DATABASE_URL=$DATABASE_URL
Redis_URL=$REDIS_URL
SUPABASE_URL=$SUPABASE_URL
SUPABASE_KEY=$SUPABASE_KEY
JWT_SECRET=$JWT_SECRET
EOF
```

### Step 4: Set Up Docker on Server

```bash
# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Optional: Log in to GHCR
docker login ghcr.io -u username -p $GITHUB_TOKEN

# Optional: Log in to Docker Hub
docker login -u username -p password
```

### Step 5: Trigger Initial Deployment

Push to main branch:
```bash
git push origin main
```

Monitor the deployment in Actions tab:
- GitHub Actions → Select the "Deploy - Automatic Deployment" workflow
- Watch the progress in real-time

## 📊 Monitoring & Logs

### View Workflow Runs
Go to your repository → Actions tab

Click on any workflow run to see:
- ✅ Step-by-step execution logs
- ✅ Build artifacts
- ✅ Error messages
- ✅ Performance metrics

### Re-run Failed Workflows
Click "Re-run failed jobs" to retry without pushing new code

### Manual Deployment
Go to Actions → "Deploy - Automatic Deployment" → "Run workflow" → Select environment

## 🔄 Deployment Diagram

```
Push to main/develop
        ↓
GitHub Actions CI/CD
        ↓
├─ Run Linting & Tests
├─ Build Frontend & Backend
├─ Security Scans
        ↓
├─ Build Docker Images
├─ Push to Registry
        ↓
├─ SSH to Server
├─ Pull Latest Code
├─ Pull Docker Images
├─ Stop Old Containers
├─ Start New Containers
├─ Run Migrations
├─ Health Checks
        ↓
✅ Deployment Complete OR ❌ Rollback
```

## 🛑 Rollback Procedure

If deployment fails:
1. The workflow automatically creates a rollback job
2. Reverts to previous commit
3. Restarts containers with previous image
4. Creates GitHub issue for investigation

Manual rollback:
```bash
ssh user@server.com
cd /app/crystal-admin
git reset --hard HEAD~1
docker-compose down
docker-compose up -d
```

## ⚙️ Customization

### Change Deployment Frequency
Edit `.github/workflows/deploy.yml`:
```yaml
on:
  push:
    branches: [ main, develop ]
```

Change to specific branches only or add schedule:
```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # Deploy at 2 AM UTC daily
```

### Change Health Check Frequency
Edit `.github/workflows/health-check.yml`:
```yaml
on:
  schedule:
    - cron: '*/15 * * * *'  # Change interval
```

### Skip Deployment for Certain Commits
Add `[skip ci]` or `[skip deploy]` in commit message:
```bash
git commit -m "Update docs [skip ci]"
```

## 🆘 Troubleshooting

### SSH Connection Fails
- ✅ Check server IP/hostname is correct
- ✅ Verify SSH key is added to server's `~/.ssh/authorized_keys`
- ✅ Check firewall allows SSH (port 22)
- ✅ Verify user has permissions

### Docker Pull Fails
- ✅ Log into GHCR: `docker login ghcr.io`
- ✅ Verify image exists in registry
- ✅ Check authentication token is valid

### Health Check Fails
- ✅ Check API is running: `curl http://localhost:3001/api/health`
- ✅ Check port is open
- ✅ Review application logs: `docker-compose logs`

### Build Fails
- ✅ Check Node.js version (18.x or 20.x)
- ✅ Check npm dependencies: `npm ci`
- ✅ Review console output for errors

## 📈 Performance Tips

1. **Enable Docker Layer Caching**
   - Already configured in docker.yml
   - Significantly speeds up subsequent builds

2. **Use npm ci instead of npm install**
   - Faster and more reliable
   - Already configured

3. **Minimize Docker image size**
   - Use multi-stage builds
   - Remove dev dependencies in production

4. **Parallel Jobs**
   - Currently runs linting and security in parallel
   - Reduces total CI time

## 🔒 Security Best Practices

✅ **Implemented:**
- SSH key-based authentication (no passwords)
- GitHub secrets for sensitive data
- npm audit for dependency vulnerabilities
- OWASP dependency checking
- Secret masking in logs
- Automatic rollback on failure

🔍 **Additional Recommendations:**
- Regularly rotate SSH keys
- Use branch protection rules
- Require code review before main branch deployment
- Enable GitHub security alerts
- Use signed commits
- Scan Docker images for vulnerabilities

## 📞 Support

For issues or questions:
1. Check GitHub Actions logs
2. Verify all secrets are set correctly
3. Test SSH connection manually
4. Review server logs: `docker-compose logs -f`
