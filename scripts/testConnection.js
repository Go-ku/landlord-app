// scripts/testConnection.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function testConnection() {
  console.log('🔍 Testing MongoDB connection...');
  console.log('================================');
  
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      console.log('❌ MONGODB_URI not found in environment variables');
      console.log('💡 Make sure your .env.local file exists and contains:');
      console.log('   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database');
      process.exit(1);
    }
    
    console.log('📍 Connection string found:', MONGODB_URI.replace(/:([^:@]{8})[^:@]*@/, ':****@'));
    
    console.log('🔌 Attempting to connect...');
    await mongoose.connect(MONGODB_URI);
    
    console.log('✅ Connected to MongoDB successfully!');
    
    // Test database operations
    console.log('\n🧪 Testing database operations...');
    
    const dbName = mongoose.connection.db.databaseName;
    console.log(`📊 Database name: ${dbName}`);
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📋 Existing collections: ${collections.length}`);
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });
    
    if (collections.length === 0) {
      console.log('ℹ️  No collections found - this is normal for a new database');
    }
    
    console.log('\n🎉 Connection test successful!');
    console.log('You can now run the seed script: node scripts/seedDatabase.js');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    // Provide specific error guidance
    if (error.message.includes('authentication failed')) {
      console.log('\n💡 Authentication Error Solutions:');
      console.log('   1. Check your username and password in the connection string');
      console.log('   2. Make sure the user exists in MongoDB Atlas');
      console.log('   3. Verify the user has read/write permissions');
    }
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('timeout')) {
      console.log('\n💡 Network Error Solutions:');
      console.log('   1. Check your internet connection');
      console.log('   2. Verify your MongoDB Atlas cluster is running');
      console.log('   3. Check if your IP is whitelisted in Atlas Network Access');
    }
    
    if (error.message.includes('bad auth')) {
      console.log('\n💡 Database Access Error Solutions:');
      console.log('   1. Check the database name in your connection string');
      console.log('   2. Verify user permissions for the specific database');
    }
    
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Connection closed');
  }
}

testConnection();