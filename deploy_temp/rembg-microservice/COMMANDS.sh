#!/bin/bash
# Rembg Microservice - Command Reference

# ============================================================================
# DEVELOPMENT - START SERVICE
# ============================================================================

# Option 1: Docker (Recommended)
docker-compose up -d                                    # Start in background
docker-compose down                                     # Stop service
docker-compose logs -f                                  # View logs
docker-compose up --build                               # Rebuild and start

# Option 2: Python Direct
cd rembg-microservice
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --port 5000
uvicorn app:app --port 5000 --reload                    # Auto-reload on changes

# Option 3: Windows PowerShell
cd rembg-microservice
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app:app --port 5000

# ============================================================================
# TESTING - API ENDPOINTS
# ============================================================================

# Health Check
curl http://localhost:5000/health
curl http://localhost:5000/health | jq .

# List Available Models
curl http://localhost:5000/models
curl http://localhost:5000/models | jq .

# Single Image (Local File)
curl -X POST -F "image=@test.jpg" http://localhost:5000/remove-bg --output result.png
curl -X POST -F "image=@test.jpg" -F "model=siluette" http://localhost:5000/remove-bg --output result.png

# Single Image (URL)
curl -X POST -F "image=@-" http://localhost:5000/remove-bg < test.jpg > result.png

# Batch Processing
curl -X POST \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg" \
  -F "images=@image3.jpg" \
  http://localhost:5000/remove-bg-batch > results.json

# Interactive API Documentation
# Open in browser: http://localhost:5000/docs

# ============================================================================
# DOCKER - BUILD AND DEPLOY
# ============================================================================

# Build Image
docker build -t rembg-service ./rembg-microservice
docker build -t rembg-service:latest ./rembg-microservice

# Run Container (Local)
docker run -d --name rembg -p 5000:5000 rembg-service
docker run -d --name rembg -p 5000:5000 -e WORKERS=4 rembg-service

# Run with GPU Support (NVIDIA)
docker run -d --name rembg -p 5000:5000 --gpus all rembg-service

# View Container Logs
docker logs rembg
docker logs -f rembg                                    # Follow logs
docker logs --tail 100 rembg                            # Last 100 lines

# Container Management
docker ps                                               # List running containers
docker inspect rembg                                    # Container details
docker stop rembg                                       # Stop container
docker start rembg                                      # Start container
docker restart rembg                                    # Restart container
docker rm rembg                                         # Remove container

# Push to Registry
docker tag rembg-service myregistry/rembg:latest
docker push myregistry/rembg:latest

# ============================================================================
# DEPLOYMENT - CLOUD PLATFORMS
# ============================================================================

# AWS EC2
# See rembg-microservice/DEPLOYMENT.md

# Google Cloud Run
gcloud run deploy rembg-service \
  --source . \
  --region us-central1 \
  --platform managed \
  --memory 2Gi \
  --cpu 2

# Heroku
heroku create rembg-service
git push heroku main
heroku logs --tail

# ============================================================================
# DOCKER COMPOSE - PRODUCTION
# ============================================================================

# Start Service
docker-compose up -d

# Scale Services
docker-compose up -d --scale rembg=3                    # 3 instances behind load balancer

# View Logs
docker-compose logs
docker-compose logs -f rembg

# Environment Variables
export HOST=0.0.0.0
export PORT=5000
export WORKERS=4
docker-compose up -d

# Update and Restart
docker-compose down
docker-compose pull
docker-compose up -d

# ============================================================================
# MONITORING - HEALTH CHECKS
# ============================================================================

# Continuous Health Monitoring
watch -n 5 "curl http://localhost:5000/health | jq ."  # Every 5 seconds

# Check Logs for Errors
grep -i "error" <(docker logs rembg)

# Monitor Resource Usage (Docker)
docker stats rembg

# Check Port Availability
netstat -an | grep 5000  # Linux/Mac
netstat -ano | grep 5000 # Windows

# ============================================================================
# PERFORMANCE - BENCHMARKING
# ============================================================================

# Single Image Processing Time
time curl -X POST -F "image=@test.jpg" \
  http://localhost:5000/remove-bg --output result.png

# Batch Processing Time
time curl -X POST \
  -F "images=@*.jpg" \
  http://localhost:5000/remove-bg-batch > /dev/null

# Load Testing (Apache Bench)
ab -n 100 -c 10 -p image.jpg \
  -T "multipart/form-data; boundary=----" \
  http://localhost:5000/remove-bg

# Load Testing (Hey tool)
hey -n 100 -c 10 http://localhost:5000/health

# ============================================================================
# CONFIGURATION - ENVIRONMENT VARIABLES
# ============================================================================

# Start with Custom Configuration
HOST=0.0.0.0 PORT=8000 WORKERS=8 uvicorn app:app

# Docker Compose Environment
export REMBG_URL=http://localhost:5000
export REMBG_MODEL=u2net
export WORKERS=4

# ============================================================================
# MAINTENANCE - CLEANUP AND OPTIMIZATION
# ============================================================================

# Remove Old Images
docker image prune -a

# Remove Unused Containers
docker container prune

# Remove All Rembg-related Docker Resources
docker system prune -f --volumes

# Clear Docker Logs
truncate -s 0 $(docker inspect --format='{{.LogPath}}' rembg)

# ============================================================================
# TROUBLESHOOTING - DIAGNOSTICS
# ============================================================================

# Verify Python Installation
python --version
python3 --version

# Check Module Installation
python -c "from rembg import remove; print('OK')"
python -c "import fastapi; print(fastapi.__version__)"

# Test Network Connectivity
curl -v http://localhost:5000/health

# Check Port Status
lsof -i :5000                                          # Linux/Mac
netstat -ano | grep 5000                              # Windows

# View Environment Variables
docker exec rembg env | grep -i rembg

# View Service Configuration
curl http://localhost:5000/

# ============================================================================
# DEVELOPMENT - CODE UPDATES
# ============================================================================

# Rebuild Service (after code changes)
docker-compose up --build -d
# or
docker build -t rembg-service ./rembg-microservice && docker run ...

# Test Code Without Docker
cd rembg-microservice
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload                                # Auto-reload on file changes

# Run Tests (if added)
pytest tests/
pytest tests/ -v --cov

# Format Code
black app.py
autopep8 --in-place app.py

# ============================================================================
# INTEGRATION - REACT APP CONFIGURATION
# ============================================================================

# Set Environment Variable (.env or .env.local)
REACT_APP_REMBG_URL=http://localhost:5000

# For Production
REACT_APP_REMBG_URL=https://api.yourdomain.com/rembg

# Test Configuration
curl http://localhost:5000/health  # Should return {"status":"healthy",...}

# ============================================================================
# GPU ACCELERATION - CUDA SETUP
# ============================================================================

# Install GPU Dependencies
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
pip install onnxruntime-gpu

# Enable CUDA Provider
export ONNXRUNTIME_PROVIDERS=CUDAExecutionProvider

# Verify GPU Access
python -c "import torch; print(torch.cuda.is_available())"

# Run with GPU
ONNXRUNTIME_PROVIDERS=CUDAExecutionProvider uvicorn app:app --port 5000

# ============================================================================
# SYSTEMD SERVICE - LINUX PRODUCTION
# ============================================================================

# Create Service File
sudo nano /etc/systemd/system/rembg.service
# Copy content from rembg-microservice/DEPLOYMENT.md

# Start Service
sudo systemctl daemon-reload
sudo systemctl enable rembg
sudo systemctl start rembg
sudo systemctl status rembg

# View Logs
sudo journalctl -u rembg -f
sudo journalctl -u rembg --since "1 hour ago"

# Stop Service
sudo systemctl stop rembg

# ============================================================================
# NGINX REVERSE PROXY - PRODUCTION
# ============================================================================

# Create Proxy Configuration
sudo nano /etc/nginx/sites-available/rembg
# Copy content from rembg-microservice/DEPLOYMENT.md

# Enable Site
sudo ln -s /etc/nginx/sites-available/rembg /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Test Through Proxy
curl http://yourdomain.com/rembg/health
curl -X POST -F "image=@test.jpg" http://yourdomain.com/rembg/remove-bg

# ============================================================================
# QUICK START (ONE COMMAND)
# ============================================================================

# Everything at once
docker-compose up -d && sleep 2 && curl http://localhost:5000/health && echo -e "\n✅ Ready to use!"

# With check
docker-compose up -d && echo "Waiting for service..." && sleep 5 && \
curl -s http://localhost:5000/health | jq . && \
echo -e "\n✅ Rembg service is running\n📖 API docs: http://localhost:5000/docs"

# ============================================================================
# HELPFUL ALIASES (Add to ~/.bashrc or ~/.zshrc)
# ============================================================================

alias rembg-start="docker-compose up -d && echo '✅ Started' && curl http://localhost:5000/health"
alias rembg-stop="docker-compose down && echo '✅ Stopped'"
alias rembg-logs="docker-compose logs -f"
alias rembg-test="curl http://localhost:5000/health | jq ."
alias rembg-docs="open http://localhost:5000/docs 2>/dev/null || echo 'Visit http://localhost:5000/docs'"

# ============================================================================
