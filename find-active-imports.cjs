const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'src');
let files = [];

function scan(dir) {
  try {
    fs.readdirSync(dir, { withFileTypes: true }).forEach(item => {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory() && !['node_modules', '.git', 'dist'].includes(item.name)) {
        scan(fullPath);
      } else if (item.isFile() && (item.name.endsWith('.tsx') || item.name.endsWith('.ts'))) {
        if (!fullPath.includes('integrations/supabase')) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          if (content.match(/^\s*import\s+.*from\s+['"`].*supabase/m)) {
            const rel = fullPath.replace(srcPath, '');
            files.push(rel);
            console.log(rel);
          }
        }
      }
    });
  } catch (e) {}
}

console.log('Files with active Supabase imports (excluding stub):\n');
scan(srcPath);
console.log(`\nTotal: ${files.length}`);
