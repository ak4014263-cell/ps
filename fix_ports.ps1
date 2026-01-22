$files = @(
  "src\components\project\ImagePreviewDialog.tsx",
  "src\components\project\PhotoMatchDialog.tsx",
  "src\components\project\DataRecordsTable.tsx",
  "src\pages\ProjectDetails.tsx",
  "src\hooks\useAuth.tsx",
  "src\components\pdf\TemplatePreview.tsx"
)

foreach($file in $files) {
  $path = Join-Path (Get-Location) $file
  if(Test-Path $path) {
    $content = Get-Content $path -Raw
    $updated = $content -replace 'localhost:5000', 'localhost:3001'
    Set-Content $path $updated -Encoding UTF8 -NoNewline
    Write-Host "✓ Updated: $file"
  } else {
    Write-Host "✗ Not found: $file"
  }
}
Write-Host "Done!"
