const fs = require('fs');
const path = require('path');

// Search for the photo file
const photoFilename = 'photo_d5856e69-7d72-41cd-88fe-26e90b552734_1769080058522.jpg';
const uploadsDir = path.join(__dirname, 'uploads');

function searchRecursive(dir, targetName, depth = 0) {
  if (depth > 5) return []; // Limit depth
  
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isFile() && entry.name === targetName) {
        results.push(fullPath);
      } else if (entry.isDirectory()) {
        results.push(...searchRecursive(fullPath, targetName, depth + 1));
      }
    }
  } catch (err) {
    // Skip permission errors
  }
  
  return results;
}

console.log(`Searching for: ${photoFilename}\n`);
const found = searchRecursive(uploadsDir, photoFilename);

if (found.length > 0) {
  console.log('✓ Found:');
  found.forEach(f => console.log('  ', f));
} else {
  console.log('✗ Not found in uploads directory');
  
  // List all jpg files to see what's actually there
  console.log('\nSearching for ANY jpg files in uploads...');
  const allJpgs = searchRecursive(uploadsDir, null);
  const jpgs = fs.readdirSync(uploadsDir, { withFileTypes: true, recursive: true })
    .filter(e => e.isFile() && e.name.endsWith('.jpg'))
    .slice(0, 20);
  
  console.log(`\nFirst 20 JPG files:`);
  jpgs.forEach(f => console.log('  ', f.parentPath.replace(__dirname, ''), '/', f.name));
}
