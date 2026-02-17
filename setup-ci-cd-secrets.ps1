# Quick CI/CD Configuration Script
# This script helps you set up all the required GitHub secrets

$RepoUrl = Read-Host "Enter your GitHub repository URL (e.g., https://github.com/user/repo)"
$Owner = ($RepoUrl -split '/')[-2]
$Repo = ($RepoUrl -split '/')[-1]

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Crystal Admin CI/CD Quick Setup" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Repository: $Owner/$Repo" -ForegroundColor Yellow
Write-Host ""

# Check if gh CLI is installed
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "❌ GitHub CLI (gh) is not installed" -ForegroundColor Red
    Write-Host "📥 Install from: https://cli.github.com/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ GitHub CLI detected" -ForegroundColor Green
Write-Host ""

# Check authentication
Write-Host "🔐 Checking GitHub authentication..."
$status = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not authenticated with GitHub" -ForegroundColor Red
    Write-Host "🔑 Run: gh auth login" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Authenticated with GitHub" -ForegroundColor Green
Write-Host ""

# Collect required secrets
Write-Host "📝 Collecting deployment configuration..." -ForegroundColor Cyan
Write-Host ""

$secrets = @{
    "PROD_API_URL" = Read-Host "Production API URL (e.g., https://api.domain.com)"
    "PROD_DEPLOY_HOST" = Read-Host "Production server hostname or IP"
    "PROD_DEPLOY_USER" = Read-Host "SSH user for production (e.g., deployuser)"
    "DEV_API_URL" = Read-Host "Development API URL (e.g., https://dev-api.domain.com)"
    "DEV_DEPLOY_HOST" = Read-Host "Development server hostname or IP"
    "DEV_DEPLOY_USER" = Read-Host "SSH user for development"
    "DATABASE_URL" = Read-Host "Database connection URL (PostgreSQL/MySQL)"
    "REDIS_URL" = Read-Host "Redis URL (default: redis://localhost:6379)"
    "SUPABASE_URL" = Read-Host "Supabase URL (optional, press Enter to skip)"
    "SUPABASE_KEY" = Read-Host "Supabase anon key (optional, press Enter to skip)"
    "JWT_SECRET" = Read-Host "JWT secret key"
    "BACKEND_PORT" = Read-Host "Backend port (default: 3001, press Enter to skip)"
}

Write-Host ""
Write-Host "🔐 SSH Key Setup" -ForegroundColor Cyan
Write-Host ""

$sshKeyPath = Read-Host "Path to SSH private key (e.g., C:\Users\YourUser\.ssh\id_rsa)"

if (Test-Path $sshKeyPath) {
    Write-Host "📖 Reading SSH key..." -ForegroundColor Yellow
    $sshKeyContent = Get-Content $sshKeyPath -Raw
    $secrets["PROD_DEPLOY_SSH_KEY"] = $sshKeyContent
    $secrets["DEV_DEPLOY_SSH_KEY"] = $sshKeyContent
    Write-Host "✅ SSH key loaded" -ForegroundColor Green
} else {
    Write-Host "❌ SSH key not found at: $sshKeyPath" -ForegroundColor Red
    Write-Host "📋 Skipping SSH key configuration" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📤 Setting GitHub Secrets..." -ForegroundColor Cyan
Write-Host ""

$successCount = 0
$skipCount = 0

foreach ($key in $secrets.Keys) {
    $value = $secrets[$key]
    
    # Skip empty values
    if ([string]::IsNullOrWhiteSpace($value)) {
        Write-Host "⏭️  Skipping $key (empty)" -ForegroundColor Gray
        $skipCount++
        continue
    }
    
    # Create secret
    Write-Host "📝 Setting $key..." -ForegroundColor Yellow
    
    # Use echo to pipe value to gh secret set
    $value | gh secret set $key --repo $Owner/$Repo 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $key set successfully" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "⚠️  Failed to set $key" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Summary" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Secrets set: $successCount" -ForegroundColor Green
Write-Host "⏭️  Secrets skipped: $skipCount" -ForegroundColor Yellow
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Run the server setup script on your deployment server:"
Write-Host "   Linux/Mac:  bash setup-ci-cd-server.sh"
Write-Host "   Windows:   .\setup-ci-cd-server.ps1"
Write-Host ""
Write-Host "2. Push code to activate workflows:"
Write-Host "   git push origin main"
Write-Host ""
Write-Host "3. Monitor deployment:"
Write-Host "   https://github.com/$Owner/$Repo/actions"
Write-Host ""
Write-Host "📖 Full documentation: CI_CD_SETUP.md" -ForegroundColor Cyan
Write-Host ""
