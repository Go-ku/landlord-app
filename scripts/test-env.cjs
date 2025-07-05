// scripts/test-env.cjs - Test if environment variables are loaded correctly
require('dotenv').config({ path: '.env.local' });

console.log('🔍 Testing Environment Variables...');
console.log('');

const requiredVars = [
  'MTN_API_BASE_URL',
  'MTN_API_USER', 
  'MTN_API_KEY',
  'MTN_SUBSCRIPTION_KEY'
];

let allVarsPresent = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 20)}${value.length > 20 ? '...' : ''}`);
  } else {
    console.log(`❌ ${varName}: NOT SET`);
    allVarsPresent = false;
  }
});

console.log('');

if (allVarsPresent) {
  console.log('🎉 All required environment variables are set!');
  console.log('💡 You can now run: node scripts/setup-momo.cjs');
} else {
  console.log('⚠️  Some environment variables are missing.');
  console.log('');
  console.log('📝 Please ensure your .env file contains:');
  console.log('');
  console.log('MTN_API_BASE_URL=https://sandbox.momoapi.mtn.com');
  console.log('MTN_API_USER=zmapp');
  console.log('MTN_API_KEY=2c07246e76dd473a9d8da69466b68de5');
  console.log('MTN_SUBSCRIPTION_KEY=0c21cffd97ab433eb76112e5d60ec4db');
  console.log('NEXT_PUBLIC_APP_URL=http://localhost:3000');
}

console.log('');
console.log('📁 Current working directory:', process.cwd());
console.log('📁 Looking for .env.local file at:', require('path').join(process.cwd(), '.env.local'));

// Check if .env.local file exists
const fs = require('fs');
const path = require('path');
const envPath = path.join(process.cwd(), '.env.local');

if (fs.existsSync(envPath)) {
  console.log('✅ .env.local file found');
} else {
  console.log('❌ .env.local file not found at expected location');
  console.log('💡 Make sure your .env.local file is in the root directory of your project');
}