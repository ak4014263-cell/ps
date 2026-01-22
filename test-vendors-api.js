// Test vendor API
fetch('http://localhost:5000/api/vendors')
  .then(r => r.json())
  .then(d => {
    console.log('Vendors API Response:', d);
    console.log('Count:', d.count);
    console.log('Data:', d.data);
  })
  .catch(e => console.error('Error:', e));
