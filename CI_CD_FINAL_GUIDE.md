# 🚀 Crystal Admin CI/CD Pipeline - Final Guide

This guide summarizes the fully implemented CI/CD pipeline for the Crystal Admin project.

## ✅ Implementation Status

The following components have been configured and verified:

1.  **Continuous Integration (CI)**
    *   **Workflow:** `.github/workflows/ci.yml`
    *   **Triggers:** Push to `main`, `develop`
    *   **Actions:** Lints code, builds frontend & backend, runs vulnerability scans (npm audit).
    *   **Artifacts:** Build outputs are uploaded for review.

2.  **Container Building**
    *   **Workflow:** `.github/workflows/docker.yml`
    *   **Triggers:** Code changes
    *   **Actions:** Builds Docker images for the application and backend worker.
    *   **Registry:** Pushes images to GitHub Container Registry (`ghcr.io`).
    *   **Optimization:** Uses build caching for faster performance.

3.  **Continuous Deployment (CD)**
    *   **Workflow:** `.github/workflows/deploy.yml`
    *   **Triggers:** Push to `main` (Production), `develop` (Development)
    *   **Actions:**
        *   SSH login to server.
        *   Updates code and `.env` configuration.
        *   Pulls latest Docker images.
        *   Zero-downtime deployment via Docker Compose.
        *   Runs database migrations.
        *   Verifies health endpoints.
    *   **Robustness:** Fixed environmental variable handling for dynamic image tagging.

4.  **Monitoring**
    *   **Workflow:** `.github/workflows/health-check.yml`
    *   **Schedule:** Every 15 minutes.
    *   **Actions:** Checks API status, Docker container status, and response times. Alerts via GitHub Issues on failure.

5.  **Infrastructure Code**
    *   **Dockerfile:** Optimized multi-stage build for Node.js app.
    *   **docker-compose.yml:** Orchestrates App, Redis, and AI Microservices with dynamic image tags.
    *   **Scripts:** `setup-ci-cd-secrets.sh` (Secrets management) and `setup-ci-cd-server.sh` (Server provisioning).

---

## 🏃‍♂️ Quick Start Actions

### 1. Configure Secrets (Local Machine)
Run this script to set up your GitHub repository secrets securely:
```bash
# On Windows (PowerShell)
.\setup-ci-cd-secrets.ps1

# On Linux/Mac
./setup-ci-cd-secrets.sh
```

### 2. Provision Server (Remote Server)
SSH into your deployment VPS and run:
```bash
# Download setup script (or copy from repo)
curl -O https://raw.githubusercontent.com/<YOUR-USERNAME>/<YOUR-REPO>/main/setup-ci-cd-server.sh

# Run setup (requires sudo)
sudo bash setup-ci-cd-server.sh
```

### 3. Deploy
Simply push your code to the `main` branch:
```bash
git push origin main
```
Watch the "Actions" tab in your GitHub repository to see the pipeline in action.

---

## 🛠️ Maintenance & Troubleshooting

*   **Logs:** View deployment logs in the GitHub Actions tab.
*   **Server Logs:** SSH into server and run `docker-compose logs -f`.
*   **Rollback:** The `deploy.yml` workflow includes an automatic rollback step on failure. Manual rollback can be done by reverting the git commit.
*   **Environment:** Production secrets are managed via GitHub Secrets. To update them, use the setup script again or the GitHub UI.

## 📝 Key File Locations
*   Workflows: `.github/workflows/`
*   Docker Config: `Dockerfile`, `docker-compose.yml`
*   Backend Worker: `backend/Dockerfile.worker`
