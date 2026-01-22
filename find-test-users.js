#!/usr/bin/env node
/**
 * Find Test Users Script
 */

const API_URL = 'http://localhost:5000/api';

async function test() {
  console.log('\n====== FINDING TEST USERS ======\n');
  
  try {
    // Get all profiles
    console.log('📋 Fetching all profiles...');
    const profilesRes = await fetch(`${API_URL}/profiles`);
    const profilesData = await profilesRes.json();
    
    if (profilesData.data?.length > 0) {
      console.log(`✅ Found ${profilesData.data.length} profiles`);
      console.log('\nProfiles with vendor_id:');
      profilesData.data.forEach(p => {
        if (p.vendor_id) {
          console.log(`  - ${p.id} (${p.email}) -> vendor: ${p.vendor_id}`);
        }
      });
      
      // Now test with a real vendor profile
      if (profilesData.data[0]?.vendor_id) {
        const vendorProfile = profilesData.data.find(p => p.vendor_id);
        console.log(`\n🔍 Testing with profile: ${vendorProfile.id}`);
        console.log(`   Email: ${vendorProfile.email}`);
        console.log(`   Vendor ID: ${vendorProfile.vendor_id}`);
        
        // Test client loading
        console.log(`\n📋 Fetching clients for this vendor...`);
        const clientsRes = await fetch(`${API_URL}/clients/vendor/${vendorProfile.vendor_id}`);
        const clientsData = await clientsRes.json();
        console.log(`✅ Found ${clientsData.count} clients`);
        if (clientsData.data?.length > 0) {
          console.log(`   First client: ${clientsData.data[0].client_name}`);
        }
      }
    } else {
      console.log('❌ No profiles found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n====== END ======\n');
}

test();
