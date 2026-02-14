# PowerShell script to initialize repo and push README to GitHub
# Run from repository root in PowerShell

# Check git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Error "git is not installed or not on PATH. Install Git for Windows and retry."
  exit 1
}

# Create README entry if missing
if (-not (Test-Path README.md)) {
  "# cvd" | Out-File -Encoding UTF8 README.md
} else {
  Add-Content -Path README.md -Value "`n# cvd"
}

# Initialize and push
git init
git add README.md
# Configure user if not set (uncomment and edit if needed)
# git config user.name "Your Name"
# git config user.email "you@example.com"

# Commit (will fail if there's nothing to commit)
& git commit -m "first commit"
if ($LASTEXITCODE -ne 0) {
  Write-Host "No changes to commit or commit failed."
}

git branch -M main

# Replace existing origin if present
try {
  $existing = git remote get-url origin 2>$null
  if ($existing) {
    Write-Host "Removing existing origin: $existing"
    git remote remove origin
  }
} catch {
  # ignore
}

git remote add origin https://github.com/ak4014263-cell/cvd.git

git push -u origin main
