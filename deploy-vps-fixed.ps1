#!/usr/bin/env pwsh
# Deploy to VPS - Windows PowerShell Script

$VpsIP = "72.62.241.170"
$VpsUser = "root"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Crystal Admin - VPS Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Create deployment package
Write-Host "1. Creating deployment package..." -ForegroundColor Yellow

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
    Write-Host "ERROR: Missing deployment items: $($missingItems -join ', ')" -ForegroundColor Red
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
Write-Host "SUCCESS: Deployment package created: $zipPath" -ForegroundColor Green
Write-Host "   Size: $([math]::Round((Get-Item $zipPath).Length / 1MB, 2)) MB" -ForegroundColor Gray

# 2. Check for SSH/SCP
Write-Host ""
Write-Host "2. Checking SSH tools..." -ForegroundColor Yellow

$scpCmd = Get-Command scp -ErrorAction SilentlyContinue
if ($null -eq $scpCmd) {
    Write-Host "WARNING: SCP not found" -ForegroundColor Yellow
    Write-Host "Install OpenSSH Client: Add-WindowsCapability -Online -Name OpenSSH.Client" -ForegroundColor Gray
}
else {
    Write-Host "SUCCESS: SSH/SCP tools found" -ForegroundColor Green
}

# 3. Upload to VPS
Write-Host ""
Write-Host "3. Uploading to VPS ($VpsIP)..." -ForegroundColor Yellow

try {
    & scp -r $zipPath "$VpsUser@$VpsIP`:/tmp/"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS: Upload successful" -ForegroundColor Green
    }
    else {
        Write-Host "ERROR: Upload failed with exit code $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    exit 1
}

# 4. Extract and setup on VPS
Write-Host ""
Write-Host "4. Setting up on VPS..." -ForegroundColor Yellow

$remoteCommands = "cd /tmp && unzip -o deploy_vps.zip && bash setup_vps.sh"

try {
    $remoteCommands | ssh "$VpsUser@$VpsIP" "bash"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS: VPS setup completed" -ForegroundColor Green
    }
    else {
        Write-Host "WARNING: Setup completed with warnings" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "ERROR: Remote setup failed: $_" -ForegroundColor Red
    exit 1
}

# 5. Final instructions
Write-Host ""
Write-Host "5. Next Steps" -ForegroundColor Yellow
Write-Host ""
Write-Host "App deployed to: http://$VpsIP" -ForegroundColor Green
Write-Host ""
Write-Host "SSH into VPS:" -ForegroundColor Cyan
Write-Host "   ssh $VpsUser@$VpsIP" -ForegroundColor Gray
Write-Host ""
Write-Host "Configure environment:" -ForegroundColor Cyan
Write-Host "   nano /var/www/crystal-admin/backend/.env" -ForegroundColor Gray
Write-Host ""
Write-Host "Start services:" -ForegroundColor Cyan
Write-Host "   cd /var/www/crystal-admin/backend" -ForegroundColor Gray
Write-Host "   pm2 start server.js --name 'crystal-admin'" -ForegroundColor Gray
Write-Host "   pm2 save" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
