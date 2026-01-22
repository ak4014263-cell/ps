import http from 'http';

const data = JSON.stringify({
  email: 'admin@example.com',
  password: 'admin@123'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('Testing login with admin@example.com / admin@123\n');

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  let body = '';
  
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    try {
      const d = JSON.parse(body);
      if (d.success) {
        console.log('\n✅ LOGIN SUCCESSFUL!');
        console.log('User:', d.data.user);
      } else {
        console.log('\n❌ LOGIN FAILED');
        console.log('Error:', d.error);
      }
    } catch (e) {
      console.error('Parse error:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.write(data);
req.end();
