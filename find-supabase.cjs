const fs = require('fs');
const path = require('path');

function findSupabaseImports(dir) {
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
            if (content.includes('import') && content.includes('supabase')) {
              const relativePath = fullPath.replace(dir, '');
              results.push(relativePath);
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
const files = findSupabaseImports(basePath);

console.log('\n🔍 SUPABASE IMPORTS FOUND:\n');
console.log('Total files: ' + files.length);
console.log('\nFiles list:\n');

files.forEach((file, i) => {
  console.log(`${i + 1}. ${file}`);
});

console.log('\n');
