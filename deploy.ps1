#!/usr/bin/env pwsh
# Vercel Deployment Quick Start - Windows PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Remix Crystal Admin - Vercel Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if git is configured
Write-Host "1️⃣  Checking Git Configuration..." -ForegroundColor Yellow
$gitStatus = git status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not in a git repository!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Git repository found" -ForegroundColor Green

# Check build
Write-Host ""
Write-Host "2️⃣  Testing Build..." -ForegroundColor Yellow
npm run build 2>&1 | Select-Object -Last 3
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful" -ForegroundColor Green
} else {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Git commit and push
Write-Host ""
Write-Host "3️⃣  Preparing for Deployment..." -ForegroundColor Yellow
git add .
git commit -m "Deploy to Vercel" 2>&1 | Select-Object -Last 2
git push origin main 2>&1 | Select-Object -Last 2

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Code pushed to GitHub" -ForegroundColor Green
} else {
    Write-Host "⚠️  Git push had issues, but continuing..." -ForegroundColor Yellow
}

# Vercel CLI check
Write-Host ""
Write-Host "4️⃣  Checking Vercel CLI..." -ForegroundColor Yellow
$vercelCmd = Get-Command vercel -ErrorAction SilentlyContinue
if ($null -eq $vercelCmd) {
    Write-Host "📦 Installing Vercel CLI..." -ForegroundColor Cyan
    npm install -g vercel
}
Write-Host "✅ Vercel CLI ready" -ForegroundColor Green

# Next steps
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 DEPLOYMENT OPTIONS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Option 1: Deploy with Vercel CLI" -ForegroundColor Yellow
Write-Host "  Command: vercel --prod" -ForegroundColor Gray
Write-Host ""
Write-Host "Option 2: Use GitHub Integration (Recommended)" -ForegroundColor Yellow
Write-Host "  1. Go to https://vercel.com/dashboard" -ForegroundColor Gray
Write-Host "  2. Click 'Add New' → 'Project'" -ForegroundColor Gray
Write-Host "  3. Import your GitHub repository" -ForegroundColor Gray
Write-Host "  4. Framework: Vite, Output: dist" -ForegroundColor Gray
Write-Host "  5. Deploy!" -ForegroundColor Gray
Write-Host ""
Write-Host "Option 3: Use GitHub Actions (Automated)" -ForegroundColor Yellow
Write-Host "  Instructions in .github/workflows/" -ForegroundColor Gray
Write-Host ""

# Environment variables reminder
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "⚙️  REMEMBER TO ADD ENV VARIABLES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "After deployment, go to Vercel dashboard:" -ForegroundColor Yellow
Write-Host "  Settings → Environment Variables" -ForegroundColor Gray
Write-Host ""
Write-Host "Add these variables:" -ForegroundColor Yellow
Write-Host "  VITE_API_BASE_URL = https://your-backend-domain.com" -ForegroundColor Gray
Write-Host "  VITE_CLOUDINARY_NAME = your_cloudinary_name" -ForegroundColor Gray
Write-Host "  VITE_CLOUDINARY_UPLOAD_PRESET = your_preset" -ForegroundColor Gray
Write-Host ""

Write-Host "✅ Ready to deploy!" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to view deployment guide"
notepad "VERCEL_DEPLOYMENT_GUIDE.md"
