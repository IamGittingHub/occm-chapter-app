/**
 * Seed First Admin Script
 *
 * This script creates the first committee member who can then invite others.
 * Run this once before the app goes live.
 *
 * Usage:
 *   npx ts-node scripts/seed-first-admin.ts
 *
 * Or compile and run:
 *   npx tsc scripts/seed-first-admin.ts
 *   node scripts/seed-first-admin.js
 *
 * Make sure to set these environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

// Configuration - modify these values for your first admin
const ADMIN_CONFIG = {
  email: 'admin@example.com', // Change this!
  password: 'SecurePassword123!', // Change this!
  first_name: 'Admin',
  last_name: 'User',
  gender: 'male' as const, // 'male' or 'female'
  phone: '', // Optional
};

async function seedFirstAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: Missing environment variables');
    console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
    process.exit(1);
  }

  // Use service role key to bypass RLS
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('Creating first admin user...\n');

  // 1. Create auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: ADMIN_CONFIG.email,
    password: ADMIN_CONFIG.password,
    email_confirm: true, // Auto-confirm the email
  });

  if (authError) {
    console.error('Error creating auth user:', authError.message);
    process.exit(1);
  }

  console.log('✓ Auth user created');
  console.log(`  Email: ${ADMIN_CONFIG.email}`);
  console.log(`  User ID: ${authUser.user.id}\n`);

  // 2. Create committee member record
  const { data: committeeMember, error: memberError } = await supabase
    .from('committee_members')
    .insert({
      user_id: authUser.user.id,
      email: ADMIN_CONFIG.email,
      first_name: ADMIN_CONFIG.first_name,
      last_name: ADMIN_CONFIG.last_name,
      gender: ADMIN_CONFIG.gender,
      phone: ADMIN_CONFIG.phone || null,
      is_active: true,
    })
    .select()
    .single();

  if (memberError) {
    console.error('Error creating committee member:', memberError.message);
    // Clean up auth user if committee member creation failed
    await supabase.auth.admin.deleteUser(authUser.user.id);
    process.exit(1);
  }

  console.log('✓ Committee member created');
  console.log(`  Name: ${ADMIN_CONFIG.first_name} ${ADMIN_CONFIG.last_name}`);
  console.log(`  Gender: ${ADMIN_CONFIG.gender}`);
  console.log(`  Committee ID: ${committeeMember.id}\n`);

  // 3. Insert default app settings if they don't exist
  const defaultSettings = [
    { setting_key: 'unresponsive_threshold_days', setting_value: '30' },
    { setting_key: 'rotation_day_of_month', setting_value: '1' },
  ];

  for (const setting of defaultSettings) {
    await supabase.from('app_settings').upsert(setting, {
      onConflict: 'setting_key',
    });
  }

  console.log('✓ Default settings initialized\n');

  console.log('═'.repeat(50));
  console.log('SUCCESS! First admin has been created.');
  console.log('═'.repeat(50));
  console.log('\nYou can now log in with:');
  console.log(`  Email: ${ADMIN_CONFIG.email}`);
  console.log(`  Password: ${ADMIN_CONFIG.password}`);
  console.log('\nIMPORTANT: Change the password after first login!');
  console.log('\nNext steps:');
  console.log('  1. Log in to the app');
  console.log('  2. Import your members via CSV');
  console.log('  3. Invite other committee members');
  console.log('  4. Generate initial assignments\n');
}

seedFirstAdmin().catch(console.error);
