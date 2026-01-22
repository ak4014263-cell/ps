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

console.log('Making request to:', `http://${options.hostname}:${options.port}${options.path}`);
console.log('Data:', data);

const req = http.request(options, (res) => {
  console.log('✅ Got response with status:', res.statusCode);
  let body = '';
  
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    try {
      const d = JSON.parse(body);
      console.log('Response data:', JSON.stringify(d, null, 2));
      
      if (d.success) {
        console.log('\n✅ LOGIN SUCCESSFUL!');
        console.log('Token:', d.data.token.substring(0, 30) + '...');
        console.log('User:', d.data.user);
      } else {
        console.log('\n❌ LOGIN FAILED');
        console.log('Error:', d.error);
      }
    } catch (e) {
      console.error('Parse error:', e.message);
      console.log('Raw body:', body);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
  console.error('Code:', e.code);
  console.error('Full error:', e);
  process.exit(1);
});

console.log('Sending request...');
req.write(data);
req.end();

setTimeout(() => {
  console.log('Timeout reached');
  process.exit(1);
}, 5000);
