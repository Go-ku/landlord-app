// scripts/seedDatabase.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// User Schema
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'landlord' },
    createdAt: { type: Date, default: Date.now }
  });
  
  // Property Schema
  const PropertySchema = new mongoose.Schema({
    address: { type: String, required: true },
    type: { type: String, required: true },
    rent: { type: Number, required: true },
    bedrooms: { type: Number },
    bathrooms: { type: Number },
    squareFeet: { type: Number },
    description: { type: String },
    landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  });
  
  // Tenant Schema
  const TenantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    dateOfBirth: { type: Date },
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String
    },
    employment: {
      employer: String,
      position: String,
      monthlyIncome: Number
    },
    currentProperty: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
    leaseStartDate: { type: Date },
    leaseEndDate: { type: Date },
    monthlyRent: { type: Number, required: true },
    securityDeposit: { type: Number },
    status: { 
      type: String, 
      enum: ['Active', 'Former', 'Applicant'], 
      default: 'Active' 
    },
    landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String },
    createdAt: { type: Date, default: Date.now }
  });
  
  // Payment Schema
  const PaymentSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    paymentType: { 
      type: String, 
      enum: ['Rent', 'Security Deposit', 'Late Fee', 'Utilities', 'Other'], 
      default: 'Rent' 
    },
    paymentMethod: { 
      type: String, 
      enum: ['Cash', 'Check', 'Bank Transfer', 'Credit Card', 'Online Payment'], 
      default: 'Online Payment' 
    },
    status: { 
      type: String, 
      enum: ['Pending', 'Paid', 'Overdue', 'Partial'], 
      default: 'Pending' 
    },
    dueDate: { type: Date, required: true },
    paidDate: { type: Date },
    transactionId: { type: String },
    notes: { type: String },
    lateFee: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
  });
  
  // Maintenance Schema
  const MaintenanceSchema = new mongoose.Schema({
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    title: { type: String, required: true },
    description: { type: String, required: true },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' },
    dateReported: { type: Date, default: Date.now },
    dateCompleted: { type: Date },
    images: [{ type: String }],
    landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  });
  
  // Create models
  const User = mongoose.models.User || mongoose.model('User', UserSchema);
  const Property = mongoose.models.Property || mongoose.model('Property', PropertySchema);
  const Tenant = mongoose.models.Tenant || mongoose.model('Tenant', TenantSchema);
  const Payment = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
  const Maintenance = mongoose.models.Maintenance || mongoose.model('Maintenance', MaintenanceSchema);
  
  // Sample Users (Landlords)
  const sampleUsers = [
    {
      name: "John Smith",
      email: "john.smith@realestate.com",
      password: "hashedPassword123",
      role: "landlord"
    },
    {
      name: "Sarah Johnson",
      email: "sarah.johnson@properties.com", 
      password: "hashedPassword456",
      role: "landlord"
    },
    {
      name: "Mike Davis",
      email: "mike.davis@landlord.com",
      password: "hashedPassword789",
      role: "landlord"
    }
  ];
  
  // Sample Properties
  const sampleProperties = [
    {
      address: "123 Main St, Springfield",
      type: "Apartment",
      bedrooms: 2,
      bathrooms: 1,
      squareFeet: 850,
      rent: 1200,
      description: "Cozy downtown apartment with great views"
    },
    {
      address: "456 Oak Ave, Springfield",
      type: "House", 
      bedrooms: 3,
      bathrooms: 2,
      squareFeet: 1500,
      rent: 1800,
      description: "Spacious family home with backyard"
    },
    {
      address: "789 Pine Street, Springfield",
      type: "Condo",
      bedrooms: 2,
      bathrooms: 2,
      squareFeet: 1100,
      rent: 1600,
      description: "Modern condo with city views and amenities"
    },
    {
      address: "321 Elm Drive, Springfield",
      type: "Apartment",
      bedrooms: 1,
      bathrooms: 1,
      squareFeet: 600,
      rent: 950,
      description: "Affordable studio apartment perfect for young professionals"
    },
    {
      address: "654 Maple Lane, Springfield",
      type: "House",
      bedrooms: 4,
      bathrooms: 3,
      squareFeet: 2200,
      rent: 2500,
      description: "Large family home with garage and garden"
    },
    {
      address: "987 Cedar Court, Springfield",
      type: "Townhouse",
      bedrooms: 3,
      bathrooms: 2.5,
      squareFeet: 1800,
      rent: 2100,
      description: "Modern townhouse in quiet neighborhood"
    }
  ];
  
  // Sample Tenants
  const sampleTenants = [
    {
      name: "Emily Rodriguez",
      email: "emily.rodriguez@email.com",
      phone: "555-0101",
      dateOfBirth: new Date("1992-03-15"),
      emergencyContact: {
        name: "Maria Rodriguez",
        phone: "555-0102",
        relationship: "Mother"
      },
      employment: {
        employer: "Tech Solutions Inc",
        position: "Software Developer",
        monthlyIncome: 5500
      },
      leaseStartDate: new Date("2024-01-01"),
      leaseEndDate: new Date("2024-12-31"),
      securityDeposit: 1200,
      status: "Active",
      notes: "Excellent tenant, always pays on time"
    },
    {
      name: "David Chen",
      email: "david.chen@email.com",
      phone: "555-0201",
      dateOfBirth: new Date("1988-07-22"),
      emergencyContact: {
        name: "Lisa Chen",
        phone: "555-0202",
        relationship: "Wife"
      },
      employment: {
        employer: "Springfield Hospital",
        position: "Nurse",
        monthlyIncome: 4200
      },
      leaseStartDate: new Date("2023-09-01"),
      leaseEndDate: new Date("2024-08-31"),
      securityDeposit: 1800,
      status: "Active",
      notes: "Healthcare professional, very responsible"
    },
    {
      name: "Jessica Thompson",
      email: "jessica.thompson@email.com",
      phone: "555-0301",
      dateOfBirth: new Date("1995-11-08"),
      emergencyContact: {
        name: "Robert Thompson",
        phone: "555-0302",
        relationship: "Father"
      },
      employment: {
        employer: "Springfield University",
        position: "Graduate Student",
        monthlyIncome: 2800
      },
      leaseStartDate: new Date("2024-02-01"),
      leaseEndDate: new Date("2025-01-31"),
      securityDeposit: 1600,
      status: "Active",
      notes: "Student, has guarantor"
    },
    {
      name: "Michael Brown",
      email: "michael.brown@email.com",
      phone: "555-0401",
      dateOfBirth: new Date("1990-05-30"),
      emergencyContact: {
        name: "Sarah Brown",
        phone: "555-0402",
        relationship: "Sister"
      },
      employment: {
        employer: "Local Bank",
        position: "Financial Advisor",
        monthlyIncome: 3800
      },
      leaseStartDate: new Date("2024-03-01"),
      leaseEndDate: new Date("2025-02-28"),
      securityDeposit: 950,
      status: "Active",
      notes: "Works in finance, very organized"
    },
    {
      name: "Amanda Wilson",
      email: "amanda.wilson@email.com",
      phone: "555-0501",
      dateOfBirth: new Date("1987-12-12"),
      emergencyContact: {
        name: "James Wilson",
        phone: "555-0502",
        relationship: "Husband"
      },
      employment: {
        employer: "Marketing Plus",
        position: "Marketing Manager",
        monthlyIncome: 6200
      },
      leaseStartDate: new Date("2023-11-01"),
      leaseEndDate: new Date("2024-10-31"),
      securityDeposit: 2500,
      status: "Active",
      notes: "Family with two children"
    },
    {
      name: "Robert Taylor",
      email: "robert.taylor@email.com",
      phone: "555-0601",
      dateOfBirth: new Date("1985-04-18"),
      emergencyContact: {
        name: "Nancy Taylor",
        phone: "555-0602",
        relationship: "Mother"
      },
      employment: {
        employer: "Construction Co",
        position: "Project Manager",
        monthlyIncome: 5800
      },
      leaseStartDate: new Date("2024-01-15"),
      leaseEndDate: new Date("2025-01-14"),
      securityDeposit: 2100,
      status: "Active",
      notes: "Works in construction, prefers direct communication"
    }
  ];
  
  // Sample Maintenance Requests
  const sampleMaintenanceRequests = [
    {
      title: "Leaky Kitchen Faucet",
      description: "The kitchen faucet has been dripping constantly for the past week. Water pressure seems low as well.",
      priority: "Medium",
      status: "Pending"
    },
    {
      title: "Broken Air Conditioning",
      description: "AC unit stopped working yesterday. No cool air coming out despite being set to cool.",
      priority: "High", 
      status: "In Progress"
    },
    {
      title: "Clogged Bathroom Drain",
      description: "Bathroom sink drains very slowly. Suspect there might be a blockage.",
      priority: "Low",
      status: "Pending"
    },
    {
      title: "Front Door Lock Malfunction",
      description: "Key gets stuck in the front door lock. Sometimes cannot unlock the door.",
      priority: "High",
      status: "Completed",
      dateCompleted: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    {
      title: "Garage Door Remote Not Working",
      description: "Garage door remote stopped responding. Manual operation still works.",
      priority: "Medium",
      status: "In Progress"
    },
    {
      title: "Ceiling Water Stain",
      description: "Brown water stain appeared on bedroom ceiling. Possible roof leak.",
      priority: "High",
      status: "Pending"
    }
  ];
  
  // Helper function to generate payment history
  function generatePaymentHistory(tenant, property, landlord, months = 6) {
    const payments = [];
    const currentDate = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const paidDate = new Date(dueDate);
      
      // Simulate payment patterns
      let status = 'Paid';
      let paymentMethod = 'Online Payment';
      let lateFee = 0;
      
      // Some variation in payment patterns
      if (i === 0) {
        // Current month - might be pending
        status = Math.random() > 0.7 ? 'Pending' : 'Paid';
        if (status === 'Paid') {
          paidDate.setDate(Math.floor(Math.random() * 5) + 1); // Paid 1-5 days after due
        }
      } else {
        // Past months
        const randomness = Math.random();
        if (randomness > 0.9) {
          // 10% chance of late payment
          status = 'Paid';
          paidDate.setDate(Math.floor(Math.random() * 10) + 5); // Paid 5-15 days late
          lateFee = 50;
        } else {
          // On time payment
          paidDate.setDate(Math.floor(Math.random() * 3) + 1); // Paid 1-3 days after due
        }
      }
      
      // Vary payment methods
      const methods = ['Online Payment', 'Bank Transfer', 'Check', 'Cash'];
      paymentMethod = methods[Math.floor(Math.random() * methods.length)];
      
      payments.push({
        tenantId: tenant._id,
        propertyId: property._id,
        landlordId: landlord._id,
        amount: tenant.monthlyRent,
        paymentType: 'Rent',
        paymentMethod: paymentMethod,
        status: status,
        dueDate: dueDate,
        paidDate: status === 'Paid' ? paidDate : null,
        transactionId: status === 'Paid' ? `TXN${Date.now()}${Math.floor(Math.random() * 1000)}` : null,
        lateFee: lateFee,
        notes: lateFee > 0 ? 'Late payment fee applied' : null
      });
    }
    
    return payments;
  }
  
  async function connectToDatabase() {
    try {
      const MONGODB_URI = process.env.MONGODB_URI;
      
      if (!MONGODB_URI) {
        throw new Error('MONGODB_URI environment variable is not defined in .env.local file');
      }
  
      await mongoose.connect(MONGODB_URI);
      console.log('✅ Connected to MongoDB successfully');
      return true;
    } catch (error) {
      console.error('❌ MongoDB connection error:', error.message);
      return false;
    }
  }
  
  async function clearDatabase() {
    try {
      console.log('\n🗑️  Clearing existing data...');
      
      await User.deleteMany({});
      await Property.deleteMany({});
      await Tenant.deleteMany({});
      await Payment.deleteMany({});
      await Maintenance.deleteMany({});
      
      console.log('✅ Database cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing database:', error.message);
      throw error;
    }
  }
  
  async function seedUsers() {
    try {
      console.log('\n👤 Creating users...');
      
      const users = await User.insertMany(sampleUsers);
      console.log(`✅ Created ${users.length} users:`);
      users.forEach(user => {
        console.log(`   - ${user.name} (${user.email}) - ID: ${user._id}`);
      });
      
      return users;
    } catch (error) {
      console.error('❌ Error creating users:', error.message);
      throw error;
    }
  }
  
  async function seedProperties(users) {
    try {
      console.log('\n🏠 Creating properties...');
      
      const propertiesWithLandlords = sampleProperties.map((property, index) => ({
        ...property,
        landlordId: users[index % users.length]._id
      }));
      
      const properties = await Property.insertMany(propertiesWithLandlords);
      console.log(`✅ Created ${properties.length} properties:`);
      properties.forEach(property => {
        const landlord = users.find(user => user._id.toString() === property.landlordId.toString());
        console.log(`   - ${property.address} ($${property.rent}/month) - Owner: ${landlord.name}`);
      });
      
      return properties;
    } catch (error) {
      console.error('❌ Error creating properties:', error.message);
      throw error;
    }
  }
  
  async function seedTenants(users, properties) {
    try {
      console.log('\n👥 Creating tenants...');
      
      const tenantsWithRefs = sampleTenants.map((tenant, index) => {
        const property = properties[index];
        const landlord = users.find(user => user._id.toString() === property.landlordId.toString());
        
        return {
          ...tenant,
          currentProperty: property._id,
          landlordId: landlord._id,
          monthlyRent: property.rent
        };
      });
      
      const tenants = await Tenant.insertMany(tenantsWithRefs);
      console.log(`✅ Created ${tenants.length} tenants:`);
      tenants.forEach(tenant => {
        const property = properties.find(p => p._id.toString() === tenant.currentProperty.toString());
        console.log(`   - ${tenant.name} (${tenant.email}) - Lives at: ${property.address}`);
      });
      
      return tenants;
    } catch (error) {
      console.error('❌ Error creating tenants:', error.message);
      throw error;
    }
  }
  
  async function seedPayments(users, properties, tenants) {
    try {
      console.log('\n💰 Creating payment history...');
      
      let allPayments = [];
      
      tenants.forEach(tenant => {
        const property = properties.find(p => p._id.toString() === tenant.currentProperty.toString());
        const landlord = users.find(u => u._id.toString() === tenant.landlordId.toString());
        
        const payments = generatePaymentHistory(tenant, property, landlord, 6);
        allPayments = allPayments.concat(payments);
      });
      
      const payments = await Payment.insertMany(allPayments);
      console.log(`✅ Created ${payments.length} payment records:`);
      
      // Group by status for summary
      const paymentsByStatus = payments.reduce((acc, payment) => {
        acc[payment.status] = (acc[payment.status] || 0) + 1;
        return acc;
      }, {});
      
      Object.entries(paymentsByStatus).forEach(([status, count]) => {
        console.log(`   - ${status}: ${count} payments`);
      });
      
      return payments;
    } catch (error) {
      console.error('❌ Error creating payments:', error.message);
      throw error;
    }
  }
  
  async function seedMaintenanceRequests(users, properties, tenants) {
    try {
      console.log('\n🔧 Creating maintenance requests...');
      
      const maintenanceWithRefs = sampleMaintenanceRequests.map((maintenance, index) => {
        const property = properties[index % properties.length];
        const tenant = tenants.find(t => t.currentProperty.toString() === property._id.toString());
        
        return {
          ...maintenance,
          propertyId: property._id,
          tenantId: tenant ? tenant._id : null,
          landlordId: property.landlordId
        };
      });
      
      const maintenanceRequests = await Maintenance.insertMany(maintenanceWithRefs);
      console.log(`✅ Created ${maintenanceRequests.length} maintenance requests:`);
      maintenanceRequests.forEach(request => {
        const property = properties.find(p => p._id.toString() === request.propertyId.toString());
        const tenant = tenants.find(t => t._id.toString() === (request.tenantId?.toString() || ''));
        console.log(`   - ${request.title} at ${property.address} (${request.status})${tenant ? ` - Reported by: ${tenant.name}` : ''}`);
      });
      
      return maintenanceRequests;
    } catch (error) {
      console.error('❌ Error creating maintenance requests:', error.message);
      throw error;
    }
  }
  
  async function generateSummary(users, properties, tenants, payments, maintenanceRequests) {
    console.log('\n📊 Database Seeding Summary:');
    console.log('================================');
    console.log(`👥 Users: ${users.length}`);
    console.log(`🏠 Properties: ${properties.length}`);
    console.log(`👤 Tenants: ${tenants.length}`);
    console.log(`💰 Payments: ${payments.length}`);
    console.log(`🔧 Maintenance Requests: ${maintenanceRequests.length}`);
    
    console.log('\n💰 Revenue Summary:');
    const totalMonthlyRent = properties.reduce((sum, property) => sum + property.rent, 0);
    const paidPayments = payments.filter(p => p.status === 'Paid');
    const totalPaidAmount = paidPayments.reduce((sum, payment) => sum + payment.amount + payment.lateFee, 0);
    const pendingAmount = payments.filter(p => p.status === 'Pending').reduce((sum, payment) => sum + payment.amount, 0);
    
    console.log(`Total Monthly Rent: $${totalMonthlyRent.toLocaleString()}`);
    console.log(`Total Paid: $${totalPaidAmount.toLocaleString()}`);
    console.log(`Pending Payments: $${pendingAmount.toLocaleString()}`);
    
    console.log('\n👥 Tenant Summary:');
    const tenantsByStatus = tenants.reduce((acc, tenant) => {
      acc[tenant.status] = (acc[tenant.status] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(tenantsByStatus).forEach(([status, count]) => {
      console.log(`${status}: ${count}`);
    });
    
    console.log('\n💳 Payment Summary:');
    const paymentsByStatus = payments.reduce((acc, payment) => {
      acc[payment.status] = (acc[payment.status] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(paymentsByStatus).forEach(([status, count]) => {
      console.log(`${status}: ${count}`);
    });
    
    console.log('\n🔧 Maintenance Summary:');
    const maintenanceByStatus = maintenanceRequests.reduce((acc, request) => {
      acc[request.status] = (acc[request.status] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(maintenanceByStatus).forEach(([status, count]) => {
      console.log(`${status}: ${count}`);
    });
    
    console.log('\n🎯 API Endpoints to Test:');
    console.log('1. http://localhost:3000/api/users');
    console.log('2. http://localhost:3000/api/properties');
    console.log('3. http://localhost:3000/api/tenants');
    console.log('4. http://localhost:3000/api/payments');
    console.log('5. http://localhost:3000/api/maintenance');
    console.log('6. http://localhost:3000/api/dashboard/stats');
  }
  
  async function seedDatabase() {
    console.log('🌱 Starting complete database seeding...');
    console.log('=====================================');
    
    try {
      const connected = await connectToDatabase();
      if (!connected) {
        process.exit(1);
      }
      
      if (process.argv.includes('--clear')) {
        await clearDatabase();
      }
      
      // Seed data in dependency order
      const users = await seedUsers();
      const properties = await seedProperties(users);
      const tenants = await seedTenants(users, properties);
      const payments = await seedPayments(users, properties, tenants);
      const maintenanceRequests = await seedMaintenanceRequests(users, properties, tenants);
      
      await generateSummary(users, properties, tenants, payments, maintenanceRequests);
      
      console.log('\n🎉 Complete database seeding finished successfully!');
      
    } catch (error) {
      console.error('\n💥 Seeding failed:', error.message);
      
      if (error.message.includes('E11000')) {
        console.log('\n💡 Tip: Duplicate data detected. Try running with --clear flag:');
        console.log('   node scripts/seedDatabase.js --clear');
      }
      
      if (error.message.includes('MONGODB_URI')) {
        console.log('\n💡 Tip: Make sure your .env.local file contains:');
        console.log('   MONGODB_URI=your_mongodb_connection_string');
      }
      
      process.exit(1);
    } finally {
      await mongoose.connection.close();
      console.log('\n🔌 Database connection closed');
    }
  }
  
  // Handle command line arguments
  if (process.argv.includes('--help')) {
    console.log('📖 Complete Database Seeding Script Usage:');
    console.log('=========================================');
    console.log('node scripts/seedDatabase.js           # Seed all data (keep existing)');
    console.log('node scripts/seedDatabase.js --clear   # Clear existing data and seed fresh');
    console.log('node scripts/seedDatabase.js --help    # Show this help message');
    console.log('');
    console.log('This script creates:');
    console.log('- 3 Users (landlords)');
    console.log('- 6 Properties with realistic details');
    console.log('- 6 Tenants with complete profiles');
    console.log('- 36 Payment records (6 months history per tenant)');
    console.log('- 6 Maintenance requests');
    console.log('');
    console.log('Make sure your .env.local file contains your MONGODB_URI');
    process.exit(0);
  }
  
  // Run the seeding process
  seedDatabase();