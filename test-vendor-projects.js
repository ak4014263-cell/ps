#!/usr/bin/env node
import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api';

async function testVendorProjectCreation() {
  console.log('\n🧪 TESTING VENDOR PROJECT CREATION\n');
  
  try {
    // Step 1: Get all vendors
    console.log('1️⃣  Fetching vendors...');
    const vendorsRes = await fetch(`${API_URL}/vendors`);
    const vendorsData = await vendorsRes.json();
    const vendors = vendorsData.data || vendorsData || [];
    console.log(`   ✅ Found ${vendors.length} vendors`);
    
    if (vendors.length === 0) {
      console.log('   ❌ No vendors found');
      return;
    }
    
    const vendor = vendors[0];
    console.log(`   📌 Testing with vendor: ${vendor.company_name} (ID: ${vendor.id})`);
    
    // Step 2: Get vendor's profile to verify vendor_id linkage
    console.log('\n2️⃣  Fetching profiles...');
    const profilesRes = await fetch(`${API_URL}/profiles`);
    const profilesData = await profilesRes.json();
    const profiles = profilesData.data || profilesData || [];
    
    const vendorProfile = profiles.find(p => p.vendor_id === vendor.id);
    if (!vendorProfile) {
      console.log(`   ❌ No profile found with vendor_id: ${vendor.id}`);
      console.log('   💡 Available profiles with vendor_id:');
      profiles.filter(p => p.vendor_id).forEach(p => {
        console.log(`      - ${p.email} → vendor_id: ${p.vendor_id}`);
      });
      return;
    }
    
    console.log(`   ✅ Found vendor profile: ${vendorProfile.email}`);
    console.log(`      vendor_id: ${vendorProfile.vendor_id}`);
    
    // Step 3: Get vendor's clients
    console.log('\n3️⃣  Fetching vendor clients...');
    const clientsRes = await fetch(`${API_URL}/clients/vendor/${vendor.id}`);
    const clientsData = await clientsRes.json();
    const clients = clientsData.data || clientsData || [];
    console.log(`   ✅ Found ${clients.length} clients`);
    
    if (clients.length > 0) {
      console.log(`      First client: ${clients[0].client_name} (ID: ${clients[0].id})`);
    }
    
    // Step 4: Create project WITHOUT client
    console.log('\n4️⃣  Creating project WITHOUT client...');
    const project1Payload = {
      project_name: `Test Project ${Date.now()}`,
      description: 'Testing vendor project creation',
      vendor_id: vendor.id,
      client_id: null,
      status: 'draft',
      budget: 5000,
    };
    
    const createRes1 = await fetch(`${API_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project1Payload),
    });
    
    if (!createRes1.ok) {
      const error = await createRes1.text();
      console.log(`   ❌ Failed: ${createRes1.status}`);
      console.log(`      Error: ${error}`);
      return;
    }
    
    const project1 = await createRes1.json();
    console.log(`   ✅ Project created successfully`);
    console.log(`      ID: ${project1.id || project1.data?.id}`);
    console.log(`      vendor_id: ${project1.vendor_id || project1.data?.vendor_id}`);
    
    // Step 5: Create project WITH client (if available)
    if (clients.length > 0) {
      console.log('\n5️⃣  Creating project WITH client...');
      const project2Payload = {
        project_name: `Test Project With Client ${Date.now()}`,
        description: 'Testing vendor project creation with client',
        vendor_id: vendor.id,
        client_id: clients[0].id,
        status: 'draft',
        budget: 10000,
      };
      
      const createRes2 = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project2Payload),
      });
      
      if (!createRes2.ok) {
        const error = await createRes2.text();
        console.log(`   ❌ Failed: ${createRes2.status}`);
        console.log(`      Error: ${error}`);
        return;
      }
      
      const project2 = await createRes2.json();
      console.log(`   ✅ Project created successfully`);
      console.log(`      ID: ${project2.id || project2.data?.id}`);
      console.log(`      vendor_id: ${project2.vendor_id || project2.data?.vendor_id}`);
      console.log(`      client_id: ${project2.client_id || project2.data?.client_id}`);
    }
    
    // Step 6: Verify projects by vendor
    console.log('\n6️⃣  Verifying projects by vendor...');
    const allProjectsRes = await fetch(`${API_URL}/projects`);
    const allProjectsData = await allProjectsRes.json();
    const allProjects = allProjectsData.data || allProjectsData || [];
    
    const vendorProjects = allProjects.filter(p => p.vendor_id === vendor.id);
    console.log(`   ✅ Vendor has ${vendorProjects.length} projects`);
    
    if (vendorProjects.length > 0) {
      console.log('   Projects:');
      vendorProjects.slice(0, 5).forEach(p => {
        console.log(`      - ${p.project_name} (Status: ${p.status}, Budget: ${p.budget})`);
      });
      if (vendorProjects.length > 5) {
        console.log(`      ... and ${vendorProjects.length - 5} more`);
      }
    }
    
    console.log('\n✅ ALL TESTS PASSED\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  }
}

testVendorProjectCreation();
