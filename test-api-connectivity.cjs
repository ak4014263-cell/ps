const http = require('http');

console.log('\n🧪 Testing API Connectivity\n');

const endpoints = [
  { method: 'GET', path: '/api/health', name: 'Health Check' },
  { method: 'GET', path: '/api/clients', name: 'Get Clients' },
  { method: 'GET', path: '/api/projects', name: 'Get Projects' },
  { method: 'GET', path: '/api/project-tasks', name: 'Get Tasks' },
];

let completed = 0;

endpoints.forEach(endpoint => {
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: endpoint.path,
    method: endpoint.method,
    timeout: 3000
  };

  const req = http.request(options, (res) => {
    const statusOk = res.statusCode >= 200 && res.statusCode < 300;
    console.log(`${statusOk ? '✅' : '❌'} ${endpoint.name.padEnd(20)} ${endpoint.method} ${endpoint.path}`);
    console.log(`   Status: ${res.statusCode}`);
    
    completed++;
    if (completed === endpoints.length) {
      console.log('\n');
      showSummary();
    }
  });

  req.on('error', (e) => {
    console.log(`❌ ${endpoint.name.padEnd(20)} ${endpoint.method} ${endpoint.path}`);
    console.log(`   Error: ${e.message}`);
    
    completed++;
    if (completed === endpoints.length) {
      console.log('\n');
      showSummary();
    }
  });

  req.on('timeout', () => {
    console.log(`❌ ${endpoint.name.padEnd(20)} ${endpoint.method} ${endpoint.path}`);
    console.log(`   Error: Timeout (no response)`);
    req.destroy();
    
    completed++;
    if (completed === endpoints.length) {
      console.log('\n');
      showSummary();
    }
  });

  req.end();
});

function showSummary() {
  console.log('📋 TROUBLESHOOTING:\n');
  console.log('If endpoints show ❌:');
  console.log('  1. Verify backend is running: npm run dev:backend');
  console.log('  2. Check backend is on port 5000');
  console.log('  3. Check database connection (MySQL on port 3306)');
  console.log('  4. Review backend logs for errors\n');
  
  console.log('If endpoints show ✅:');
  console.log('  1. Frontend should be able to create/update data');
  console.log('  2. If creation still fails, check browser console for errors');
  console.log('  3. Verify vendor_id is being sent with requests\n');
}
