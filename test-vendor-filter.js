#!/usr/bin/env node

/**
 * Test the vendor filtering for projects 
 * 
 */

const vendorId = '7e454d52-07d8-431a-b101-6c77e57b0935';

async function testVendorFilter() {
  console.log('\n=== Testing Vendor Filter ===\n');

  // Test 1: GET all projects
  console.log('Test 1: GET /api/projects (all projects)');
  try {
    const response1 = await fetch('http://localhost:5000/api/projects');
    const data1 = await response1.json();
    console.log(`✅ Status: ${response1.status}`);
    console.log(`📊 Count: ${data1.count || data1.data?.length || 0}`);
    console.log(`🔍 First project vendor_id: ${data1.data?.[0]?.vendor_id || 'N/A'}`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }

  console.log('\n---\n');

  // Test 2: GET projects with vendor_id filter
  console.log(`Test 2: GET /api/projects?vendor_id=${vendorId}`);
  try {
    const url = `http://localhost:5000/api/projects?vendor_id=${encodeURIComponent(vendorId)}`;
    console.log(`🔗 URL: ${url}`);
    const response2 = await fetch(url);
    const data2 = await response2.json();
    console.log(`✅ Status: ${response2.status}`);
    console.log(`📊 Response structure:`, Object.keys(data2));
    console.log(`📊 Count: ${data2.count || data2.data?.length || 0}`);
    if (data2.data && data2.data.length > 0) {
      console.log(`🔍 Projects found:`);
      data2.data.forEach((p, idx) => {
        console.log(`   [${idx + 1}] ID: ${p.id}, Name: ${p.project_name}, Vendor: ${p.vendor_id}`);
      });
    } else {
      console.log(`❌ No projects returned`);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }

  console.log('\n---\n');

  // Test 3: Get profiles to verify vendor data
  console.log('Test 3: GET /api/profiles/search/vendor@demo.com');
  try {
    const response3 = await fetch('http://localhost:5000/api/profiles/search/vendor@demo.com');
    const data3 = await response3.json();
    console.log(`✅ Status: ${response3.status}`);
    if (data3.data && data3.data.length > 0) {
      const profile = data3.data[0];
      console.log(`🔍 Profile found:`);
      console.log(`   ID: ${profile.id}`);
      console.log(`   Email: ${profile.email}`);
      console.log(`   Vendor ID: ${profile.vendor_id}`);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

testVendorFilter();
