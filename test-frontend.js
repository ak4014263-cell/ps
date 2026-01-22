#!/usr/bin/env node
/**
 * Frontend Replication Test Script
 */

const API_URL = 'http://localhost:5000/api';

async function test() {
  console.log('\n====== FRONTEND REPLICATION TEST ======\n');
  
  try {
    // Simulate getting vendor from user lookup
    console.log('📋 Test 1: Get vendor from profile (user lookup)...');
    const userId = '19e8a9c8-97ad-4eac-9c21-b2a3b8fc1a38'; // Example user from logs
    const profileRes = await fetch(`${API_URL}/profiles/${userId}`);
    const profileData = await profileRes.json();
    
    if (!profileRes.ok) {
      console.log('  ⚠️  Profile not found:', profileData);
    } else {
      console.log('  ✅ Profile found:', profileData);
      const vendorId = profileData.data?.vendor_id || profileData.vendor_id;
      console.log(`  Vendor ID from profile: ${vendorId}`);
      
      if (!vendorId) {
        console.log('  ⚠️  No vendor_id in profile!');
      } else {
        // Test 2: Get clients for this vendor
        console.log(`\n📋 Test 2: Get clients for vendor ${vendorId}...`);
        const clientsRes = await fetch(`${API_URL}/clients/vendor/${vendorId}`);
        const clientsData = await clientsRes.json();
        console.log(`  ✅ Clients fetched:`, clientsData);
        
        // Test 3: Try to create project like the frontend does
        console.log(`\n📋 Test 3: Create project like frontend...`);
        const projectData = {
          project_name: 'Frontend Test ' + new Date().toISOString(),
          description: 'Test description',
          vendor_id: vendorId,
          client_id: clientsData.data?.[0]?.id || null,
          status: 'draft',
          start_date: null,
          end_date: null,
          budget: null,
          notes: null,
        };
        console.log(`  Sending:`, projectData);
        
        const createRes = await fetch(`${API_URL}/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectData)
        });
        const createData = await createRes.json();
        
        if (createRes.ok) {
          console.log('  ✅ Project created:', createData);
        } else {
          console.log('  ❌ Failed:', createData);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n====== END TEST ======\n');
}

test();
