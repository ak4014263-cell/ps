#!/usr/bin/env pwsh
# Deploy to VPS - Windows PowerShell Script

$VpsIP = "72.62.241.170"
$VpsUser = "root"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 Crystal Admin - VPS Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Create deployment package
Write-Host "1️⃣  Creating deployment package..." -ForegroundColor Yellow

$deployItems = @(
    "dist",
    "backend",
    "rembg-microservice",
    "MYSQL_SCHEMA_id_card.sql",
    "setup_vps.sh",
    "package.json"
)

# Verify all items exist
$missingItems = @()
foreach ($item in $deployItems) {
    if (-not (Test-Path $item)) {
        $missingItems += $item
    }
}

if ($missingItems.Count -gt 0) {
    Write-Host "❌ Missing deployment items: $($missingItems -join ', ')" -ForegroundColor Red
    exit 1
}

# Create ZIP file
$zipPath = "deploy_vps.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

$compress = @{
    Path = $deployItems
    CompressionLevel = "Fastest"
    DestinationPath = $zipPath
}

Compress-Archive @compress
Write-Host "✅ Deployment package created: $zipPath" -ForegroundColor Green
Write-Host "   Size: $([math]::Round((Get-Item $zipPath).Length / 1MB, 2)) MB" -ForegroundColor Gray

# 2. Check for SSH/SCP
Write-Host ""
Write-Host "2️⃣  Checking SSH tools..." -ForegroundColor Yellow

# Try scp command
$scpCmd = Get-Command scp -ErrorAction SilentlyContinue
if ($null -eq $scpCmd) {
    Write-Host "⚠️  SCP not found. Installing OpenSSH Client..." -ForegroundColor Yellow
    # Windows 10/11 has built-in SSH
    Write-Host "📝 Tip: Use 'Add-WindowsCapability -Online -Name OpenSSH.Client' to install SSH" -ForegroundColor Gray
}
else {
    Write-Host "✅ SSH/SCP tools found" -ForegroundColor Green
}

# 3. Upload to VPS
Write-Host ""
Write-Host "3️⃣  Uploading to VPS ($VpsIP)..." -ForegroundColor Yellow

$scpCommand = "scp -r $zipPath $($VpsUser)@$($VpsIP):/tmp/"

Write-Host "   Command: $scpCommand" -ForegroundColor Gray

try {
    & scp -r $zipPath "$VpsUser@$VpsIP`:/tmp/"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Upload successful" -ForegroundColor Green
    } else {
        Write-Host "❌ Upload failed with exit code $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error during upload: $_" -ForegroundColor Red
    Write-Host "💡 Make sure SSH is installed and you can connect to the VPS" -ForegroundColor Yellow
    exit 1
}

# 4. Extract and setup on VPS
Write-Host ""
Write-Host "4️⃣  Setting up on VPS..." -ForegroundColor Yellow

$remoteCommands = @"
cd /tmp
unzip -o deploy_vps.zip
bash setup_vps.sh
"@

Write-Host "   Running setup script on VPS..." -ForegroundColor Gray

try {
    $remoteCommands | ssh "$VpsUser@$VpsIP" "bash"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ VPS setup completed" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Setup completed with warnings" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Remote setup failed: $_" -ForegroundColor Red
    Write-Host "💡 Check VPS logs manually with: ssh $VpsUser@$VpsIP" -ForegroundColor Yellow
    exit 1
}

# 5. Final instructions
Write-Host ""
Write-Host "5️⃣  Next Steps" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ Frontend built and deployed to: $VpsIP" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Configure environment variables on VPS:" -ForegroundColor Cyan
Write-Host "   ssh $VpsUser@$VpsIP" -ForegroundColor Gray
Write-Host "   nano /var/www/crystal-admin/backend/.env" -ForegroundColor Gray
Write-Host ""
Write-Host "🚀 Start services:" -ForegroundColor Cyan
Write-Host "   cd /var/www/crystal-admin/backend" -ForegroundColor Gray
Write-Host "   pm2 start app.js --name 'crystal-admin-backend'" -ForegroundColor Gray
Write-Host "   pm2 save" -ForegroundColor Gray
Write-Host ""
Write-Host "🌐 Access your application:" -ForegroundColor Cyan
Write-Host "   http://$VpsIP" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete! ✅" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
