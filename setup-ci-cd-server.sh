#!/bin/bash
# Server setup script for Crystal Admin CI/CD deployment
# Run this on your deployment server before the first GitHub Actions deployment

set -e

echo "🚀 Crystal Admin CI/CD Server Setup"
echo "===================================="

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root (use sudo)"
   exit 1
fi

# Variables (modify these)
APP_DIR="/app/crystal-admin"
APP_USER="deployuser"
GITHUB_REPO_URL="https://github.com/your-username/crystal-admin.git"
GITHUB_BRANCH="main"

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
else
    echo "❌ Cannot detect OS"
    exit 1
fi

echo "📊 Detected OS: $OS"

# Function to install dependencies
install_dependencies() {
    echo "📦 Installing system dependencies..."
    
    if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
        apt-get update
        apt-get install -y \
            curl \
            wget \
            git \
            ca-certificates \
            gnupg \
            lsb-release
    elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"RHEL"* ]]; then
        yum install -y \
            curl \
            wget \
            git \
            ca-certificates \
            lsb-release
    fi
}

# Function to install Docker
install_docker() {
    echo "🐳 Installing Docker..."
    
    if command -v docker &> /dev/null; then
        echo "✅ Docker already installed"
        docker --version
        return
    fi
    
    if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
        # Add Docker repository
        mkdir -p /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        echo \
          "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
          $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
        
        # Install Docker
        apt-get update
        apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
        
    elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"RHEL"* ]]; then
        yum install -y yum-utils
        yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    fi
    
    # Start Docker service
    systemctl start docker
    systemctl enable docker
    
    echo "✅ Docker installed successfully"
    docker --version
}

# Function to install Docker Compose (standalone version as fallback)
install_docker_compose() {
    echo "📦 Installing Docker Compose..."
    
    if command -v docker-compose &> /dev/null; then
        echo "✅ Docker Compose already installed"
        docker-compose --version
        return
    fi
    
    # Download and install
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep -oP '"tag_name": "\K[^"]*')
    
    curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" \
        -o /usr/local/bin/docker-compose
    
    chmod +x /usr/local/bin/docker-compose
    
    echo "✅ Docker Compose installed"
    docker-compose --version
}

# Function to create deployment user
create_deploy_user() {
    echo "👤 Setting up deployment user..."
    
    if id "$APP_USER" &> /dev/null; then
        echo "✅ User $APP_USER already exists"
    else
        useradd -m -s /bin/bash $APP_USER
        usermod -aG docker $APP_USER
        echo "✅ User $APP_USER created and added to docker group"
    fi
}

# Function to set up application directory
setup_app_directory() {
    echo "📁 Setting up application directory..."
    
    mkdir -p $APP_DIR
    
    # Clone repository
    if [ -d "$APP_DIR/.git" ]; then
        echo "✅ Repository already cloned"
        cd $APP_DIR
        sudo -u $APP_USER git fetch origin
        sudo -u $APP_USER git reset --hard origin/$GITHUB_BRANCH
    else
        echo "📥 Cloning repository..."
        sudo -u $APP_USER git clone -b $GITHUB_BRANCH $GITHUB_REPO_URL $APP_DIR
    fi
    
    # Set ownership
    chown -R $APP_USER:$APP_USER $APP_DIR
    chmod 755 $APP_DIR
    
    echo "✅ Application directory setup complete"
}

# Function to create environment files
create_env_files() {
    echo "📝 Creating environment configuration files..."
    
    # Create .env.production
    if [ ! -f "$APP_DIR/.env.production" ]; then
        cat > $APP_DIR/.env.production << 'EOF'
# Production Environment Configuration
# These values will be overridden by GitHub Actions during deployment

NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=your_database_url_here

# Redis
REDIS_URL=redis://redis:6379

# Supabase (if used)
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_key_here

# JWT
JWT_SECRET=your_jwt_secret_here

# API Configuration
VITE_API_URL=https://api.yourdomain.com

# Feature flags
ENABLE_BACKGROUND_REMOVAL=true
ENABLE_FACE_CROP=true
ENABLE_IMAGE_BEAUTIFY=true
EOF
        chown $APP_USER:$APP_USER $APP_DIR/.env.production
        chmod 600 $APP_DIR/.env.production
        echo "✅ Created .env.production"
    else
        echo "✅ .env.production already exists"
    fi
}

# Function to set up SSH for Github Actions
setup_ssh() {
    echo "🔐 Setting up SSH configuration..."
    
    if [ ! -f /home/$APP_USER/.ssh/authorized_keys ]; then
        mkdir -p /home/$APP_USER/.ssh
        echo ""
        echo "⚠️  ADD YOUR GITHUB ACTIONS SSH PUBLIC KEY:"
        echo "================================================"
        echo "Create a GitHub Deploy SSH Key and add it here:"
        echo "1. Run: ssh-keygen -t rsa -b 4096 -f ~/.ssh/github_deploy"
        echo "2. Copy the contents of ~/.ssh/github_deploy.pub"
        echo "3. Paste it below and press Ctrl+D when done:"
        echo ""
        cat >> /home/$APP_USER/.ssh/authorized_keys <<< "$(cat)"
        
        chmod 700 /home/$APP_USER/.ssh
        chmod 600 /home/$APP_USER/.ssh/authorized_keys
        chown -R $APP_USER:$APP_USER /home/$APP_USER/.ssh
        
        echo "✅ SSH public key added"
    else
        echo "✅ SSH public key already configured"
    fi
}

# Function to set up Docker credentials
setup_docker_credentials() {
    echo "🔐 Setting up Docker credentials..."
    
    echo ""
    echo "📝 Would you like to set up Docker registry credentials? (y/n)"
    read -r setup_docker
    
    if [[ $setup_docker == "y" || $setup_docker == "Y" ]]; then
        echo ""
        echo "Enter Docker registry (ghcr.io for GitHub Container Registry):"
        read -r registry
        
        echo "Enter username:"
        read -r username
        
        echo "Enter password/token:"
        read -rs password
        
        su - $APP_USER -c "docker login -u $username -p $password $registry"
        echo "✅ Docker credentials configured"
    fi
}

# Function to test Docker setup
test_docker_setup() {
    echo "🧪 Testing Docker setup..."
    
    # Test Docker
    if docker ps &> /dev/null; then
        echo "✅ Docker is working"
    else
        echo "❌ Docker test failed"
        return 1
    fi
    
    # Test docker-compose
    if docker-compose --version &> /dev/null; then
        echo "✅ Docker Compose is working"
    else
        echo "❌ Docker Compose test failed"
        return 1
    fi
    
    # Test user permissions
    if su - $APP_USER -c "docker ps" &> /dev/null; then
        echo "✅ User $APP_USER has Docker access"
    else
        echo "❌ User $APP_USER cannot access Docker"
        return 1
    fi
}

# Function to display final instructions
display_instructions() {
    echo ""
    echo "==========================================="
    echo "✅ Server Setup Complete!"
    echo "==========================================="
    echo ""
    echo "📋 Next Steps:"
    echo ""
    echo "1. Configure GitHub Secrets (if not already done):"
    echo "   - Go to: Repository → Settings → Secrets and variables → Actions"
    echo "   - Add: PROD_DEPLOY_HOST = $HOSTNAME (or your IP)"
    echo "   - Add: PROD_DEPLOY_USER = $APP_USER"
    echo "   - Add: PROD_DEPLOY_SSH_KEY = (contents of ~/.ssh/github_deploy)"
    echo "   - Add: PROD_API_URL = https://yourdomain.com"
    echo "   - Add: DATABASE_URL, REDIS_URL, JWT_SECRET, etc."
    echo ""
    echo "2. Configure environment variables:"
    echo "   - Edit: $APP_DIR/.env.production"
    echo "   - Update all placeholder values"
    echo ""
    echo "3. Test deployment:"
    echo "   - Push to main/develop branch"
    echo "   - Monitor GitHub Actions → Deploy workflow"
    echo ""
    echo "📖 For detailed documentation, see: CI_CD_SETUP.md"
    echo ""
    echo "🔗 Application will be deployed to: $APP_DIR"
    echo "👤 Deployment user: $APP_USER"
    echo ""
}

# Main execution
main() {
    echo ""
    echo "Starting server setup..."
    echo ""
    
    install_dependencies
    install_docker
    install_docker_compose
    create_deploy_user
    setup_app_directory
    create_env_files
    setup_ssh
    setup_docker_credentials
    test_docker_setup
    
    echo ""
    echo "✅ All setup tasks completed!"
    display_instructions
}

# Run main function
main

exit 0
