const vendorId = '7e454d52-07d8-431a-b101-6c77e57b0935';

fetch('http://localhost:5000/api/projects?vendor_id=' + encodeURIComponent(vendorId))
  .then(r => r.json())
  .then(data => {
    console.log('✅ Vendor projects:', JSON.stringify(data, null, 2));
  })
  .catch(e => console.error('❌ Error:', e.message));
