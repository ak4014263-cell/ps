import crypto from 'crypto';

function hash(pwd) {
  return crypto.createHash('sha256').update(pwd).digest('hex');
}

console.log('Hash of "admin@123":', hash('admin@123'));
console.log('Hash of "password123":', hash('password123'));
console.log('Hash of " admin@123":', hash(' admin@123'));
console.log('Hash of "admin@123 ":', hash('admin@123 '));
