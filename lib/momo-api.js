// lib/momo-api.js - MTN MoMo API Service
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

class MoMoAPIService {
  constructor() {
    this.baseURL = process.env.MTN_API_BASE_URL;
    this.apiUser = process.env.MTN_API_USER;
    this.apiKey = process.env.MTN_API_KEY;
    this.subscriptionKey = process.env.MTN_SUBSCRIPTION_KEY;
    this.targetEnvironment = 'sandbox'; // Change to 'production' for live
  }

  // Create API User (run once during setup)
  async createAPIUser() {
    try {
      const referenceId = uuidv4();
      
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
      console.error('Error creating API user:', error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }

  // Get API User Info
  async getAPIUser() {
    try {
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
      console.error('Error getting API user:', error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }

  // Create API Key for the user
  async createAPIKey() {
    try {
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
      console.error('Error creating API key:', error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }

  // Generate Access Token
  async generateAccessToken() {
    try {
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
      console.error('Error generating access token:', error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }

  // Request to Pay
  async requestToPay(paymentData) {
    try {
      // Generate access token first
      const tokenResult = await this.generateAccessToken();
      if (!tokenResult.success) {
        return tokenResult;
      }
      console.log(tokenResult)
      const referenceId = uuidv4();
      
      const requestBody = {
        amount: paymentData.amount.toString(),
        currency: 'EUR',
        externalId: paymentData.externalId || referenceId,
        payer: {
          partyIdType: 'MSISDN',
          partyId: paymentData.phoneNumber.replace(/^\+/, '') // Remove + if present
        },
        payerMessage: paymentData.payerMessage || 'Rent Payment',
        payeeNote: paymentData.payeeNote || 'Payment for property rental'
      };

      const response = await axios.post(
        `${this.baseURL}/collection/v1_0/requesttopay`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${tokenResult.token}`,
            'X-Reference-Id': referenceId,
            'X-Target-Environment': this.targetEnvironment,
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return { 
        success: true, 
        referenceId,
        data: response.data,
        status: response.status 
      };
    } catch (error) {
      console.error('Error requesting payment:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data || error.message,
        status: error.response?.status 
      };
    }
  }

  // Check Payment Status
  async getPaymentStatus(referenceId) {
    try {
      const tokenResult = await this.generateAccessToken();
      if (!tokenResult.success) {
        return tokenResult;
      }
      console.log('token form requeststatus', tokenResult)
      const response = await axios.get(
        `${this.baseURL}/collection/v1_0/requesttopay/${referenceId}`,
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
      console.error('Error checking payment status:', error.response?.data || error.message);
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
      console.error('Error getting account balance:', error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }

  // Validate Phone Number Format
  validatePhoneNumber(phoneNumber) {
    console.log(phoneNumber)
    // Zambian phone number validation (260XXXXXXXXX or starting with +260)
    const zambianPhoneRegex = /^(\+260|260)?[79]\d{8}$/;
    return zambianPhoneRegex.test(phoneNumber);
  }

  // Format Phone Number for MoMo
  formatPhoneNumber(phoneNumber) {
    // Remove any spaces, dashes, or other characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // If it starts with +260 or 260, remove the country code
    if (cleaned.startsWith('260')) {
      cleaned = cleaned.substring(3);
    }
    
    // Add 260 country code
    return `260${cleaned}`;
  }
}
const momoService = new MoMoAPIService();
export default momoService