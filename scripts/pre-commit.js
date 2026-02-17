#!/usr/bin/env node
// pre-commit hook to prevent secrets from being committed
// Install: cp pre-commit.js .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SECRETS_PATTERNS = [
  // Environment variables
  /DATABASE_URL\s*=\s*[^\s]+/gi,
  /REDIS_URL\s*=\s*[^\s]+/gi,
  /JWT_SECRET\s*=\s*[^\s]+/gi,
  /SUPABASE_KEY\s*=\s*[^\s]+/gi,
  /SECRET_KEY\s*=\s*[^\s]+/gi,
  /API_KEY\s*=\s*[^\s]+/gi,
  /SECRET\s*=\s*[^\s]+/gi,
  /PASSWORD\s*=\s*[^\s]+/gi,
  /TOKEN\s*=\s*[^\s]+/gi,
  
  // SSH Keys
  /-----BEGIN PRIVATE KEY-----/gi,
  /-----BEGIN RSA PRIVATE KEY-----/gi,
  /-----BEGIN OPENSSH PRIVATE KEY-----/gi,
  
  // AWS
  /AKIA[0-9A-Z]{16}/gi,
  /aws_access_key_id\s*=\s*[^\s]+/gi,
  /aws_secret_access_key\s*=\s*[^\s]+/gi,
  
  // Generic patterns
  /(?:password|passwd|pwd)\s*[=:]\s*[^\s]+/gi,
  /(?:key|secret|token)\s*[=:]\s*[^\s]+/gi,
];

const IGNORED_FILES = [
  '.env.example',
  '.env.template',
  'CI_CD_SETUP.md',
  'README.md',
  'node_modules/**',
  'dist/**',
];

function isIgnored(filePath) {
  return IGNORED_FILES.some(pattern => {
    if (pattern.includes('**')) {
      const dir = pattern.replace('/**', '');
      return filePath.startsWith(dir + '/') || filePath.startsWith(dir + '\\');
    }
    return filePath === pattern;
  });
}

function checkFile(filePath) {
  if (isIgnored(filePath)) {
    return { issues: [], skipped: true };
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const issues = [];

    SECRETS_PATTERNS.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        issues.push({
          file: filePath,
          pattern: pattern.toString(),
          matches: matches.slice(0, 3), // First 3 matches
        });
      }
    });

    return { issues, skipped: false };
  } catch (error) {
    return { issues: [], skipped: true, error };
  }
}

function main() {
  try {
    // Get staged files
    const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
      .split('\n')
      .filter(f => f.trim());

    console.log('🔍 Scanning staged files for secrets...\n');

    let foundSecrets = false;
    const results = [];

    stagedFiles.forEach(file => {
      const result = checkFile(file);
      results.push({ file, ...result });

      if (result.issues.length > 0) {
        foundSecrets = true;
        console.log(`❌ ${file}`);
        result.issues.forEach(issue => {
          console.log(`   Pattern: ${issue.pattern}`);
          console.log(`   Matches: ${issue.matches.join(', ')}`);
        });
      }
    });

    if (foundSecrets) {
      console.log('\n\n⚠️  SECURITY ALERT: Potential secrets detected!');
      console.log('\n🚫 Commit blocked to prevent secrets from being exposed.\n');
      console.log('Options:');
      console.log('1. Remove the secret from the file');
      console.log('2. Add the file to .gitignore');
      console.log('3. Use .env files (added to .gitignore)');
      console.log('4. If this is intentional, use: git commit --no-verify\n');
      process.exit(1);
    }

    const skipped = results.filter(r => r.skipped).length;
    const checked = results.length - skipped;

    console.log(`✅ ${checked} files checked, ${skipped} files skipped`);
    console.log('🔐 No secrets detected. Proceeding with commit.\n');
    process.exit(0);

  } catch (error) {
    console.error('Error in pre-commit hook:', error);
    process.exit(1);
  }
}

main();
