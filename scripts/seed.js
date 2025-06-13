// scripts/seed.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js'
import Property from '../models/Property.js';
import Lease from '../models/Lease.js'
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import PropertyRequest from '../models/PropertyRequest.js';
import Notification from '../models/Notification.js';
import SystemSettings from '../models/SystemSettings.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://rinaldo:flapjackleS0@landlord-app-v1.qxbhbuu.mongodb.net/');
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Clear existing data
const clearData = async () => {
  console.log('Clearing existing data...');
  await User.deleteMany({});
  await Property.deleteMany({});
  await Lease.deleteMany({});
  await Payment.deleteMany({});
  await Invoice.deleteMany({});
  await PropertyRequest.deleteMany({});
  await Notification.deleteMany({});
  await SystemSettings.deleteMany({});
  console.log('Existing data cleared');
};

// Seed Users
const seedUsers = async () => {
  console.log('Seeding users...');
  
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const users = [
    // Landlords
    {
      name: 'John Thompson',
      email: 'john.thompson@email.com',
      password: hashedPassword,
      phone: '+1-555-0101',
      role: 'landlord',
      company: 'Thompson Properties LLC',
      licenseNumber: 'REL-2024-001',
      permissions: ['manage_properties', 'manage_users', 'view_reports'],
      isActive: true
    },
    {
      name: 'Sarah Mitchell',
      email: 'sarah.mitchell@email.com',
      password: hashedPassword,
      phone: '+1-555-0102',
      role: 'landlord',
      company: 'Mitchell Real Estate Group',
      licenseNumber: 'REL-2024-002',
      permissions: ['manage_properties', 'manage_users', 'view_reports'],
      isActive: true
    },
    {
      name: 'David Rodriguez',
      email: 'david.rodriguez@email.com',
      password: hashedPassword,
      phone: '+1-555-0103',
      role: 'landlord',
      company: 'Rodriguez Holdings',
      licenseNumber: 'REL-2024-003',
      permissions: ['manage_properties', 'manage_users', 'view_reports'],
      isActive: true
    },
    
    // Property Managers
    {
      name: 'Emma Watson',
      email: 'emma.watson@email.com',
      password: hashedPassword,
      phone: '+1-555-0201',
      role: 'manager',
      permissions: ['manage_properties', 'assign_properties', 'approve_invoices', 'approve_payments', 'view_reports'],
      isActive: true
    },
    {
      name: 'Michael Chen',
      email: 'michael.chen@email.com',
      password: hashedPassword,
      phone: '+1-555-0202',
      role: 'manager',
      permissions: ['manage_properties', 'assign_properties', 'approve_invoices', 'approve_payments', 'view_reports'],
      isActive: true
    },
    
    // Admins
    {
      name: 'Lisa Johnson',
      email: 'lisa.johnson@email.com',
      password: hashedPassword,
      phone: '+1-555-0301',
      role: 'admin',
      adminLevel: 'financial',
      permissions: ['view_reports'],
      isActive: true
    },
    {
      name: 'Robert Kim',
      email: 'robert.kim@email.com',
      password: hashedPassword,
      phone: '+1-555-0302',
      role: 'admin',
      adminLevel: 'property',
      permissions: ['view_reports'],
      isActive: true
    },
    {
      name: 'Jessica Brown',
      email: 'jessica.brown@email.com',
      password: hashedPassword,
      phone: '+1-555-0303',
      role: 'admin',
      adminLevel: 'assistant',
      permissions: ['view_reports'],
      isActive: true
    },
    
    // Tenants
    {
      name: 'Alex Martinez',
      email: 'alex.martinez@email.com',
      password: hashedPassword,
      phone: '+1-555-0401',
      role: 'tenant',
      dateOfBirth: new Date('1990-05-15'),
      emergencyContact: {
        name: 'Maria Martinez',
        phone: '+1-555-0411',
        relationship: 'Sister'
      },
      isActive: true
    },
    {
      name: 'Emily Davis',
      email: 'emily.davis@email.com',
      password: hashedPassword,
      phone: '+1-555-0402',
      role: 'tenant',
      dateOfBirth: new Date('1988-11-22'),
      emergencyContact: {
        name: 'James Davis',
        phone: '+1-555-0412',
        relationship: 'Father'
      },
      isActive: true
    },
    {
      name: 'Marcus Johnson',
      email: 'marcus.johnson@email.com',
      password: hashedPassword,
      phone: '+1-555-0403',
      role: 'tenant',
      dateOfBirth: new Date('1985-08-30'),
      emergencyContact: {
        name: 'Angela Johnson',
        phone: '+1-555-0413',
        relationship: 'Wife'
      },
      isActive: true
    },
    {
      name: 'Sophia Wilson',
      email: 'sophia.wilson@email.com',
      password: hashedPassword,
      phone: '+1-555-0404',
      role: 'tenant',
      dateOfBirth: new Date('1992-03-18'),
      emergencyContact: {
        name: 'Thomas Wilson',
        phone: '+1-555-0414',
        relationship: 'Brother'
      },
      isActive: true
    },
    {
      name: 'James Anderson',
      email: 'james.anderson@email.com',
      password: hashedPassword,
      phone: '+1-555-0405',
      role: 'tenant',
      dateOfBirth: new Date('1987-12-05'),
      emergencyContact: {
        name: 'Linda Anderson',
        phone: '+1-555-0415',
        relationship: 'Mother'
      },
      isActive: true
    },
    {
      name: 'Rachel Green',
      email: 'rachel.green@email.com',
      password: hashedPassword,
      phone: '+1-555-0406',
      role: 'tenant',
      dateOfBirth: new Date('1991-07-14'),
      emergencyContact: {
        name: 'Monica Green',
        phone: '+1-555-0416',
        relationship: 'Sister'
      },
      isActive: true
    }
  ];

  const createdUsers = await User.insertMany(users);
  console.log(`Created ${createdUsers.length} users`);
  return createdUsers;
};

// Seed Properties
const seedProperties = async (landlords) => {
  console.log('Seeding properties...');
  
  const properties = [
    // John Thompson's properties
    {
      address: '123 Oak Street, Downtown',
      type: 'Apartment',
      monthlyRent: 1200,
      bedrooms: 2,
      bathrooms: 1,
      squareFeet: 850,
      landlord: landlords[0]._id,
      amenities: ['Air Conditioning', 'Dishwasher', 'Balcony', 'Parking'],
      description: 'Modern downtown apartment with city views',
      isAvailable: false // Has tenant
    },
    {
      address: '456 Pine Avenue, Suburbs',
      type: 'House',
      monthlyRent: 1800,
      bedrooms: 3,
      bathrooms: 2,
      squareFeet: 1200,
      landlord: landlords[0]._id,
      amenities: ['Garage', 'Garden', 'Fireplace', 'Central Heating'],
      description: 'Family home in quiet suburban neighborhood',
      isAvailable: false // Has tenant
    },
    {
      address: '789 Elm Street, Midtown',
      type: 'Condo',
      monthlyRent: 1500,
      bedrooms: 1,
      bathrooms: 1,
      squareFeet: 700,
      landlord: landlords[0]._id,
      amenities: ['Gym', 'Pool', 'Concierge', 'Rooftop Terrace'],
      description: 'Luxury condo with premium amenities',
      isAvailable: true // Available
    },
    
    // Sarah Mitchell's properties
    {
      address: '321 Maple Drive, Riverside',
      type: 'Townhouse',
      monthlyRent: 2200,
      bedrooms: 4,
      bathrooms: 3,
      squareFeet: 1800,
      landlord: landlords[1]._id,
      amenities: ['Garage', 'Patio', 'Storage', 'Washer/Dryer'],
      description: 'Spacious townhouse near the river',
      isAvailable: false // Has tenant
    },
    {
      address: '654 Cedar Lane, Historic District',
      type: 'Apartment',
      monthlyRent: 1350,
      bedrooms: 2,
      bathrooms: 1,
      squareFeet: 900,
      landlord: landlords[1]._id,
      amenities: ['Hardwood Floors', 'High Ceilings', 'Original Features'],
      description: 'Charming apartment in historic building',
      isAvailable: false // Has tenant
    },
    {
      address: '987 Birch Road, University Area',
      type: 'Apartment',
      monthlyRent: 1100,
      bedrooms: 1,
      bathrooms: 1,
      squareFeet: 600,
      landlord: landlords[1]._id,
      amenities: ['Student Friendly', 'Close to Campus', 'Internet Included'],
      description: 'Perfect for students, close to university',
      isAvailable: false // Has tenant
    },
    
    // David Rodriguez's properties
    {
      address: '147 Walnut Street, Business District',
      type: 'Commercial',
      monthlyRent: 3500,
      squareFeet: 2500,
      landlord: landlords[2]._id,
      amenities: ['Parking Lot', 'Loading Dock', 'Security System'],
      description: 'Prime commercial space in business district',
      isAvailable: true // Available
    },
    {
      address: '258 Spruce Avenue, Uptown',
      type: 'Apartment',
      monthlyRent: 1600,
      bedrooms: 2,
      bathrooms: 2,
      squareFeet: 1000,
      landlord: landlords[2]._id,
      amenities: ['In-unit Laundry', 'Balcony', 'Modern Kitchen', 'Parking'],
      description: 'Updated apartment with modern amenities',
      isAvailable: false // Has tenant
    }
  ];

  const createdProperties = await Property.insertMany(properties);
  console.log(`Created ${createdProperties.length} properties`);
  return createdProperties;
};

// Seed Leases
const seedLeases = async (properties, tenants, landlords) => {
  console.log('Seeding leases...');
  
  const leases = [
    {
      propertyId: properties[0]._id, // 123 Oak Street
      tenantId: tenants[0]._id, // Alex Martinez
      landlordId: landlords[0]._id, // John Thompson
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      monthlyRent: 1200,
      securityDeposit: 1200,
      paymentDueDay: 1,
      status: 'active',
      nextPaymentDue: new Date('2025-07-01'),
      lastPaymentDate: new Date('2025-06-01'),
      totalPaid: 7200, // 6 months paid
      balanceDue: 0
    },
    {
      propertyId: properties[1]._id, // 456 Pine Avenue
      tenantId: tenants[1]._id, // Emily Davis
      landlordId: landlords[0]._id, // John Thompson
      startDate: new Date('2024-03-01'),
      endDate: new Date('2025-02-28'),
      monthlyRent: 1800,
      securityDeposit: 1800,
      paymentDueDay: 1,
      status: 'active',
      nextPaymentDue: new Date('2025-07-01'),
      lastPaymentDate: new Date('2025-06-01'),
      totalPaid: 7200, // 4 months paid
      balanceDue: 0
    },
    {
      propertyId: properties[3]._id, // 321 Maple Drive
      tenantId: tenants[2]._id, // Marcus Johnson
      landlordId: landlords[1]._id, // Sarah Mitchell
      startDate: new Date('2024-02-15'),
      endDate: new Date('2025-02-14'),
      monthlyRent: 2200,
      securityDeposit: 2200,
      paymentDueDay: 15,
      status: 'active',
      nextPaymentDue: new Date('2025-07-15'),
      lastPaymentDate: new Date('2025-06-15'),
      totalPaid: 11000, // 5 months paid
      balanceDue: 0
    },
    {
      propertyId: properties[4]._id, // 654 Cedar Lane
      tenantId: tenants[3]._id, // Sophia Wilson
      landlordId: landlords[1]._id, // Sarah Mitchell
      startDate: new Date('2024-04-01'),
      endDate: new Date('2025-03-31'),
      monthlyRent: 1350,
      securityDeposit: 1350,
      paymentDueDay: 1,
      status: 'active',
      nextPaymentDue: new Date('2025-07-01'),
      lastPaymentDate: new Date('2025-06-01'),
      totalPaid: 4050, // 3 months paid
      balanceDue: 0
    },
    {
      propertyId: properties[5]._id, // 987 Birch Road
      tenantId: tenants[4]._id, // James Anderson
      landlordId: landlords[1]._id, // Sarah Mitchell
      startDate: new Date('2024-05-01'),
      endDate: new Date('2025-04-30'),
      monthlyRent: 1100,
      securityDeposit: 1100,
      paymentDueDay: 1,
      status: 'active',
      nextPaymentDue: new Date('2025-07-01'),
      lastPaymentDate: new Date('2025-06-01'),
      totalPaid: 2200, // 2 months paid
      balanceDue: 0
    },
    {
      propertyId: properties[7]._id, // 258 Spruce Avenue
      tenantId: tenants[5]._id, // Rachel Green
      landlordId: landlords[2]._id, // David Rodriguez
      startDate: new Date('2024-06-01'),
      endDate: new Date('2025-05-31'),
      monthlyRent: 1600,
      securityDeposit: 1600,
      paymentDueDay: 1,
      status: 'active',
      nextPaymentDue: new Date('2025-07-01'),
      lastPaymentDate: new Date('2025-06-01'),
      totalPaid: 1600, // 1 month paid
      balanceDue: 0
    }
  ];

  const createdLeases = await Lease.insertMany(leases);
  console.log(`Created ${createdLeases.length} leases`);
  
  // Update tenant current property and lease references
  for (let i = 0; i < createdLeases.length; i++) {
    await User.findByIdAndUpdate(createdLeases[i].tenantId, {
      currentProperty: createdLeases[i].propertyId,
      currentLease: createdLeases[i]._id
    });
  }
  
  return createdLeases;
};

// Seed Payments
const seedPayments = async (leases, managers, admins) => {
  console.log('Seeding payments...');
  
  const payments = [];
  const paymentMethods = ['bank_transfer', 'mobile_money', 'cash', 'card'];
  const paymentTypes = ['rent', 'deposit', 'utilities'];
  
  // Generate payments for each lease
  for (const lease of leases) {
    const startDate = new Date(lease.startDate);
    const currentDate = new Date();
    
    // Generate monthly payments from lease start to current month
    for (let date = new Date(startDate); date <= currentDate; date.setMonth(date.getMonth() + 1)) {
      const paymentDate = new Date(date);
      paymentDate.setDate(lease.paymentDueDay);
      
      if (paymentDate <= currentDate) {
        payments.push({
          receiptNumber: `${'RCT'}-${Math.floor(Math.random() * Math.pow(10, 6)).toString()}`,
          amount: lease.monthlyRent,
          paymentDate: paymentDate,
          paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
          tenant: lease.tenantId,
          property: lease.propertyId,
          lease: lease._id,
          paymentType: 'rent',
          status: 'completed',
          approvalStatus: 'approved',
          recordedBy: admins[Math.floor(Math.random() * admins.length)]._id,
          approvedBy: managers[Math.floor(Math.random() * managers.length)]._id,
          approvedAt: new Date(paymentDate.getTime() + 24 * 60 * 60 * 1000), // Approved next day
          description: `Monthly rent payment for ${paymentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
          approvalHistory: [{
            action: 'submitted',
            user: admins[Math.floor(Math.random() * admins.length)]._id,
            timestamp: paymentDate
          }, {
            action: 'approved',
            user: managers[Math.floor(Math.random() * managers.length)]._id,
            timestamp: new Date(paymentDate.getTime() + 24 * 60 * 60 * 1000)
          }]
        });
      }
    }
    
    // Add security deposit payment
    payments.push({
      receiptNumber: `${'RCT'}-${Math.floor(Math.random() * Math.pow(10, 6)).toString()}`,
      amount: lease.securityDeposit,
      paymentDate: new Date(lease.startDate.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days before lease start
      paymentMethod: 'bank_transfer',
      tenant: lease.tenantId,
      property: lease.propertyId,
      lease: lease._id,
      paymentType: 'deposit',
      status: 'completed',
      approvalStatus: 'approved',
      recordedBy: admins[0]._id,
      approvedBy: managers[0]._id,
      approvedAt: new Date(lease.startDate.getTime() - 6 * 24 * 60 * 60 * 1000),
      description: 'Security deposit payment',
      approvalHistory: [{
        action: 'submitted',
        user: admins[0]._id,
        timestamp: new Date(lease.startDate.getTime() - 7 * 24 * 60 * 60 * 1000)
      }, {
        action: 'approved',
        user: managers[0]._id,
        timestamp: new Date(lease.startDate.getTime() - 6 * 24 * 60 * 60 * 1000)
      }]
    });
  }

  const createdPayments = await Payment.insertMany(payments);
  console.log(`Created ${createdPayments.length} payments`);
  return createdPayments;
};

// Seed Invoices
const seedInvoices = async (leases, managers, admins) => {
  console.log('Seeding invoices...');
  
  const invoices = [];
  
  // Generate monthly rent invoices for next 3 months
  for (const lease of leases) {
    for (let i = 0; i < 3; i++) {
      const issueDate = new Date();
      issueDate.setMonth(issueDate.getMonth() + i);
      issueDate.setDate(lease.paymentDueDay - 5); // Invoice 5 days before due date
      
      const dueDate = new Date(issueDate);
      dueDate.setDate(lease.paymentDueDay);
      
      const invoice = {
        invoiceNumber: `${'INV'}-${Math.floor(Math.random() * Math.pow(10, 6)).toString()}`,
        issueDate: issueDate,
        dueDate: dueDate,
        tenant: lease.tenantId,
        property: lease.propertyId,
        lease: lease._id,
        items: [{
          description: `Monthly rent for ${dueDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
          quantity: 1,
          unitPrice: lease.monthlyRent,
          amount: lease.monthlyRent
        }],
        subtotal: lease.monthlyRent,
        taxAmount: 0,
        totalAmount: lease.monthlyRent,
        paidAmount: i === 0 ? lease.monthlyRent : 0, // First invoice is paid
        status: i === 0 ? 'paid' : 'sent',
        approvalStatus: 'approved',
        createdBy: admins[Math.floor(Math.random() * admins.length)]._id,
        requiresApprovalFrom: managers[0]._id,
        approvedBy: managers[Math.floor(Math.random() * managers.length)]._id,
        approvedAt: new Date(issueDate.getTime() + 12 * 60 * 60 * 1000), // Approved 12 hours later
        paymentTerms: 'Payment due within 30 days',
        approvalHistory: [{
          action: 'submitted',
          user: admins[Math.floor(Math.random() * admins.length)]._id,
          timestamp: issueDate
        }, {
          action: 'approved',
          user: managers[Math.floor(Math.random() * managers.length)]._id,
          timestamp: new Date(issueDate.getTime() + 12 * 60 * 60 * 1000)
        }]
      };
      
      invoices.push(invoice);
    }
  }

  const createdInvoices = await Invoice.insertMany(invoices);
  console.log(`Created ${createdInvoices.length} invoices`);
  return createdInvoices;
};

// Seed Property Requests
const seedPropertyRequests = async (tenants, landlords, properties) => {
  console.log('Seeding property requests...');
  
  const propertyRequests = [
    {
      tenant: tenants[4]._id, // James Anderson (already has lease but looking for upgrade)
      requestType: 'existing_property',
      property: properties[2]._id, // Available condo
      landlord: landlords[0]._id,
      status: 'pending',
      moveInPreferences: {
        preferredDate: new Date('2025-09-01'),
        leaseDuration: 12,
        hasDeposit: true,
        depositAmount: 1500,
        additionalRequests: 'Would like to move in September 1st'
      },
      messages: [{
        sender: tenants[4]._id,
        message: 'Hi, I\'m interested in renting the condo at 789 Elm Street. Could we schedule a viewing?',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }]
    },
    {
      tenant: tenants[5]._id, // Rachel Green (looking for new property)
      requestType: 'new_property',
      landlord: landlords[1]._id,
      status: 'pending',
      requestedPropertyDetails: {
        address: '555 Cherry Street, Westside',
        estimatedRent: 1400,
        bedrooms: 2,
        bathrooms: 1,
        propertyType: 'Apartment',
        description: 'Looking for a 2-bedroom apartment on the west side of town',
        landlordEmail: 'sarah.mitchell@email.com'
      },
      moveInPreferences: {
        preferredDate: new Date('2025-08-15'),
        leaseDuration: 12,
        hasDeposit: true,
        depositAmount: 1400,
        additionalRequests: 'Pet-friendly preferred'
      },
      messages: [{
        sender: tenants[5]._id,
        message: 'I heard you might have properties on Cherry Street. I\'m looking for a 2-bedroom apartment and can provide references.',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      }]
    }
  ];

  const createdPropertyRequests = await PropertyRequest.insertMany(propertyRequests);
  console.log(`Created ${createdPropertyRequests.length} property requests`);
  return createdPropertyRequests;
};

// Seed Notifications
const seedNotifications = async (users, propertyRequests, payments, invoices) => {
  console.log('Seeding notifications...');
  
  const landlords = users.filter(u => u.role === 'landlord');
  const managers = users.filter(u => u.role === 'manager');
  const tenants = users.filter(u => u.role === 'tenant');
  
  const notifications = [
    // Property request notifications
    {
      recipient: landlords[0]._id,
      sender: tenants[4]._id,
      type: 'property_request',
      title: 'New Property Request',
      message: 'James Anderson is interested in your property at 789 Elm Street',
      relatedProperty: propertyRequests[0].property,
      relatedPropertyRequest: propertyRequests[0]._id,
      actionRequired: true,
      actionUrl: `/landlord/property-requests/${propertyRequests[0]._id}`,
      priority: 'medium',
      isRead: false
    },
    {
      recipient: landlords[1]._id,
      sender: tenants[5]._id,
      type: 'tenant_registration',
      title: 'New Tenant Registration',
      message: 'Rachel Green has registered and is looking for a property on Cherry Street',
      relatedPropertyRequest: propertyRequests[1]._id,
      actionRequired: true,
      actionUrl: `/landlord/tenant-requests/${propertyRequests[1]._id}`,
      priority: 'high',
      isRead: false
    },
    
    // Payment notifications
    {
      recipient: managers[0]._id,
      type: 'payment_submitted',
      title: 'Payment Approval Required',
      message: 'A new rent payment has been submitted and requires approval',
      relatedDocument: payments[payments.length - 1]._id,
      relatedDocumentModel: 'Payment',
      actionRequired: true,
      actionUrl: `/manager/payments/pending`,
      priority: 'medium',
      isRead: true,
      readAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
    },
    
    // Invoice notifications
    {
      recipient: tenants[0]._id,
      type: 'invoice_created',
      title: 'New Invoice Available',
      message: 'Your monthly rent invoice is now available for review',
      relatedDocument: invoices[0]._id,
      relatedDocumentModel: 'Invoice',
      actionRequired: false,
      actionUrl: `/tenant/invoices/${invoices[0]._id}`,
      priority: 'medium',
      isRead: false
    },
    {
      recipient: tenants[1]._id,
      type: 'invoice_created',
      title: 'New Invoice Available',
      message: 'Your monthly rent invoice is now available for review',
      relatedDocument: invoices[3]._id,
      relatedDocumentModel: 'Invoice',
      actionRequired: false,
      actionUrl: `/tenant/invoices/${invoices[3]._id}`,
      priority: 'medium',
      isRead: false
    },
    
    // General notifications
    {
      recipient: managers[1]._id,
      type: 'general',
      title: 'System Maintenance Scheduled',
      message: 'System maintenance is scheduled for this weekend. Please plan accordingly.',
      actionRequired: false,
      priority: 'low',
      isRead: false
    }
  ];

  const createdNotifications = await Notification.insertMany(notifications);
  console.log(`Created ${createdNotifications.length} notifications`);
  return createdNotifications;
};

// Seed System Settings
const seedSystemSettings = async () => {
  console.log('Seeding system settings...');
  
  const systemSettings = {
    general: {
      companyName: 'RentEase Property Management',
      companyEmail: 'info@rentease.com',
      companyAddress: '123 Business Ave, Suite 100, City, State 12345',
      companyPhone: '+1-555-RENT-EASE',
      timezone: 'America/New_York',
      currency: 'USD',
      dateFormat: 'MM/DD/YYYY',
      maintenanceHours: {
        start: '09:00',
        end: '17:00'
      }
    },
    notifications: {
      emailTemplates: {
        welcome: true,
        paymentReminder: true,
        maintenanceUpdate: true,
        leaseExpiry: true
      },
      automationRules: {
        latePaymentReminders: true,
        maintenanceFollowup: true,
        leaseRenewalNotices: true
      },
      emailSettings: {
        smtpHost: 'smtp.gmail.com',
        smtpPort: '587',
        smtpUsername: 'noreply@rentease.com',
        smtpPassword: '', // Would be encrypted in production
        fromEmail: 'noreply@rentease.com',
        fromName: 'RentEase Property Management'
      }
    },
    payments: {
      stripe: {
        publishableKey: 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxx',
        secretKey: '', // Would be encrypted in production
        webhookSecret: '' // Would be encrypted in production
      },
      paymentMethods: {
        creditCard: true,
        bankTransfer: true,
        check: false
      },
      lateFees: {
        enabled: true,
        gracePeriod: 5,
        feeAmount: 75,
        feeType: 'fixed'
      }
    },
    security: {
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false
      },
      sessionSettings: {
        sessionTimeout: 24,
        maxConcurrentSessions: 3
      },
      twoFactorAuth: {
        enabled: false,
        required: false
      }
    }
  };

  const createdSettings = await SystemSettings.create(systemSettings);
  console.log('Created system settings');
  return createdSettings;
};

// Assign properties to admin users
const assignPropertiesToAdmins = async (admins, managers, properties) => {
  console.log('Assigning properties to admin users...');
  
  // Assign properties to Lisa Johnson (financial admin)
  await User.findByIdAndUpdate(admins[0]._id, {
    supervisedBy: managers[0]._id,
    $push: {
      assignedProperties: [
        {
          property: properties[0]._id,
          assignedBy: managers[0]._id,
          permissions: ['log_payments', 'create_invoices'],
          isActive: true
        },
        {
          property: properties[1]._id,
          assignedBy: managers[0]._id,
          permissions: ['log_payments', 'create_invoices'],
          isActive: true
        }
      ]
    }
  });
  
  // Assign properties to Robert Kim (property admin)
  await User.findByIdAndUpdate(admins[1]._id, {
    supervisedBy: managers[1]._id,
    $push: {
      assignedProperties: [
        {
          property: properties[3]._id,
          assignedBy: managers[1]._id,
          permissions: ['log_payments', 'create_invoices', 'manage_tenants'],
          isActive: true
        },
        {
          property: properties[4]._id,
          assignedBy: managers[1]._id,
          permissions: ['log_payments', 'create_invoices', 'manage_tenants'],
          isActive: true
        }
      ]
    }
  });
  
  // Assign properties to Jessica Brown (assistant admin)
  await User.findByIdAndUpdate(admins[2]._id, {
    supervisedBy: managers[0]._id,
    $push: {
      assignedProperties: [
        {
          property: properties[5]._id,
          assignedBy: managers[0]._id,
          permissions: ['log_payments'],
          isActive: true
        }
      ]
    }
  });
  
  console.log('Property assignments completed');
};

// Main seeding function
const seedDatabase = async () => {
  try {
    await connectDB();
    await clearData();
    
    const users = await seedUsers();
    
    // Filter users by role
    const landlords = users.filter(user => user.role === 'landlord');
    const managers = users.filter(user => user.role === 'manager');
    const admins = users.filter(user => user.role === 'admin');
    const tenants = users.filter(user => user.role === 'tenant');
    
    const properties = await seedProperties(landlords);
    const leases = await seedLeases(properties, tenants, landlords);
    const payments = await seedPayments(leases, managers, admins);
    const invoices = await seedInvoices(leases, managers, admins);
    const propertyRequests = await seedPropertyRequests(tenants, landlords, properties);
    const notifications = await seedNotifications(users, propertyRequests, payments, invoices);
    const systemSettings = await seedSystemSettings();
    
    await assignPropertiesToAdmins(admins, managers, properties);
    
    console.log('\n🌱 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`👥 Users: ${users.length} (${landlords.length} landlords, ${managers.length} managers, ${admins.length} admins, ${tenants.length} tenants)`);
    console.log(`🏠 Properties: ${properties.length}`);
    console.log(`📋 Leases: ${leases.length}`);
    console.log(`💰 Payments: ${payments.length}`);
    console.log(`📄 Invoices: ${invoices.length}`);
    console.log(`📝 Property Requests: ${propertyRequests.length}`);
    console.log(`🔔 Notifications: ${notifications.length}`);
    console.log(`⚙️ System Settings: 1`);
    
    console.log('\n🔐 Test Login Credentials:');
    console.log('Email: john.thompson@email.com | Password: password123 | Role: Landlord');
    console.log('Email: emma.watson@email.com | Password: password123 | Role: Manager');
    console.log('Email: lisa.johnson@email.com | Password: password123 | Role: Admin');
    console.log('Email: alex.martinez@email.com | Password: password123 | Role: Tenant');
    
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the seeder
if (process.argv[2] === 'seed') {
  seedDatabase();
}

export default seedDatabase;