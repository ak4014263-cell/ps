# ✅ CI/CD Setup Checklist

Use this checklist to track your CI/CD pipeline setup progress.

## 📋 Pre-Setup (5 minutes)

- [ ] Read `CI_CD_QUICKSTART.md`
- [ ] Ensure you have admin access to GitHub repository
- [ ] Ensure you have admin/sudo access to deployment server(s)
- [ ] GitHub CLI (`gh`) installed on your machine
- [ ] SSH key pair ready (or will generate during setup)

## 🔐 SSH Key Configuration (10 minutes)

### Generate SSH Key
- [ ] Run: `ssh-keygen -t rsa -b 4096 -f ~/.ssh/github_deploy -N ""`
- [ ] Verify key was created: `ls -la ~/.ssh/github_deploy*`
- [ ] Copy private key: `cat ~/.ssh/github_deploy`

### Add to Deployment Server
- [ ] SSH to production server
- [ ] Create ~/.ssh directory: `mkdir -p ~/.ssh`
- [ ] Add public key to authorized_keys: `echo "public_key_content" >> ~/.ssh/authorized_keys`
- [ ] Fix permissions: `chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys`
- [ ] Test SSH access: `ssh user@server.com` (should work without password)
- [ ] Repeat for development server if different

## 🔑 GitHub Secrets Configuration (10 minutes)

### Option A: Automated Setup
- [ ] Run setup script: `chmod +x setup-ci-cd-secrets.sh && ./setup-ci-cd-secrets.sh`
- [ ] Follow prompts to enter all secrets
- [ ] Verify secrets in GitHub: Settings → Secrets and variables → Actions

### Option B: Manual Setup
Go to GitHub → Your Repo → Settings → Secrets and variables → Actions

#### Production Secrets
- [ ] **PROD_API_URL** - e.g., `https://api.yourdomain.com`
- [ ] **PROD_DEPLOY_HOST** - e.g., `prod.server.com` or IP address
- [ ] **PROD_DEPLOY_USER** - SSH user, e.g., `deployuser`
- [ ] **PROD_DEPLOY_SSH_KEY** - Private key contents (entire key)

#### Development Secrets
- [ ] **DEV_API_URL** - e.g., `https://dev-api.yourdomain.com`
- [ ] **DEV_DEPLOY_HOST** - Dev server hostname or IP
- [ ] **DEV_DEPLOY_USER** - SSH user for dev

#### Database & Services
- [ ] **DATABASE_URL** - PostgreSQL/MySQL connection string
- [ ] **REDIS_URL** - Redis connection URL
- [ ] **JWT_SECRET** - Long random string (min 32 chars)
- [ ] **SUPABASE_URL** - (if using Supabase)
- [ ] **SUPABASE_KEY** - (if using Supabase)

#### Optional: Docker Registry
- [ ] **DOCKER_USERNAME** - Docker Hub username (optional)
- [ ] **DOCKER_PASSWORD** - Docker Hub token (optional)

#### Backend Configuration
- [ ] **BACKEND_PORT** - Usually 3001 (optional if default)

**Total Secrets:** Minimum 10, Maximum 20

## 🖥️ Server Setup (20 minutes)

### Prerequisites on Server
- [ ] SSH access verified
- [ ] Sudo/root access available
- [ ] Internet connectivity confirmed
- [ ] Disk space available (at least 10GB)

### Run Server Setup Script
```bash
chmod +x setup-ci-cd-server.sh
sudo bash setup-ci-cd-server.sh
```

During setup, provide:
- [ ] GitHub repository URL
- [ ] GitHub branch (usually "main")
- [ ] SSH public key for GitHub Actions
- [ ] Docker registry credentials (optional)

### Server Verification
- [ ] Docker installed: `docker --version`
- [ ] Docker Compose installed: `docker-compose --version`
- [ ] Deployment user created: `id deployuser`
- [ ] User can run Docker: `su deployuser -c "docker ps"`
- [ ] Application directory created: `ls /app/crystal-admin/`
- [ ] SSH key configured: `grep github ~/.ssh/authorized_keys`

### Environment Configuration
- [ ] Copy `.env.example.production` to `/app/crystal-admin/.env.production`
- [ ] Edit environment file with actual values:
  - [ ] DATABASE_URL
  - [ ] REDIS_URL
  - [ ] JWT_SECRET
  - [ ] API_URL
  - [ ] All other secrets

## 📁 Local Repository Setup (5 minutes)

### Pre-commit Hook for Security
- [ ] Install pre-commit hook: `chmod +x scripts/pre-commit.js && cp scripts/pre-commit.js .git/hooks/pre-commit`
- [ ] Test it: `echo "SECRET=test123" >> .env.test && git add .env.test && git commit -m "test"` (should fail)
- [ ] Clean up: `git reset HEAD .env.test && rm .env.test`

### Git Configuration
- [ ] `.env*` files are in `.gitignore` ✓
- [ ] No secrets in code review
- [ ] No private keys in repository

## 🚀 First Deployment Test (15 minutes)

### Trigger Workflow
- [ ] Navigate to your repository
- [ ] Go to Actions tab
- [ ] Verify all workflows are listed:
  - [ ] CI - Test & Build
  - [ ] Deploy - Automatic Deployment
  - [ ] Docker - Build & Push
  - [ ] Monitor - Health Checks

### Initial Manual Deployment
- [ ] Go to Actions → "Deploy - Automatic Deployment"
- [ ] Click "Run workflow"
- [ ] Select branch: `develop`
- [ ] Click "Run workflow"
- [ ] Monitor the workflow execution (~15-30 minutes)

### Workflow Monitoring
- [ ] Watch each job complete:
  - [ ] Checkout code
  - [ ] Setup Node.js
  - [ ] Install dependencies
  - [ ] Build frontend
  - [ ] Build backend
  - [ ] Build Docker images
  - [ ] SSH to server
  - [ ] Pull images
  - [ ] Start containers
  - [ ] Run health checks

### Verification
- [ ] Workflow completes successfully (green checkmark)
- [ ] No errors in logs
- [ ] Application is accessible at your API URL
- [ ] Health check endpoints responding
- [ ] Containers running: `docker-compose ps`
- [ ] API responding: `curl http://localhost:3001/api/health`

## 🔄 Automatic Deployment Test (10 minutes)

### Test Push-to-Deploy
- [ ] Create a test file: `echo "test" > TEST_DEPLOYMENT.md`
- [ ] Commit: `git add TEST_DEPLOYMENT.md && git commit -m "test: trigger auto deploy"`
- [ ] Push to develop: `git push origin develop`
- [ ] Watch Actions tab for automatic workflow trigger
- [ ] Verify deployment completes
- [ ] Verify changes live in 15-30 minutes

### Cleanup
- [ ] Remove test file: `git rm TEST_DEPLOYMENT.md && git commit -m "cleanup: remove test file"`
- [ ] Push: `git push origin develop`

## 📊 Monitoring Setup (10 minutes)

### Health Check Configuration
- [ ] Verify health check workflow is enabled
- [ ] Check workflow runs every 15 minutes
- [ ] Review health check logs
- [ ] Verify alerts for failures work

### Application Monitoring
- [ ] Set up log rotation: `docker-compose logs --tail 100`
- [ ] Monitor disk usage: `df -h /app/`
- [ ] Monitor memory: `free -h`
- [ ] Set up alerts (optional)

### Workflow Monitoring
- [ ] Subscribe to email notifications in GitHub
- [ ] Pin important workflows
- [ ] Create custom alerts (optional)

## 📝 Documentation & Runbooks (15 minutes)

### Read Documentation
- [ ] Read `CI_CD_SETUP.md` - detailed reference
- [ ] Read `CI_CD_QUICKSTART.md` - quick guide
- [ ] Bookmark both for reference

### Create Runbooks
- [ ] Document: How to manually rollback
- [ ] Document: How to scale up/down
- [ ] Document: Emergency procedures
- [ ] Document: Contact information

### Team Communication
- [ ] Share documentation with team
- [ ] Conduct training session
- [ ] Create checklists for common tasks
- [ ] Establish on-call rotation (if applicable)

## 🔒 Security Hardening (15 minutes)

### GitHub Repository
- [ ] Enable branch protection on `main`:
  - [ ] Require status checks to pass
  - [ ] Require code review before merge
  - [ ] Require signed commits (optional)
  - [ ] Dismiss stale PR approvals
- [ ] Enable secret scanning
- [ ] Enable dependency scanning
- [ ] Configure CODEOWNER file

### Deployment Server
- [ ] Disable root SSH login
- [ ] Change default SSH port (optional)
- [ ] Configure firewall:
  - [ ] Allow SSH from trusted IPs only
  - [ ] Allow application ports only from load balancer
  - [ ] Deny all other traffic
- [ ] Set up automatic security updates
- [ ] Enable audit logging

### Credentials Management
- [ ] Rotate SSH keys quarterly
- [ ] Store GitHub secrets securely
- [ ] Use separate secrets for prod/dev
- [ ] Enable GitHub's secret scanning notifications

## ☑️ Maintenance & Operations (Ongoing)

### Weekly
- [ ] Review Actions logs for errors
- [ ] Check health check results
- [ ] Monitor deployment frequency
- [ ] Review code quality metrics

### Monthly
- [ ] Update dependencies: `npm outdated`
- [ ] Review Docker images for security
- [ ] Check disk usage on servers
- [ ] Review and update runbooks
- [ ] Conduct team sync on CI/CD

### Quarterly
- [ ] Rotate SSH keys
- [ ] Security audit
- [ ] Update Docker base images
- [ ] Review cost and performance
- [ ] Plan for improvements

## 🆘 Backup & Recovery (Once)

### Backup Procedures
- [ ] Document current server state
- [ ] Create server snapshot/backup
- [ ] Backup database configuration
- [ ] Document all secrets locations
- [ ] Create disaster recovery procedure

### Recovery Testing
- [ ] Test restore from backup (monthly)
- [ ] Document recovery time objective (RTO)
- [ ] Document recovery point objective (RPO)
- [ ] Create recovery runbook

## 📞 Troubleshooting

### If SSH Connection Fails
- [ ] Run: `ssh -v user@server.com` (check verbose output)
- [ ] Verify: `grep github ~/.ssh/authorized_keys`
- [ ] Check firewall: `telnet server.com 22`
- [ ] Verify user permissions: `id user`

### If Deploy Workflow Fails
- [ ] Check GitHub Actions logs for detailed error
- [ ] SSH to server and check: `docker-compose logs`
- [ ] Verify secrets are set correctly
- [ ] Check server has internet access
- [ ] Verify database connectivity

### If Health Check Fails
- [ ] SSH to server: `curl http://localhost:3001/api/health`
- [ ] Check containers running: `docker-compose ps`
- [ ] Check logs: `docker-compose logs -f backend`
- [ ] Verify database is accessible
- [ ] Verify Redis is running

## ✅ Final Verification

- [ ] CI workflow passes on every commit
- [ ] Deploy workflow completes successfully
- [ ] Docker images pushed to registry
- [ ] Health checks passing every 15 minutes
- [ ] Application is accessible and functional
- [ ] Logs are being generated and accessible
- [ ] Team is trained on CI/CD pipeline
- [ ] Documentation is complete and shared

## 🎉 You're Done!

Congratulations! Your CI/CD pipeline is ready for production.

**Next Steps:**
1. Push code regularly to main/develop
2. Monitor Actions tab for workflow status
3. Review logs and metrics weekly
4. Keep documentation updated
5. Participate in team training sessions

## 📚 Quick Reference

| Task | Command | Time |
|------|---------|------|
| View workflows | `gh workflow list` | 1 min |
| View runs | `gh run list -L 10` | 1 min |
| View logs | `gh run view <ID> --log` | 2 min |
| Manual deploy | GitHub UI → Run workflow | 5 min |
| Check server | `ssh user@server.com` | 2 min |
| View containers | `docker-compose ps` | 1 min |
| View logs | `docker-compose logs -f` | 2 min |
| Rollback | `git reset --hard <SHA>` | 5 min |

---

**Setup Date:** _________________ **Completed By:** _________________

Once all items are checked, you're ready for production deployments! 🚀
