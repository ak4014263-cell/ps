const fs = require('fs');
const path = require('path');

function findSupabaseImportStatements(dir) {
  const results = [];
  
  function search(currentPath) {
    try {
      const items = fs.readdirSync(currentPath, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(currentPath, item.name);
        
        // Skip node_modules, .git, dist, etc
        if (item.isDirectory()) {
          if (!['node_modules', '.git', 'dist', '.vscode', '__pycache__'].includes(item.name)) {
            search(fullPath);
          }
        } else if (item.isFile() && (item.name.endsWith('.tsx') || item.name.endsWith('.ts'))) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            // Only find actual import statements, not comments or usage
            if (content.match(/^\s*import\s+.*from\s+['"`].*supabase/m)) {
              const relativePath = fullPath.replace(dir, '');
              results.push({path: relativePath, file: fullPath});
            }
          } catch (e) {
            // Skip binary files
          }
        }
      }
    } catch (e) {
      // Skip permission errors
    }
  }
  
  search(dir);
  return results;
}

const basePath = 'c:\\Users\\ajayk\\Downloads\\remix-of-crystal-admin-42-main (1)\\remix-of-crystal-admin-42-main\\src';
const files = findSupabaseImportStatements(basePath);

console.log('\n🔍 SUPABASE IMPORT STATEMENTS FOUND:\n');
console.log('Total files with active imports: ' + files.length);

if (files.length === 0) {
  console.log('\n✅ SUCCESS! All Supabase imports have been replaced with apiService!\n');
} else {
  console.log('\nFiles that still need updating:\n');
  files.forEach((item, i) => {
    console.log(`${i + 1}. ${item.path}`);
  });
  console.log('\n');
}
