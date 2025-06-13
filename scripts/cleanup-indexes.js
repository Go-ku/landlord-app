// scripts/cleanup-indexes.js - Fixed version with proper env loading
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
config({ path: join(__dirname, '..', '.env.local') });

// Alternative: Also try .env if .env.local doesn't exist
if (!process.env.MONGODB_URI) {
  config({ path: join(__dirname, '..', '.env') });
}

// Database connection function
async function connectDB() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI is not defined in environment variables');
      console.log('💡 Make sure you have a .env.local file with MONGODB_URI=your_mongodb_connection_string');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
}

async function cleanupDuplicateIndexes() {
  try {
    await connectDB();
    
    const db = mongoose.connection.db;
    const collections = ['users', 'properties', 'leases', 'stripepayments', 'maintenances'];
    
    console.log('🔍 Checking for duplicate indexes...\n');
    
    for (const collectionName of collections) {
      try {
        // Check if collection exists
        const collectionExists = await db.listCollections({ name: collectionName }).hasNext();
        
        if (!collectionExists) {
          console.log(`⚠️  Collection '${collectionName}' does not exist, skipping...`);
          continue;
        }

        const collection = db.collection(collectionName);
        const indexes = await collection.indexes();
        
        console.log(`📋 ${collectionName.toUpperCase()} Collection:`);
        console.log('----------------------------------------');
        console.log(`Total indexes: ${indexes.length}`);
        
        // Group indexes by their key pattern
        const indexGroups = {};
        
        indexes.forEach((index, i) => {
          const keyString = JSON.stringify(index.key);
          if (!indexGroups[keyString]) {
            indexGroups[keyString] = [];
          }
          indexGroups[keyString].push({ ...index, originalIndex: i });
        });
        
        // Find duplicates
        const duplicates = Object.entries(indexGroups).filter(([key, group]) => group.length > 1);
        
        if (duplicates.length > 0) {
          console.log('⚠️  Found duplicate indexes:');
          
          for (const [keyPattern, duplicateIndexes] of duplicates) {
            console.log(`\n🔑 Key Pattern: ${keyPattern}`);
            duplicateIndexes.forEach((idx, i) => {
              console.log(`   ${i + 1}. Name: "${idx.name}" | Background: ${idx.background || false} | Unique: ${idx.unique || false}`);
            });
            
            // Special handling for email indexes
            if (keyPattern.includes('email')) {
              console.log('   📧 Email field detected - keeping unique index only');
              
              // Keep the unique index, drop others
              const uniqueIndex = duplicateIndexes.find(idx => idx.unique);
              const nonUniqueIndexes = duplicateIndexes.filter(idx => !idx.unique && idx.name !== '_id_');
              
              for (const indexToDrop of nonUniqueIndexes) {
                try {
                  await collection.dropIndex(indexToDrop.name);
                  console.log(`   ✅ Dropped non-unique email index: "${indexToDrop.name}"`);
                } catch (error) {
                  console.log(`   ❌ Failed to drop index "${indexToDrop.name}": ${error.message}`);
                }
              }
            } else {
              // For non-email duplicates, keep the first index, drop the rest
              for (let i = 1; i < duplicateIndexes.length; i++) {
                const indexToDrop = duplicateIndexes[i];
                if (indexToDrop.name !== '_id_') { // Never drop the _id index
                  try {
                    await collection.dropIndex(indexToDrop.name);
                    console.log(`   ✅ Dropped duplicate index: "${indexToDrop.name}"`);
                  } catch (error) {
                    console.log(`   ❌ Failed to drop index "${indexToDrop.name}": ${error.message}`);
                  }
                }
              }
            }
          }
        } else {
          console.log('✅ No duplicate indexes found');
        }
        
        console.log('\n');
        
      } catch (error) {
        console.log(`❌ Error processing collection ${collectionName}:`, error.message);
      }
    }
    
    console.log('🎉 Index cleanup completed!\n');
    
    // Show final state
    console.log('📊 Final index state:');
    for (const collectionName of collections) {
      try {
        const collectionExists = await db.listCollections({ name: collectionName }).hasNext();
        if (collectionExists) {
          const collection = db.collection(collectionName);
          const finalIndexes = await collection.indexes();
          console.log(`   ${collectionName}: ${finalIndexes.length} indexes`);
        }
      } catch (error) {
        console.log(`   ${collectionName}: Error checking final state`);
      }
    }
    
  } catch (error) {
    console.error('❌ Script error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the cleanup
cleanupDuplicateIndexes()
  .then(() => {
    console.log('✨ Cleanup script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });