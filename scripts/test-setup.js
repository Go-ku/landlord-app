// scripts/test-setup.js - Run this to verify your setup
// Usage: node scripts/test-setup.js

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Property from '../models/Property.js';
import Lease from '../models/Lease.js';

// Test configuration
const TEST_CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/your-db',
  TEST_EMAIL: 'test@example.com',
  TEST_PASSWORD: 'password123'
};

async function testDatabaseConnection() {
  console.log('🔗 Testing database connection...');
  try {
    await mongoose.connect(TEST_CONFIG.MONGODB_URI);
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function testUserModel() {
  console.log('👤 Testing User model...');
  try {
    // Check if User model works
    const userCount = await User.countDocuments();
    console.log(`✅ User model works. Found ${userCount} users`);
    
    // Check if we have users with roles
    const rolesCheck = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    
    console.log('📊 User roles distribution:', rolesCheck);
    
    if (rolesCheck.length === 0) {
      console.log('⚠️  No users found. Creating test users...');
      await createTestUsers();
    }
    
    return true;
  } catch (error) {
    console.error('❌ User model test failed:', error.message);
    return false;
  }
}

async function testPropertyModel() {
  console.log('🏠 Testing Property model...');
  try {
    const propertyCount = await Property.countDocuments();
    console.log(`✅ Property model works. Found ${propertyCount} properties`);
    
    if (propertyCount === 0) {
      console.log('⚠️  No properties found. Creating test property...');
      await createTestProperty();
    }
    
    return true;
  } catch (error) {
    console.error('❌ Property model test failed:', error.message);
    return false;
  }
}

async function testAggregation() {
  console.log('📊 Testing property aggregation...');
  try {
    const result = await Property.aggregate([
      {
        $lookup: {
          from: 'leases',
          localField: '_id',
          foreignField: 'propertyId',
          as: 'leases'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'landlord',
          foreignField: '_id',
          as: 'landlordInfo'
        }
      },
      {
        $addFields: {
          totalLeases: { $size: '$leases' },
          landlordName: {
            $ifNull: [
              { $arrayElemAt: ['$landlordInfo.name', 0] },
              'Unknown'
            ]
          }
        }
      },
      { $limit: 1 }
    ]);
    
    console.log('✅ Aggregation works:', result.length > 0 ? 'Has data' : 'No data');
    if (result.length > 0) {
      console.log('📋 Sample result:', {
        address: result[0].address,
        landlordName: result[0].landlordName,
        totalLeases: result[0].totalLeases
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Aggregation test failed:', error.message);
    return false;
  }
}

async function createTestUsers() {
  console.log('👥 Creating test users...');
  
  const testUsers = [
    {
      name: 'Test Landlord',
      email: 'landlord@test.com',
      password: await bcrypt.hash('password123', 12),
      role: 'landlord',
      isActive: true
    },
    {
      name: 'Test Manager',
      email: 'manager@test.com', 
      password: await bcrypt.hash('password123', 12),
      role: 'manager',
      isActive: true
    },
    {
      name: 'Test Tenant',
      email: 'tenant@test.com',
      password: await bcrypt.hash('password123', 12),
      role: 'tenant',
      isActive: true
    }
  ];
  
  try {
    for (const userData of testUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        await User.create(userData);
        console.log(`✅ Created ${userData.role}: ${userData.email}`);
      } else {
        console.log(`⚠️  User already exists: ${userData.email}`);
      }
    }
  } catch (error) {
    console.error('❌ Failed to create test users:', error.message);
  }
}

async function createTestProperty() {
  console.log('🏡 Creating test property...');
  
  try {
    // Find a landlord to assign the property to
    const landlord = await User.findOne({ role: 'landlord' });
    if (!landlord) {
      console.log('⚠️  No landlord found to create property for');
      return;
    }
    
    const testProperty = {
      address: '123 Test Street, Test City',
      type: 'Apartment',
      monthlyRent: 1500,
      bedrooms: 2,
      bathrooms: 2,
      squareFeet: 1000,
      landlord: landlord._id,
      description: 'Test property for development',
      isAvailable: true
    };
    
    const property = await Property.create(testProperty);
    console.log('✅ Created test property:', property.address);
  } catch (error) {
    console.error('❌ Failed to create test property:', error.message);
  }
}

async function testRoleQueries() {
  console.log('🔐 Testing role-based queries...');
  
  try {
    // Test landlord query
    const landlord = await User.findOne({ role: 'landlord' });
    if (landlord) {
      const landlordProperties = await Property.find({ landlord: landlord._id });
      console.log(`✅ Landlord query: Found ${landlordProperties.length} properties for ${landlord.name}`);
    }
    
    // Test manager query (all properties)
    const allProperties = await Property.find({});
    console.log(`✅ Manager query: Found ${allProperties.length} total properties`);
    
    return true;
  } catch (error) {
    console.error('❌ Role query test failed:', error.message);
    return false;
  }
}

async function testEnvironmentVariables() {
  console.log('🔧 Checking environment variables...');
  
  const requiredVars = [
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL', 
    'MONGODB_URI'
  ];
  
  let allSet = true;
  
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      console.log(`✅ ${varName}: Set`);
    } else {
      console.log(`❌ ${varName}: Missing`);
      allSet = false;
    }
  }
  
  return allSet;
}

async function runAllTests() {
  console.log('🧪 Starting Role-Based Access Setup Tests\n');
  
  const tests = [
    { name: 'Environment Variables', test: testEnvironmentVariables },
    { name: 'Database Connection', test: testDatabaseConnection },
    { name: 'User Model', test: testUserModel },
    { name: 'Property Model', test: testPropertyModel },
    { name: 'Aggregation', test: testAggregation },
    { name: 'Role Queries', test: testRoleQueries }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const { name, test } of tests) {
    console.log(`\n--- ${name} ---`);
    try {
      const result = await test();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`❌ ${name} failed:`, error.message);
      failed++;
    }
  }
  
  console.log('\n📋 Test Summary:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed! Your setup looks good.');
    console.log('\n🔑 Test Credentials:');
    console.log('Landlord: landlord@test.com / password123');
    console.log('Manager: manager@test.com / password123');
    console.log('Tenant: tenant@test.com / password123');
  } else {
    console.log('⚠️  Some tests failed. Check the errors above.');
  }
  
  await mongoose.disconnect();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { runAllTests, testDatabaseConnection, testUserModel, testPropertyModel };

// package.json script addition:
// "scripts": {
//   "test:setup": "node scripts/test-setup.js"
// }