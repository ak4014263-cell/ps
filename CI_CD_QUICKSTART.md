# CI/CD Pipeline Setup Guide

Welcome to the Crystal Admin CI/CD Pipeline! This guide will walk you through setting up automated deployment for your application.

## 📚 Table of Contents

1. [Overview](#overview)
2. [Quick Start (5 minutes)](#quick-start-5-minutes)
3. [Detailed Setup](#detailed-setup)
4. [Workflows Explained](#workflows-explained)
5. [Troubleshooting](#troubleshooting)

## 🎯 Overview

The CI/CD pipeline provides:

✅ **Continuous Integration**
- Automatic linting on every push
- Automated builds and tests
- Security vulnerability scanning
- Build artifacts preservation

✅ **Continuous Deployment**
- Automatic deployment to production (main branch)
- Automatic deployment to development (develop branch)
- Docker image building and pushing
- Health checks and rollback on failure

✅ **Monitoring**
- Scheduled health checks (every 15 minutes)
- Performance monitoring
- Security header verification
- Automatic alerts on failures

## 🚀 Quick Start (5 minutes)

### Step 1: Set Up SSH Key for Deployment

**On your local machine:**

```bash
# Generate SSH key (or use existing)
ssh-keygen -t rsa -b 4096 -f ~/.ssh/github_deploy -N ""

# Copy public key to clipboard
cat ~/.ssh/github_deploy.pub | pbcopy  # macOS
# or
cat ~/.ssh/github_deploy.pub | xclip   # Linux
# or view it manually on Windows
```

**On your deployment server:**

```bash
# Add public key to authorized_keys
mkdir -p ~/.ssh
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### Step 2: Configure GitHub Secrets

**Run the automated setup script:**

```bash
# On Linux/Mac
chmod +x setup-ci-cd-secrets.sh
./setup-ci-cd-secrets.sh

# On Windows
.\setup-ci-cd-secrets.ps1
```

Or manually add secrets in GitHub:
- Go to: Repository → Settings → Secrets and variables → Actions
- Click "New repository secret"
- Add each secret from the list below

### Step 3: Set Up Deployment Server

**On your deployment server:**

```bash
# On Linux/Mac
chmod +x setup-ci-cd-server.sh
sudo bash setup-ci-cd-server.sh

# On Windows
# TODO: Implement PowerShell version
```

### Step 4: Test Deployment

```bash
# Push a commit to trigger the workflow
git add .
git commit -m "test: trigger CI/CD pipeline"
git push origin main
```

Monitor the deployment:
- Go to: Repository → Actions
- Click on the latest workflow run
- Watch the deployment progress

## 📋 Detailed Setup

### GitHub Secrets Required

Add these secrets in GitHub (Settings → Secrets and variables → Actions):

#### Production Secrets
```
PROD_API_URL              # e.g., https://api.youromain.com
PROD_DEPLOY_HOST          # e.g., prod.server.com
PROD_DEPLOY_USER          # e.g., deployuser
PROD_DEPLOY_SSH_KEY       # Private SSH key contents
```

#### Development Secrets
```
DEV_API_URL               # e.g., https://dev-api.yourdomain.com
DEV_DEPLOY_HOST           # Development server IP/hostname
DEV_DEPLOY_USER           # SSH user for dev server
DEV_DEPLOY_SSH_KEY        # SSH key (can be same as prod)
```

#### Database & Services
```
DATABASE_URL              # PostgreSQL/MySQL connection string
REDIS_URL                 # Redis connection URL
SUPABASE_URL              # Supabase project URL (optional)
SUPABASE_KEY              # Supabase anon key (optional)
JWT_SECRET                # Secret key for JWT signing
```

#### Docker Registry (Optional)
```
DOCKER_USERNAME           # Docker Hub username
DOCKER_PASSWORD           # Docker Hub token/password
```

#### Other
```
BACKEND_PORT              # Backend port (default: 3001)
```

### Server Setup Checklist

- [ ] Docker installed
- [ ] Docker Compose installed
- [ ] Git installed
- [ ] Deployment user created
- [ ] SSH key configured
- [ ] Docker credentials configured (optional)
- [ ] Application directory created
- [ ] Environment files configured
- [ ] Firewall allows SSH and app ports
- [ ] Database credentials verified
- [ ] Redis available (local or remote)

## 🔄 Workflows Explained

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Triggered:** On every push to main/develop, on pull requests

**Steps:**
1. Installs Node.js (18.x and 20.x)
2. Lints frontend code
3. Builds frontend
4. Lints backend code
5. Runs security audits
6. Uploads artifacts

**Duration:** ~5-10 minutes

### 2. Deploy Workflow (`.github/workflows/deploy.yml`)

**Triggered:** On push to main (production) or develop (development)

**Steps:**
1. Builds Docker images
2. Pushes to GitHub Container Registry
3. Connects to deployment server via SSH
4. Pulls latest code and images
5. Stops old containers
6. Starts new containers
7. Runs database migrations
8. Performs health checks
9. Rolls back if anything fails

**Duration:** ~15-30 minutes

### 3. Docker Workflow (`.github/workflows/docker.yml`)

**Triggered:** On changes to Dockerfile or code

**Steps:**
1. Builds multi-platform images (amd64, arm64)
2. Pushes to GHCR (GitHub Container Registry)
3. Pushes to Docker Hub (if configured)
4. Implements layer caching for faster builds

**Duration:** ~10-20 minutes

### 4. Health Check Workflow (`.github/workflows/health-check.yml`)

**Triggered:** Every 15 minutes (health check), every 6 hours (detailed check)

**Checks:**
- API accessibility
- DNS resolution
- Docker container status
- Response time
- Security headers
- Creates issues on failure

**Duration:** ~2-5 minutes

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                   Your Local Machine                 │
│  ┌─────────────────────────────────────────────────┐ │
│  │  git push origin main                           │ │
│  └──────────────────────┬──────────────────────────┘ │
└─────────────────────────┼──────────────────────────────┘
                          │
                          ↓
          ┌───────────────────────────────┐
          │   GitHub Repository           │
          │   - Code pushed               │
          │   - Workflows triggered       │
          └───────────┬───────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ↓             ↓             ↓
    ┌───────┐   ┌────────┐   ┌──────────┐
    │  CI   │   │ Docker │   │  Deploy  │
    │ Tests │   │ Build  │   │to Server │
    └──┬────┘   └────┬───┘   └────┬─────┘
       │             │            │
       └─────────────┼────────────┘
                     │
                     ↓
       ┌─────────────────────────────┐
       │  GitHub Container Registry  │
       │  - Images pushed            │
       │  - Tags: latest, sha, ref   │
       └─────────┬───────────────────┘
                 │
                 ↓
    ┌────────────────────────────────┐
    │  Production Server             │
    │  - Pull latest images          │
    │  - Stop old containers         │
    │  - Start new containers        │
    │  - Run migrations              │
    │  - Health checks               │
    │  - Rollback if needed          │
    └────────────────────────────────┘
```

## 🔐 Security Best Practices

✅ **Implemented:**
- No credentials in code
- SSH key-based authentication
- GitHub secrets encryption
- Automatic rollback on failure
- Security audit on every build
- OWASP dependency checking

🔍 **Recommended:**
- Require approval for main branch deployments
- Use branch protection rules
- Enable GitHub security alerts
- Rotate SSH keys regularly
- Use signed commits
- Scan Docker images for vulnerabilities

## 🧪 Testing the Pipeline

### Test CI Pipeline
```bash
# Make a small code change
echo "// test" >> src/App.tsx

# Commit and push
git add src/App.tsx
git commit -m "test: trigger CI workflow"
git push origin develop

# Monitor in Actions tab
```

### Test Deploy Pipeline
```bash
# Merge to main
git checkout main
git merge develop
git push origin main

# Monitor deployment in Actions tab
# Check server logs: docker-compose logs -f
```

### Manual Workflow Trigger
Go to: Repository → Actions → Select workflow → "Run workflow"

## 🛑 Rollback Procedure

### Automatic Rollback
If deployment fails, the workflow automatically:
1. Reverts to previous commit
2. Pulls previous Docker image
3. Restarts containers
4. Creates issue for investigation

### Manual Rollback
```bash
# SSH to server
ssh user@server.com

# Go to app directory
cd /app/crystal-admin

# View git history
git log --oneline -5

# Rollback to previous commit
git reset --hard <COMMIT_HASH>

# Restart containers
docker-compose down
docker-compose up -d

# Verify
docker-compose logs -f
```

## 📈 Monitoring & Analytics

### View Workflow Runs
1. Go to: Repository → Actions
2. Click on workflow name
3. Click on specific run
4. View detailed logs

### Key Metrics
- Build time (CI: ~5-10 min, Deploy: ~15-30 min)
- Deployment frequency
- Lead time for changes
- Mean time to recovery (MTTR)

### Performance Tips
- Docker layer caching reduces build time
- Parallel job execution saves time
- npm ci faster than npm install
- Multi-stage builds reduce image size

## 🆘 Troubleshooting

### SSH Connection Fails
```bash
# Test SSH connection manually
ssh -i ~/.ssh/github_deploy user@server.com
ssh -v user@server.com  # verbose output
```

**Solutions:**
- ✅ Verify server IP/hostname
- ✅ Check SSH key is added to server
- ✅ Verify firewall allows port 22
- ✅ Check user has permissions

### Docker Pull Fails
```bash
# Verify image exists
docker images | grep crystal-admin

# Check registry access
docker login ghcr.io
docker pull ghcr.io/your-org/crystal-admin:latest
```

**Solutions:**
- ✅ Verify image was built
- ✅ Check GITHUB_TOKEN has permissions
- ✅ Verify image name matches in docker-compose

### Health Check Fails
```bash
# SSH to server and check API
curl -v http://localhost:3001/api/health
curl -v http://localhost:3000/

# Check Docker logs
docker-compose logs backend
docker-compose logs frontend
```

**Solutions:**
- ✅ Verify containers started
- ✅ Check port forwarding
- ✅ Review application logs
- ✅ Verify database connection

### Build Fails
```bash
# Check Node.js version
node --version  # Should be 18.x or 20.x

# Test build locally
npm ci
npm run build
npm run lint
```

**Solutions:**
- ✅ Check Node.js version compatibility
- ✅ Clear npm cache: `npm cache clean --force`
- ✅ Delete node_modules and lock file
- ✅ Check for syntax errors

## 📞 Support & Resources

- **Documentation:** `CI_CD_SETUP.md` (detailed reference)
- **GitHub Actions Docs:** https://docs.github.com/en/actions
- **Docker Docs:** https://docs.docker.com/
- **GitHub CLI:** https://cli.github.com/

## 📝 Common Commands

```bash
# View GitHub Actions configuration
gh workflow list --repo owner/repo

# Trigger workflow manually
gh workflow run deploy.yml --repo owner/repo

# View recent runs
gh run list --repo owner/repo -L 10

# Check workflow status
gh run view <RUN_ID> --repo owner/repo

# View workflow logs
gh run view <RUN_ID> --log --repo owner/repo

# Cancel running workflow
gh run cancel <RUN_ID> --repo owner/repo
```

## ✅ Checklist Before First Deployment

- [ ] SSH key generated and added to server
- [ ] All GitHub secrets configured
- [ ] Server setup script executed
- [ ] Environment files configured
- [ ] Git repository is clean
- [ ] Main branch protection rules enabled
- [ ] Docker images built successfully
- [ ] Health check endpoints configured
- [ ] Database migrated
- [ ] Redis connectivity verified
- [ ] Firewall rules configured
- [ ] Backup of current production taken

## 🎓 Next Steps

1. **Run initial setup:**
   ```bash
   ./setup-ci-cd-secrets.sh
   ssh user@server.com "bash setup-ci-cd-server.sh"
   ```

2. **Push to activate workflows:**
   ```bash
   git push origin main
   ```

3. **Monitor first deployment:**
   - Actions → Deploy workflow → View logs

4. **Verify deployment:**
   - Check application is running
   - Verify health check passes
   - Review logs for errors

5. **Document:**
   - Record deployment credentials
   - Document post-deployment checks
   - Create runbooks for common issues

---

**Happy deploying! 🚀**

For detailed information, see `CI_CD_SETUP.md`
