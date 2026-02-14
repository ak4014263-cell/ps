#!/usr/bin/env bash
# POSIX shell script to initialize repo and push README to GitHub
set -e

if ! command -v git >/dev/null 2>&1; then
  echo "git is not installed. Install git and retry." >&2
  exit 1
fi

if [ ! -f README.md ]; then
  echo "# cvd" > README.md
else
  echo "\n# cvd" >> README.md
fi

git init
git add README.md
# git config --global user.name "Your Name"
# git config --global user.email "you@example.com"

if git rev-parse --git-dir >/dev/null 2>&1; then
  git commit -m "first commit" || echo "No changes to commit or commit failed."
fi

git branch -M main
if git remote get-url origin >/dev/null 2>&1; then
  git remote remove origin
fi

git remote add origin https://github.com/ak4014263-cell/cvd.git
git push -u origin main
