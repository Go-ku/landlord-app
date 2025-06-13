// app/api/settings/system/route.js
import { getToken } from 'next-auth/jwt';
import SystemSettings from 'models/SystemSettings'; // You'll need to create this model
import dbConnect from 'lib/db';

// GET - Fetch system settings
export async function GET(request) {
  try {
    const token = await getUserFromToken(request);
    
    if (!token?.id || (token.role !== 'manager' && token.role !== 'admin')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Find or create default system settings
    let settings = await SystemSettings.findOne();
    
    if (!settings) {
      settings = await SystemSettings.create({
        general: {
          companyName: 'RentEase',
          companyEmail: '',
          companyAddress: '',
          companyPhone: '',
          timezone: 'America/New_York',
          currency: 'USD',
          dateFormat: 'MM/DD/YYYY'
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
            smtpHost: '',
            smtpPort: '587',
            smtpUsername: '',
            smtpPassword: '',
            fromEmail: '',
            fromName: ''
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
          }
        }
      });
    }

    return Response.json({
      success: true,
      settings
    });

  } catch (error) {
    console.error('Error fetching settings:', error);
    return Response.json({ 
      error: 'Failed to fetch settings',
      details: error.message 
    }, { status: 500 });
  }
}

// PUT - Update system settings
export async function PUT(request) {
  try {
    const token = await getUserFromToken(request);
    
    if (!token?.id || (token.role !== 'manager' && token.role !== 'admin')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { type, settings: newSettings } = await request.json();

    if (!type || !newSettings) {
      return Response.json({ 
        error: 'Settings type and settings data are required' 
      }, { status: 400 });
    }

    const updateData = {};
    updateData[type] = newSettings;

    const settings = await SystemSettings.findOneAndUpdate(
      {},
      updateData,
      { new: true, upsert: true, runValidators: true }
    );

    return Response.json({
      success: true,
      settings,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} settings updated successfully`
    });

  } catch (error) {
    console.error('Error updating settings:', error);
    return Response.json({ 
      error: 'Failed to update settings',
      details: error.message 
    }, { status: 500 });
  }
}
