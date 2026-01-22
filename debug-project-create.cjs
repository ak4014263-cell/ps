const http = require('http');

const vendorId = '455e8894-a635-447f-8a2a-aa0066c27a20';

const projectData = {
  project_name: 'Test Project',
  description: 'Test Description',
  vendor_id: vendorId
};

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/projects',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    try {
      const parsed = JSON.parse(data);
      console.log('Response:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Response (raw):', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

console.log('Creating project with vendor_id (without status)...');
req.write(JSON.stringify(projectData));
req.end();
