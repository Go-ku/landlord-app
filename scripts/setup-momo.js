// scripts/setup-momo.js - Run this once to set up MoMo API
import MoMoAPIService from '../lib/momo-api.js';

async function setupMoMoAPI() {
  console.log('🚀 Setting up MTN MoMo API...');
  
  try {
    // Step 1: Create API User
    console.log('📝 Creating API User...');
    const userResult = await MoMoAPIService.createAPIUser();
    
    if (userResult.success) {
      console.log('✅ API User created successfully');
      console.log('Reference ID:', userResult.referenceId);
    } else {
      console.log('❌ Failed to create API user:', userResult.error);
      // Continue anyway as user might already exist
    }
    
    // Step 2: Get API User Info
    console.log('📋 Getting API User info...');
    const userInfo = await MoMoAPIService.getAPIUser();
    
    if (userInfo.success) {
      console.log('✅ API User info retrieved');
      console.log('Target Environment:', userInfo.data.targetEnvironment);
    } else {
      console.log('❌ Failed to get API user info:', userInfo.error);
    }
    
    // Step 3: Create API Key
    console.log('🔑 Creating API Key...');
    const keyResult = await MoMoAPIService.createAPIKey();
    
    if (keyResult.success) {
      console.log('✅ API Key created successfully');
      console.log('API Key:', keyResult.data.apiKey);
      console.log('⚠️  IMPORTANT: Save this API key in your .env file as MTN_API_KEY');
    } else {
      console.log('❌ Failed to create API key:', keyResult.error);
    }
    
    // Step 4: Test Token Generation
    console.log('🔐 Testing token generation...');
    const tokenResult = await MoMoAPIService.generateAccessToken();
    
    if (tokenResult.success) {
      console.log('✅ Access token generated successfully');
      console.log('Token (partial):', tokenResult.token.substring(0, 20) + '...');
    } else {
      console.log('❌ Failed to generate token:', tokenResult.error);
    }
    
    // Step 5: Test Account Balance
    console.log('💰 Testing account balance...');
    const balanceResult = await MoMoAPIService.getAccountBalance();
    
    if (balanceResult.success) {
      console.log('✅ Account balance retrieved');
      console.log('Balance:', balanceResult.data);
    } else {
      console.log('❌ Failed to get balance:', balanceResult.error);
    }
    
    console.log('\n🎉 MoMo API setup completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Update your .env file with the generated API key if needed');
    console.log('2. Test a small payment to verify everything works');
    console.log('3. When ready for production, change targetEnvironment to "production"');
    
  } catch (error) {
    console.error('💥 Setup failed:', error);
  }
}

// Run the setup
setupMoMoAPI();

// Export for use in other scripts
export default setupMoMoAPI;