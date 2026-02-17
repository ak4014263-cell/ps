#!/bin/bash
# Multivendor Queue System Setup Script

echo "🚀 Setting up Multivendor Queue System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check Docker
echo -e "${YELLOW}[1/6]${NC} Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker not found. Please install Docker.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker found${NC}"

# 2. Check Node.js
echo -e "${YELLOW}[2/6]${NC} Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found. Please install Node.js.${NC}"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js $NODE_VERSION found${NC}"

# 3. Install backend dependencies
echo -e "${YELLOW}[3/6]${NC} Installing backend dependencies..."
cd backend
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend queue dependencies..."
    npm install bull redis express-rate-limit rate-limit-redis node-fetch
else
    echo "Queue node modules already installed"
fi
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
fi
cd ..

# 4. Create .env file if it doesn't exist
echo -e "${YELLOW}[4/6]${NC} Checking environment configuration..."
if [ ! -f .env ]; then
    echo "Creating .env file with queue configuration..."
    cat > .env << EOF
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Rembg Instances
REMBG_URLS=http://localhost:5000,http://rembg-1:5000,http://rembg-2:5000

# Backend Port
BACKEND_PORT=3001

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF
    echo -e "${GREEN}✓ .env file created${NC}"
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# 5. Build Docker images
echo -e "${YELLOW}[5/6]${NC} Building Docker images..."
docker-compose build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Docker images built${NC}"
else
    echo -e "${RED}✗ Failed to build Docker images${NC}"
    exit 1
fi

# 6. Summary
echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Start services: docker-compose up"
echo "2. In another terminal: cd backend && node worker.js"
echo "3. Backend API: http://localhost:3001"
echo "4. Redis UI: http://localhost:8001 (if installed)"
echo ""
echo "Test endpoints:"
echo "  - Queue stats: curl http://localhost:3001/api/image-queue/queue-stats"
echo "  - Worker health: curl http://localhost:3001/api/worker/health"
echo ""
