const http = require('http');

const vendorId = '455e8894-a635-447f-8a2a-aa0066c27a20';

const clientData = {
  client_name: 'Test Client Inc',
  company: 'Test Corp',
  email: 'test@client.com',
  phone: '555-0123',
  address: '123 Test St',
  city: 'Test City',
  state: 'TS',
  postal_code: '12345',
  country: 'TestCountry',
  notes: 'Test notes',
  vendor_id: vendorId
};

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/clients',
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

console.log('Creating client with vendor_id...');
req.write(JSON.stringify(clientData));
req.end();
