// scripts/setup-momo.cjs - CommonJS version for easier execution
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class MoMoAPIService {
  constructor() {
    this.baseURL = process.env.MTN_API_BASE_URL;
    this.apiUser = process.env.MTN_API_USER;
    this.apiKey = process.env.MTN_API_KEY;
    this.subscriptionKey = process.env.MTN_SUBSCRIPTION_KEY;
    this.targetEnvironment = 'sandbox';
    
    console.log('🔧 Configuration loaded:');
    console.log('Base URL:', this.baseURL);
    console.log('API User:', this.apiUser);
    console.log('Subscription Key:', this.subscriptionKey ? `${this.subscriptionKey.substring(0, 8)}...` : 'NOT SET');
    console.log('API Key:', this.apiKey ? `${this.apiKey.substring(0, 8)}...` : 'NOT SET');
    console.log('');
  }

  // Create API User (run once during setup)
  async createAPIUser() {
    try {
      if (!this.baseURL || !this.subscriptionKey) {
        throw new Error('Missing required environment variables: MTN_API_BASE_URL or MTN_SUBSCRIPTION_KEY');
      }

      const referenceId = uuidv4();
      console.log('Using Reference ID:', referenceId);
      
      const response = await axios.post(
        `${this.baseURL}/v1_0/apiuser`,
        {
          providerCallbackHost: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        },
        {
          headers: {
            'X-Reference-Id': referenceId,
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return { success: true, referenceId, data: response.data };
    } catch (error) {
      const errorMsg = error.response?.data || error.message;
      console.error('Full error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });
      return { success: false, error: errorMsg };
    }
  }

  // Get API User Info
  async getAPIUser() {
    try {
      if (!this.baseURL || !this.subscriptionKey || !this.apiUser) {
        throw new Error('Missing required environment variables');
      }

      const response = await axios.get(
        `${this.baseURL}/v1_0/apiuser/${this.apiUser}`,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.subscriptionKey
          }
        }
      );

      return { success: true, data: response.data };
    } catch (error) {
      console.error('Full error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      return { success: false, error: error.response?.data || error.message };
    }
  }

  // Create API Key for the user
  async createAPIKey() {
    try {
      if (!this.baseURL || !this.subscriptionKey || !this.apiUser) {
        throw new Error('Missing required environment variables');
      }

      const response = await axios.post(
        `${this.baseURL}/v1_0/apiuser/${this.apiUser}/apikey`,
        {},
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.subscriptionKey
          }
        }
      );

      return { success: true, data: response.data };
    } catch (error) {
      console.error('Full error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      return { success: false, error: error.response?.data || error.message };
    }
  }

  // Generate Access Token
  async generateAccessToken() {
    try {
      if (!this.baseURL || !this.subscriptionKey || !this.apiUser || !this.apiKey) {
        throw new Error('Missing required environment variables for token generation');
      }

      const credentials = Buffer.from(`${this.apiUser}:${this.apiKey}`).toString('base64');
      
      const response = await axios.post(
        `${this.baseURL}/collection/token/`,
        {},
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'X-Target-Environment': this.targetEnvironment
          }
        }
      );

      return { success: true, token: response.data.access_token };
    } catch (error) {
      console.error('Full error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      return { success: false, error: error.response?.data || error.message };
    }
  }

  // Get Account Balance
  async getAccountBalance() {
    try {
      const tokenResult = await this.generateAccessToken();
      if (!tokenResult.success) {
        return tokenResult;
      }

      const response = await axios.get(
        `${this.baseURL}/collection/v1_0/account/balance`,
        {
          headers: {
            'Authorization': `Bearer ${tokenResult.token}`,
            'X-Target-Environment': this.targetEnvironment,
            'Ocp-Apim-Subscription-Key': this.subscriptionKey
          }
        }
      );

      return { success: true, data: response.data };
    } catch (error) {
      console.error('Full error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      return { success: false, error: error.response?.data || error.message };
    }
  }
}

async function setupMoMoAPI() {
  console.log('🚀 Setting up MTN MoMo API...');
  console.log('');
  
  const momoService = new MoMoAPIService();
  
  // Check if required environment variables are set
  if (!process.env.MTN_API_BASE_URL) {
    console.log('❌ MTN_API_BASE_URL is not set in environment variables');
    return;
  }
  
  if (!process.env.MTN_SUBSCRIPTION_KEY) {
    console.log('❌ MTN_SUBSCRIPTION_KEY is not set in environment variables');
    return;
  }

  try {
    // // Step 1: Create API User
    // console.log('📝 Creating API User...');
    // const userResult = await momoService.createAPIUser();
    
    // if (userResult.success) {
    //   console.log('✅ API User created successfully');
    //   console.log('📋 Reference ID:', userResult.referenceId);
    //   console.log('💡 Note: You may need to update MTN_API_USER in your .env file to:', userResult.referenceId);
    // } else {
    //   console.log('❌ Failed to create API user:', userResult.error);
      
    //   // If user already exists, that's okay - continue with other steps
    //   if (userResult.error.toString().includes('already exists') || 
    //       userResult.error.toString().includes('409')) {
    //     console.log('💡 User already exists, continuing...');
    //   }
    // }
    // console.log('');
    
    // // Step 2: Get API User Info
    // console.log('📋 Getting API User info...');
    // const userInfo = await momoService.getAPIUser();
    
    // if (userInfo.success) {
    //   console.log('✅ API User info retrieved');
    //   console.log('🎯 Target Environment:', userInfo.data.targetEnvironment);
    //   console.log('📊 User Details:', JSON.stringify(userInfo.data, null, 2));
    // } else {
    //   console.log('❌ Failed to get API user info:', userInfo.error);
    // }
    // console.log('');
    
    // // Step 3: Create API Key
    // console.log('🔑 Creating API Key...');
    // const keyResult = await momoService.createAPIKey();
    
    // if (keyResult.success) {
    //   console.log('✅ API Key created successfully');
    //   console.log('🔐 API Key:', keyResult.data.apiKey);
    //   console.log('⚠️  IMPORTANT: Update MTN_API_KEY in your .env file with:', keyResult.data.apiKey);
    // } else {
    //   console.log('❌ Failed to create API key:', keyResult.error);
      
    //   if (keyResult.error.toString().includes('already exists') || 
    //       keyResult.error.toString().includes('409')) {
    //     console.log('💡 API key already exists, using existing key from .env');
    //   }
    // }
    // console.log('');
    
    // Step 4: Test Token Generation
    console.log('🔐 Testing token generation...');
    const tokenResult = await momoService.generateAccessToken();
    
    if (tokenResult.success) {
      console.log('✅ Access token generated successfully');
      console.log('🎫 Token (first 30 chars):', tokenResult.token);
    } else {
      console.log('❌ Failed to generate token:', tokenResult.error);
      console.log('💡 This might be because the API key needs to be updated');
    }
    console.log('');
    
    // Step 5: Test Account Balance (only if token generation worked)
    if (tokenResult.success) {
      console.log('💰 Testing account balance...');
      const balanceResult = await momoService.getAccountBalance();
      
      if (balanceResult.success) {
        console.log('✅ Account balance retrieved');
        console.log('💵 Balance Info:', JSON.stringify(balanceResult.data, null, 2));
      } else {
        console.log('❌ Failed to get balance:', balanceResult.error);
      }
      console.log('');
    }
    
    console.log('🎉 MoMo API setup completed!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. If any API keys were generated, update your .env file');
    console.log('2. Restart your application to load new environment variables');
    console.log('3. Test a small payment to verify everything works');
    console.log('4. When ready for production, change MTN_API_BASE_URL to production URL');
    console.log('');
    console.log('🔧 Current .env should contain:');
    console.log('MTN_API_BASE_URL=https://sandbox.momoapi.mtn.com');
    console.log('MTN_API_USER=<your_api_user>');
    console.log('MTN_API_KEY=<your_api_key>');
    console.log('MTN_SUBSCRIPTION_KEY=<your_subscription_key>');
    
  } catch (error) {
    console.error('💥 Setup failed with unexpected error:', error);
  }
}

// Run the setup
setupMoMoAPI();