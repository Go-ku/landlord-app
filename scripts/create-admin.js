// scripts/create-admin.js - Create first admin user
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);
config({ path: join(projectRoot, '.env.local') });

// Import User model
let User;

async function loadUserModel() {
  try {
    User = (await import('../models/User.js')).default;
    console.log('✅ User model loaded');
  } catch (error) {
    console.error('❌ Failed to load User model:', error.message);
    process.exit(1);
  }
}

async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

async function createAdminUser() {
  console.log('🛡️  Creating First Admin User\n');

  await loadUserModel();
  await connectToDatabase();

  // Admin user details
  const adminData = {
    name: 'System Administrator',
    email: 'admin@landlordapp.com',
    password: 'Admin123!', // Change this!
    phone: '+260977123456',
    role: 'admin',
    adminLevel: 'super',
    permissions: [
      'manage_users',
      'manage_properties', 
      'manage_payments',
      'manage_invoices',
      'view_reports',
      'system_config'
    ],
    company: 'System Administration',
    isActive: true
  };

  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ 
      $or: [
        { email: adminData.email },
        { role: 'admin' }
      ]
    });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists:');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Role: ${existingAdmin.role}`);
      console.log(`   Admin Level: ${existingAdmin.adminLevel}`);
      console.log('\nIf you want to create a new admin, delete the existing one first.');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminData.password, 12);
    adminData.password = hashedPassword;

    // Create admin user
    const admin = await User.create(adminData);

    console.log('🎉 Admin user created successfully!\n');
    console.log('📧 Email:', adminData.email);
    console.log('🔑 Password:', 'Admin123!');
    console.log('🛡️  Admin Level:', adminData.adminLevel);
    console.log('⚡ Permissions:', adminData.permissions.join(', '));
    
    console.log('\n⚠️  IMPORTANT SECURITY NOTES:');
    console.log('1. 🔒 Change the default password immediately after first login');
    console.log('2. 🔐 Use a strong, unique password');
    console.log('3. 📱 Consider enabling two-factor authentication');
    console.log('4. 🗑️  Delete this script after use for security');

    console.log('\n🚀 Next Steps:');
    console.log('1. Go to /auth/signin');
    console.log('2. Sign in with the credentials above');
    console.log('3. You\'ll be redirected to /admin/dashboard');
    console.log('4. Start managing payments and invoices!');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    
    if (error.code === 11000) {
      console.log('💡 This might be a duplicate email error');
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n📝 Database connection closed');
  }
}