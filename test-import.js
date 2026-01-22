#!/usr/bin/env node
console.log('Testing auth.js import...');

try {
  const auth = await import('./backend/routes/auth.js');
  console.log('✅ Auth module loaded successfully');
} catch (error) {
  console.error('❌ Error loading auth module:');
  console.error(error.message);
  console.error('\nFull error:');
  console.error(error);
  process.exit(1);
}
