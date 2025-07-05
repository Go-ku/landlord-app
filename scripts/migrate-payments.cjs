// scripts/migrate-payments.cjs - CommonJS Migration Script
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

// Database connection
async function connectDB() {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ Connected to MongoDB');
    }
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Payment Schema Definition (simplified for migration)
const PaymentSchema = new mongoose.Schema({
  // Allow any fields for migration flexibility
}, { 
  strict: false,
  timestamps: true 
});

// Get or create the Payment model
let Payment;
try {
  Payment = mongoose.model('Payment');
} catch (error) {
  Payment = mongoose.model('Payment', PaymentSchema);
}

// Migration function
async function migratePayments() {
  console.log('🚀 Starting payment migration...');
  
  try {
    await connectDB();
    
    // Find all payments
    const payments = await Payment.find({}).lean();
    console.log(`📊 Found ${payments.length} payments to migrate`);
    
    let migratedCount = 0;
    let errorCount = 0;
    
    for (const paymentData of payments) {
      try {
        const payment = await Payment.findById(paymentData._id);
        let updated = false;
        
        console.log(`\n🔄 Processing payment: ${payment._id}`);
        
        // 1. Sync field names for compatibility
        if (payment.tenant && !payment.tenantId) {
          payment.tenantId = payment.tenant;
          updated = true;
          console.log('  ✓ Synced tenant -> tenantId');
        }
        
        if (payment.tenantId && !payment.tenant) {
          payment.tenant = payment.tenantId;
          updated = true;
          console.log('  ✓ Synced tenantId -> tenant');
        }
        
        if (payment.property && !payment.propertyId) {
          payment.propertyId = payment.property;
          updated = true;
          console.log('  ✓ Synced property -> propertyId');
        }
        
        if (payment.propertyId && !payment.property) {
          payment.property = payment.propertyId;
          updated = true;
          console.log('  ✓ Synced propertyId -> property');
        }
        
        if (payment.lease && !payment.leaseId) {
          payment.leaseId = payment.lease;
          updated = true;
          console.log('  ✓ Synced lease -> leaseId');
        }
        
        if (payment.leaseId && !payment.lease) {
          payment.lease = payment.leaseId;
          updated = true;
          console.log('  ✓ Synced leaseId -> lease');
        }
        
        // 2. Set currency if not present
        if (!payment.currency) {
          payment.currency = 'ZMW';
          updated = true;
          console.log('  ✓ Set default currency: ZMW');
        }
        
        // 3. Set expected amount if not present
        if (!payment.expectedAmount && payment.amount) {
          payment.expectedAmount = payment.amount;
          updated = true;
          console.log(`  ✓ Set expectedAmount: ${payment.amount}`);
        }
        
        // 4. Migrate old receipt fields to new receipt object
        if (!payment.receipt) {
          payment.receipt = {};
          updated = true;
        }
        
        if (payment.receiptGenerated && !payment.receipt.receiptNumber && payment.receiptNumber) {
          payment.receipt = {
            receiptNumber: payment.receiptNumber,
            issuedAt: payment.createdAt || new Date(),
            sentToTenant: payment.receiptGenerated || false,
            sentVia: []
          };
          updated = true;
          console.log(`  ✓ Migrated receipt info: ${payment.receiptNumber}`);
        }
        
        // 5. Ensure receipt number exists
        if (!payment.receiptNumber) {
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
          payment.receiptNumber = `PAY-${year}${month}${day}-${random}`;
          updated = true;
          console.log(`  ✓ Generated receipt number: ${payment.receiptNumber}`);
        }
        
        // 6. Set payment period if missing
        if (!payment.paymentPeriod && payment.paymentDate) {
          const date = new Date(payment.paymentDate);
          payment.paymentPeriod = {
            month: date.getMonth() + 1,
            year: date.getFullYear()
          };
          updated = true;
          console.log(`  ✓ Set payment period: ${payment.paymentPeriod.month}/${payment.paymentPeriod.year}`);
        }
        
        // 7. Initialize late payment structure
        if (!payment.latePayment) {
          payment.latePayment = {
            isLate: false,
            daysLate: 0,
            lateFeeApplied: payment.lateFee || 0,
            lateFeeWaived: false
          };
          updated = true;
          console.log('  ✓ Initialized late payment structure');
        }
        
        // 8. Migrate transaction details for mobile money
        if (payment.paymentMethod === 'mobile_money' || payment.paymentMethod === 'MTN_MOBILE_MONEY') {
          if (!payment.transactionDetails) {
            payment.transactionDetails = {
              transactionId: payment.referenceNumber,
              transactionDate: payment.paymentDate || payment.createdAt,
              confirmationCode: payment.referenceNumber,
              notes: 'Migrated mobile money payment'
            };
            updated = true;
            console.log('  ✓ Created transaction details for mobile money');
          }
        }
        
        // 9. Ensure approval history exists
        if (!payment.approvalHistory || payment.approvalHistory.length === 0) {
          payment.approvalHistory = [{
            action: 'submitted',
            user: payment.recordedBy || payment.tenant || payment.tenantId,
            notes: 'Payment submitted (migrated)',
            timestamp: payment.createdAt || new Date()
          }];
          updated = true;
          console.log('  ✓ Added initial approval history');
        }
        
        // 10. Save if updated
        if (updated) {
          await payment.save();
          migratedCount++;
          console.log(`  ✅ Migration completed for payment: ${payment.receiptNumber}`);
        } else {
          console.log(`  ➡️  No migration needed for payment: ${payment.receiptNumber || payment._id}`);
        }
        
      } catch (error) {
        errorCount++;
        console.error(`  ❌ Error migrating payment ${paymentData._id}:`, error.message);
      }
    }
    
    console.log('\n🎉 Migration Summary:');
    console.log(`  📊 Total payments processed: ${payments.length}`);
    console.log(`  ✅ Successfully migrated: ${migratedCount}`);
    console.log(`  ❌ Errors encountered: ${errorCount}`);
    console.log(`  ➡️  No changes needed: ${payments.length - migratedCount - errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n🚀 Migration completed successfully!');
    } else {
      console.log(`\n⚠️  Migration completed with ${errorCount} errors. Please review the logs above.`);
    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Dry run function to preview changes
async function dryRunMigration() {
  console.log('🔍 Starting dry run (no changes will be made)...');
  
  try {
    await connectDB();
    
    const payments = await Payment.find({}).lean();
    console.log(`📊 Found ${payments.length} payments to analyze`);
    
    let needsMigration = 0;
    const changes = [];
    
    for (const payment of payments) {
      const paymentChanges = [];
      
      // Check what would be changed
      if (payment.tenant && !payment.tenantId) {
        paymentChanges.push('tenant -> tenantId sync');
      }
      if (payment.tenantId && !payment.tenant) {
        paymentChanges.push('tenantId -> tenant sync');
      }
      if (payment.property && !payment.propertyId) {
        paymentChanges.push('property -> propertyId sync');
      }
      if (payment.propertyId && !payment.property) {
        paymentChanges.push('propertyId -> property sync');
      }
      if (!payment.currency) {
        paymentChanges.push('add default currency (ZMW)');
      }
      if (!payment.expectedAmount && payment.amount) {
        paymentChanges.push('set expectedAmount');
      }
      if (!payment.receiptNumber) {
        paymentChanges.push('generate receipt number');
      }
      if (!payment.paymentPeriod && payment.paymentDate) {
        paymentChanges.push('set payment period');
      }
      if (!payment.latePayment) {
        paymentChanges.push('initialize late payment structure');
      }
      
      if (paymentChanges.length > 0) {
        needsMigration++;
        changes.push({
          id: payment._id,
          receiptNumber: payment.receiptNumber || 'Not set',
          changes: paymentChanges
        });
      }
    }
    
    console.log('\n📋 Dry Run Results:');
    console.log(`  📊 Total payments: ${payments.length}`);
    console.log(`  🔄 Need migration: ${needsMigration}`);
    console.log(`  ✅ Already migrated: ${payments.length - needsMigration}`);
    
    if (needsMigration > 0) {
      console.log('\n📝 Sample changes (first 5):');
      changes.slice(0, 5).forEach((change, index) => {
        console.log(`  ${index + 1}. Payment ${change.receiptNumber}:`);
        change.changes.forEach(c => console.log(`     - ${c}`));
      });
      
      if (changes.length > 5) {
        console.log(`     ... and ${changes.length - 5} more`);
      }
    }
    
  } catch (error) {
    console.error('💥 Dry run failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Command line interface
const args = process.argv.slice(2);
const command = args[0];

if (command === 'dry-run' || command === '--dry-run') {
  dryRunMigration();
} else if (command === 'migrate' || command === '--migrate') {
  console.log('⚠️  This will modify your database. Make sure you have a backup!');
  console.log('Starting migration in 3 seconds...');
  setTimeout(() => {
    migratePayments();
  }, 3000);
} else {
  console.log('📖 Payment Migration Script');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/migrate-payments.cjs dry-run    # Preview changes without modifying data');
  console.log('  node scripts/migrate-payments.cjs migrate   # Run the actual migration');
  console.log('');
  console.log('⚠️  Always backup your database before running migrations!');
  console.log('');
  console.log('Example:');
  console.log('  # First, see what will be changed');
  console.log('  node scripts/migrate-payments.cjs dry-run');
  console.log('');
  console.log('  # Then run the migration');
  console.log('  node scripts/migrate-payments.cjs migrate');
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Migration interrupted by user');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  await mongoose.connection.close();
  process.exit(1);
});