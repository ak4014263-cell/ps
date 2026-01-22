#!/usr/bin/env node
/**
 * Populate vendor_id for vendor users
 * Links vendor users to their corresponding vendor records
 */

import { getOne, getAll, execute } from './backend/db.js';

async function migrateVendorIds() {
  console.log('\n' + '='.repeat(60));
  console.log('VENDOR_ID POPULATION MIGRATION');
  console.log('='.repeat(60) + '\n');
  
  try {
    // Step 1: Get all vendors and their user_id
    console.log('📋 Step 1: Fetching vendors with user_id...');
    const vendors = await getAll(`
      SELECT id, user_id, business_name FROM vendors WHERE user_id IS NOT NULL
    `);
    console.log(`✅ Found ${vendors.length} vendors with user_id\n`);
    
    // Step 2: Get all vendor staff
    console.log('📋 Step 2: Fetching vendor staff...');
    const staffLinks = await getAll(`
      SELECT vendor_id, user_id, role FROM vendor_staff
    `);
    console.log(`✅ Found ${staffLinks.length} vendor staff links\n`);
    
    // Step 3: Update vendor_id for vendor owners
    console.log('📋 Step 3: Updating vendor owners...');
    let vendorOwnersUpdated = 0;
    for (const vendor of vendors) {
      try {
        await execute(
          `UPDATE profiles SET vendor_id = ? WHERE id = ?`,
          [vendor.id, vendor.user_id]
        );
        console.log(`✅ Vendor owner (${vendor.business_name}): ${vendor.user_id} -> ${vendor.id}`);
        vendorOwnersUpdated++;
      } catch (err) {
        console.error(`❌ Failed to update vendor owner ${vendor.user_id}:`, err.message);
      }
    }
    console.log(`\n✅ Updated ${vendorOwnersUpdated} vendor owners\n`);
    
    // Step 4: Update vendor_id for vendor staff
    console.log('📋 Step 4: Updating vendor staff...');
    let staffUpdated = 0;
    for (const staff of staffLinks) {
      try {
        await execute(
          `UPDATE profiles SET vendor_id = ? WHERE id = ?`,
          [staff.vendor_id, staff.user_id]
        );
        console.log(`✅ Vendor staff (${staff.role}): ${staff.user_id} -> ${staff.vendor_id}`);
        staffUpdated++;
      } catch (err) {
        console.error(`❌ Failed to update vendor staff ${staff.user_id}:`, err.message);
      }
    }
    console.log(`\n✅ Updated ${staffUpdated} vendor staff\n`);
    
    // Step 5: Verify the migration
    console.log('📋 Step 5: Verifying migration...');
    const profilesWithVendor = await getAll(`
      SELECT id, email, vendor_id FROM profiles WHERE vendor_id IS NOT NULL
    `);
    console.log(`✅ Found ${profilesWithVendor.length} profiles with vendor_id set\n`);
    
    if (profilesWithVendor.length > 0) {
      console.log('Sample of migrated profiles:');
      profilesWithVendor.slice(0, 5).forEach(p => {
        console.log(`   - ${p.email}: vendor_id = ${p.vendor_id}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRATION COMPLETE');
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

migrateVendorIds();
