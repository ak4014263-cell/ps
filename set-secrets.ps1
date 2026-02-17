# Set GitHub Secrets Script
$ghPath = "C:\Program Files\GitHub CLI\gh.exe"
$repo = "ak4014263-cell/ps"

$secrets = @{
    "PROD_API_URL" = "https://api.crystal-admin.local"
    "PROD_DEPLOY_HOST" = "72.62.241.170"
    "PROD_DEPLOY_USER" = "root"
    "DEV_API_URL" = "https://dev-api.crystal-admin.local"
    "DEV_DEPLOY_HOST" = "72.62.241.170"
    "DEV_DEPLOY_USER" = "root"
    "DATABASE_URL" = "mysql://root:AjayShivam@6565@72.62.241.170:3306/id_card"
    "REDIS_URL" = "redis://72.62.241.170:6379"
    "JWT_SECRET" = "supersecretjwtkey123456789012345"
    "BACKEND_PORT" = "3001"
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setting GitHub Secrets" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$successCount = 0
$failCount = 0

foreach ($key in $secrets.Keys) {
    $value = $secrets[$key]
    Write-Host "[ACTION] Setting $key..." -ForegroundColor Yellow
    
    try {
        $value | & $ghPath secret set $key --repo $repo 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] $key" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "[ERROR] Failed to set $key" -ForegroundColor Red
            $failCount++
        }
    } catch {
        Write-Host "[ERROR] Exception setting $key`: $_" -ForegroundColor Red
        $failCount++
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "[OK] Secrets set: $successCount" -ForegroundColor Green
Write-Host "[ERROR] Failures: $failCount" -ForegroundColor Yellow
Write-Host ""

if ($successCount -eq 10) {
    Write-Host "All secrets configured successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Set up your deployment server:"
    Write-Host "   ssh root@72.62.241.170"
    Write-Host "   bash setup-ci-cd-server.sh"
    Write-Host ""
    Write-Host "2. Push code to trigger CI/CD:"
    Write-Host "   git push origin main"
    Write-Host ""
    Write-Host "3. Monitor deployment:"
    Write-Host "   https://github.com/ak4014263-cell/ps/actions"
} else {
    Write-Host "Some secrets failed to set. Please check the output above." -ForegroundColor Yellow
}
