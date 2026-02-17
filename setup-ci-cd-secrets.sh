#!/bin/bash
# Quick CI/CD Configuration Script for Linux/Mac
# This script helps you set up all the required GitHub secrets

set -e

echo "=========================================="
echo "Crystal Admin CI/CD Quick Setup"
echo "=========================================="
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed"
    echo "📥 Install from: https://cli.github.com/"
    exit 1
fi

echo "✅ GitHub CLI detected"
echo ""

# Check authentication
echo "🔐 Checking GitHub authentication..."
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub"
    echo "🔑 Run: gh auth login"
    exit 1
fi
echo "✅ Authenticated with GitHub"
echo ""

# Get repository info
read -p "Enter your GitHub repository (user/repo): " REPO

echo ""
echo "📝 Collecting deployment configuration..."
echo ""

# Create associative array for secrets
declare -A secrets

# Function to read secret
read_secret() {
    local prompt=$1
    local key=$2
    read -p "$prompt: " value
    if [ ! -z "$value" ]; then
        secrets[$key]=$value
    fi
}

# Collect secrets
read_secret "Production API URL (e.g., https://api.domain.com)" "PROD_API_URL"
read_secret "Production server hostname or IP" "PROD_DEPLOY_HOST"
read_secret "SSH user for production (e.g., deployuser)" "PROD_DEPLOY_USER"
read_secret "Development API URL (e.g., https://dev-api.domain.com)" "DEV_API_URL"
read_secret "Development server hostname or IP" "DEV_DEPLOY_HOST"
read_secret "SSH user for development" "DEV_DEPLOY_USER"
read_secret "Database connection URL (PostgreSQL/MySQL)" "DATABASE_URL"
read_secret "Redis URL (default: redis://localhost:6379)" "REDIS_URL"
read_secret "Supabase URL (optional)" "SUPABASE_URL"
read_secret "Supabase anon key (optional)" "SUPABASE_KEY"
read_secret "JWT secret key" "JWT_SECRET"
read_secret "Backend port (default: 3001, optional)" "BACKEND_PORT"

echo ""
echo "🔐 SSH Key Setup"
echo ""

read -p "Path to SSH private key (e.g., ~/.ssh/id_rsa): " ssh_key_path

# Expand tilde
ssh_key_path="${ssh_key_path/#\~/$HOME}"

if [ -f "$ssh_key_path" ]; then
    echo "📖 Reading SSH key..."
    secrets["PROD_DEPLOY_SSH_KEY"]=$(cat "$ssh_key_path")
    secrets["DEV_DEPLOY_SSH_KEY"]=$(cat "$ssh_key_path")
    echo "✅ SSH key loaded"
else
    echo "❌ SSH key not found at: $ssh_key_path"
    echo "⚠️  Skipping SSH key configuration"
fi

echo ""
echo "=========================================="
echo "📤 Setting GitHub Secrets..."
echo "=========================================="
echo ""

success_count=0
skip_count=0

for key in "${!secrets[@]}"; do
    value="${secrets[$key]}"
    
    # Skip empty values
    if [ -z "$value" ]; then
        echo "⏭️  Skipping $key (empty)"
        ((skip_count++))
        continue
    fi
    
    echo "📝 Setting $key..."
    
    # Set secret using gh CLI
    echo "$value" | gh secret set "$key" --repo "$REPO" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ $key set successfully"
        ((success_count++))
    else
        echo "⚠️  Failed to set $key"
    fi
done

echo ""
echo "=========================================="
echo "Setup Summary"
echo "=========================================="
echo "✅ Secrets set: $success_count"
echo "⏭️  Secrets skipped: $skip_count"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Run the server setup script on your deployment server:"
echo "   bash setup-ci-cd-server.sh"
echo ""
echo "2. Push code to activate workflows:"
echo "   git push origin main"
echo ""
echo "3. Monitor deployment:"
echo "   https://github.com/$REPO/actions"
echo ""
echo "📖 Full documentation: CI_CD_SETUP.md"
echo ""
