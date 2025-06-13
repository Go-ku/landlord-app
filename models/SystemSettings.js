// models/SystemSettings.js (Mongoose Schema)

import mongoose from 'mongoose';

const SystemSettingsSchema = new mongoose.Schema({
  general: {
    companyName: { type: String, default: 'RentEase' },
    companyEmail: { type: String, default: '' },
    companyAddress: { type: String, default: '' },
    companyPhone: { type: String, default: '' },
    timezone: { type: String, default: 'America/New_York' },
    currency: { type: String, default: 'USD' },
    dateFormat: { type: String, default: 'MM/DD/YYYY' },
    maintenanceHours: {
      start: { type: String, default: '08:00' },
      end: { type: String, default: '17:00' }
    }
  },
  notifications: {
    emailTemplates: {
      welcome: { type: Boolean, default: true },
      paymentReminder: { type: Boolean, default: true },
      maintenanceUpdate: { type: Boolean, default: true },
      leaseExpiry: { type: Boolean, default: true }
    },
    automationRules: {
      latePaymentReminders: { type: Boolean, default: true },
      maintenanceFollowup: { type: Boolean, default: true },
      leaseRenewalNotices: { type: Boolean, default: true }
    },
    emailSettings: {
      smtpHost: { type: String, default: '' },
      smtpPort: { type: String, default: '587' },
      smtpUsername: { type: String, default: '' },
      smtpPassword: { type: String, default: '' },
      fromEmail: { type: String, default: '' },
      fromName: { type: String, default: '' }
    }
  },
  payments: {
    stripe: {
      publishableKey: { type: String, default: '' },
      secretKey: { type: String, default: '' },
      webhookSecret: { type: String, default: '' }
    },
    paymentMethods: {
      creditCard: { type: Boolean, default: true },
      bankTransfer: { type: Boolean, default: true },
      check: { type: Boolean, default: false }
    },
    lateFees: {
      enabled: { type: Boolean, default: true },
      gracePeriod: { type: Number, default: 5 },
      feeAmount: { type: Number, default: 50 },
      feeType: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' }
    }
  },
  security: {
    passwordPolicy: {
      minLength: { type: Number, default: 8 },
      requireUppercase: { type: Boolean, default: true },
      requireLowercase: { type: Boolean, default: true },
      requireNumbers: { type: Boolean, default: true },
      requireSpecialChars: { type: Boolean, default: false }
    },
    sessionSettings: {
      sessionTimeout: { type: Number, default: 24 },
      maxConcurrentSessions: { type: Number, default: 3 }
    },
    twoFactorAuth: {
      enabled: { type: Boolean, default: false },
      required: { type: Boolean, default: false }
    }
  }
}, {
  timestamps: true
});

export default mongoose.models.SystemSettings || mongoose.model('SystemSettings', SystemSettingsSchema);
