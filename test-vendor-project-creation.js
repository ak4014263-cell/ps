#!/usr/bin/env node
/**
 * Vendor Project Creation End-to-End Test
 * Tests the complete flow from vendor lookup to project creation
 */

const API_URL = 'http://localhost:5000/api';

async function test() {
  console.log('\n' + '='.repeat(60));
  console.log('VENDOR PROJECT CREATION - END-TO-END TEST');
  console.log('='.repeat(60) + '\n');
  
  try {
    // Step 1: Find a vendor user
    console.log('📋 STEP 1: Finding vendor user...');
    const profilesRes = await fetch(`${API_URL}/profiles`);
    const profilesData = await profilesRes.json();
    
    if (!profilesData.data?.length) {
      console.error('❌ No profiles found in database');
      return;
    }
    
    const vendorProfile = profilesData.data.find(p => p.vendor_id);
    if (!vendorProfile) {
      console.error('❌ No vendor user found (no vendor_id in any profile)');
      console.log('Profiles found:', profilesData.data.map(p => ({ id: p.id, email: p.email, vendor_id: p.vendor_id })));
      return;
    }
    
    console.log(`✅ Found vendor user:`);
    console.log(`   ID: ${vendorProfile.id}`);
    console.log(`   Email: ${vendorProfile.email}`);
    console.log(`   Vendor ID: ${vendorProfile.vendor_id}\n`);
    
    // Step 2: Get clients for this vendor
    console.log('📋 STEP 2: Loading clients for vendor...');
    const clientsRes = await fetch(`${API_URL}/clients/vendor/${vendorProfile.vendor_id}`);
    const clientsData = await clientsRes.json();
    
    console.log(`✅ Clients API response:`, clientsData.data?.length > 0 ? `${clientsData.data.length} clients found` : 'No clients');
    if (clientsData.data?.length > 0) {
      console.log(`   First client: ${clientsData.data[0].client_name || clientsData.data[0].id}`);
    }
    console.log();
    
    // Step 3: Test project creation WITHOUT client
    console.log('📋 STEP 3: Creating project WITHOUT client...');
    const projectPayload1 = {
      project_name: `Test Project [NO CLIENT] ${new Date().toISOString().split('T')[1].split('.')[0]}`,
      description: 'Test project creation without client',
      vendor_id: vendorProfile.vendor_id,
      client_id: null,
      status: 'draft',
    };
    
    console.log(`Payload:`, JSON.stringify(projectPayload1, null, 2));
    
    const createRes1 = await fetch(`${API_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectPayload1)
    });
    
    const createData1 = await createRes1.json();
    
    if (createRes1.ok) {
      console.log(`✅ SUCCESS: Project created`);
      console.log(`   Project ID: ${createData1.data?.id}`);
      console.log(`   Project Name: ${createData1.data?.project_name}\n`);
    } else {
      console.error(`❌ FAILED: ${createRes1.status} ${createRes1.statusText}`);
      console.error(`   Error: ${createData1.error || JSON.stringify(createData1)}\n`);
    }
    
    // Step 4: Test project creation WITH client (if available)
    if (clientsData.data?.length > 0) {
      console.log('📋 STEP 4: Creating project WITH client...');
      const projectPayload2 = {
        project_name: `Test Project [WITH CLIENT] ${new Date().toISOString().split('T')[1].split('.')[0]}`,
        description: 'Test project creation with client',
        vendor_id: vendorProfile.vendor_id,
        client_id: clientsData.data[0].id,
        status: 'draft',
      };
      
      console.log(`Payload:`, JSON.stringify(projectPayload2, null, 2));
      
      const createRes2 = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectPayload2)
      });
      
      const createData2 = await createRes2.json();
      
      if (createRes2.ok) {
        console.log(`✅ SUCCESS: Project created`);
        console.log(`   Project ID: ${createData2.data?.id}`);
        console.log(`   Project Name: ${createData2.data?.project_name}\n`);
      } else {
        console.error(`❌ FAILED: ${createRes2.status} ${createRes2.statusText}`);
        console.error(`   Error: ${createData2.error || JSON.stringify(createData2)}\n`);
      }
    }
    
    // Step 5: Verify projects were created
    console.log('📋 STEP 5: Verifying projects...');
    const projectsRes = await fetch(`${API_URL}/projects`);
    const projectsData = await projectsRes.json();
    
    const vendorProjects = projectsData.data?.filter(p => p.vendor_id === vendorProfile.vendor_id) || [];
    console.log(`✅ Total projects in system: ${projectsData.data?.length}`);
    console.log(`✅ Projects for this vendor: ${vendorProjects.length}`);
    
    if (vendorProjects.length > 0) {
      console.log(`   Recently created:`);
      vendorProjects.slice(-2).forEach(p => {
        console.log(`   - ${p.project_name} (${p.status})`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST COMPLETE');
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('❌ TEST FAILED WITH ERROR:', error.message);
    console.error(error);
  }
}

test();
