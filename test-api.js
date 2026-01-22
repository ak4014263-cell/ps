#!/usr/bin/env node
/**
 * Quick API Test Script
 */

const API_URL = 'http://localhost:5000/api';

async function test() {
  console.log('\n====== API TEST SCRIPT ======\n');
  
  try {
    // Test 1: Get all vendors
    console.log('📋 Test 1: Get all vendors...');
    const vendorsRes = await fetch(`${API_URL}/vendors`);
    const vendors = await vendorsRes.json();
    console.log('  Vendors:', vendors.count || 0);
    if (vendors.data?.length > 0) {
      const vendor = vendors.data[0];
      console.log(`  First vendor: ${vendor.id} - ${vendor.name}`);
      
      // Test 2: Get clients for this vendor
      console.log(`\n📋 Test 2: Get clients for vendor ${vendor.id}...`);
      const clientsRes = await fetch(`${API_URL}/clients/vendor/${vendor.id}`);
      const clients = await clientsRes.json();
      console.log('  Clients:', clients.count || 0);
      if (clients.data?.length > 0) {
        console.log(`  First client: ${clients.data[0].client_name || clients.data[0].id}`);
      }
      
      // Test 3: Create a test project
      console.log(`\n📋 Test 3: Create a test project...`);
      const createRes = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: 'Test Project ' + new Date().toISOString(),
          vendor_id: vendor.id,
          status: 'draft'
        })
      });
      const createData = await createRes.json();
      if (createRes.ok) {
        console.log('  ✅ Project created:', createData.data?.id || createData.data);
      } else {
        console.log('  ❌ Failed:', createData.error);
      }
    } else {
      console.log('  ⚠️  No vendors found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n====== END TEST ======\n');
}

test();
