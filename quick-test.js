#!/usr/bin/env node
/**
 * Quick test - can vendor create projects?
 */

const API_URL = 'http://localhost:5000/api';

async function test() {
  try {
    // Get vendor
    const prof = await fetch(`${API_URL}/profiles`).then(r => r.json());
    const vendor = prof.data.find(p => p.vendor_id);
    if (!vendor) throw new Error('No vendor found');
    
    // Get vendor's clients
    const clients = await fetch(`${API_URL}/clients/vendor/${vendor.vendor_id}`).then(r => r.json());
    const client = clients.data?.[0];
    
    // Create project WITHOUT client
    console.log('✅ Creating project without client...');
    const p1 = await fetch(`${API_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_name: `Test [NO CLIENT] ${Date.now()}`,
        vendor_id: vendor.vendor_id,
        status: 'draft'
      })
    }).then(r => r.json());
    
    if (p1.success) {
      console.log('✅ SUCCESS: Project created without client');
      console.log(`   ID: ${p1.data.id}`);
    } else {
      console.log('❌ FAILED:', p1.error);
      throw new Error(p1.error);
    }
    
    // Create project WITH client (if available)
    if (client) {
      console.log('\n✅ Creating project with client...');
      const p2 = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: `Test [WITH CLIENT] ${Date.now()}`,
          vendor_id: vendor.vendor_id,
          client_id: client.id,
          status: 'draft'
        })
      }).then(r => r.json());
      
      if (p2.success) {
        console.log('✅ SUCCESS: Project created with client');
        console.log(`   ID: ${p2.data.id}`);
        console.log(`   Client: ${client.client_name || client.id}`);
      } else {
        console.log('❌ FAILED:', p2.error);
        throw new Error(p2.error);
      }
    }
    
    console.log('\n✅ ALL TESTS PASSED');
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  }
}

test();
