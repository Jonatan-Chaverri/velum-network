import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config();

console.log('🔍 Checking database configuration...\n');

const envPath = join(process.cwd(), '.env');
let envContent = '';

try {
  envContent = readFileSync(envPath, 'utf-8');
} catch (err) {
  console.error('❌ Could not read .env file');
  process.exit(1);
}

const hasSupabaseUrl = !!process.env.SUPABASE_URL;
const hasDatabaseUrl = !!process.env.DATABASE_URL;
const hasDbPassword = !!process.env.SUPABASE_DB_PASSWORD;

console.log('Configuration status:');
console.log(`  SUPABASE_URL: ${hasSupabaseUrl ? '✓ Set' : '✗ Not set'}`);
console.log(`  DATABASE_URL: ${hasDatabaseUrl ? '✓ Set' : '✗ Not set'}`);
console.log(`  SUPABASE_DB_PASSWORD: ${hasDbPassword ? '✓ Set' : '✗ Not set'}\n`);

if (hasDatabaseUrl) {
  console.log('✅ You have DATABASE_URL configured - automatic migrations should work!');
  process.exit(0);
}

if (hasSupabaseUrl && hasDbPassword) {
  console.log('✅ You have SUPABASE_URL and SUPABASE_DB_PASSWORD configured - automatic migrations should work!');
  process.exit(0);
}

if (!hasSupabaseUrl) {
  console.log('❌ SUPABASE_URL is not set in your .env file');
  console.log('   Add: SUPABASE_URL=https://[your-project-ref].supabase.co\n');
}

if (!hasDbPassword && !hasDatabaseUrl) {
  console.log('📝 To enable automatic migrations, add one of these to your .env file:\n');
  console.log('   Option 1 (Recommended - simpler):');
  console.log('   SUPABASE_DB_PASSWORD=your_database_password\n');
  console.log('   Option 2 (Full connection string):');
  console.log('   DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres\n');
  console.log('   📍 Get your database password from:');
  console.log('      Supabase Dashboard > Settings > Database > Database password\n');
  console.log('   💡 If you forgot your password, you can reset it in the same location.');
}

