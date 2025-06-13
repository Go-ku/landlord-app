// app/api/settings/backup/route.js
import { getToken } from 'next-auth/jwt';
import User from 'models/User';
import Property from 'models/Property';
import Lease from 'models/Lease';
import Payment from 'models/StripePayment';
import Maintenance from 'models/Maintenance';
import SystemSettings from 'models/SystemSettings';
import dbConnect from 'lib/db';

// POST - Create system backup
export async function POST(request) {
  try {
    const token = await getUserFromToken(request);
    
    if (!token?.id || token.role !== 'manager') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Fetch all data (excluding sensitive information)
    const [users, properties, leases, payments, maintenance, settings] = await Promise.all([
      User.find().select('-password').lean(),
      Property.find().lean(),
      Lease.find().lean(),
      Payment.find().lean(),
      Maintenance.find().lean(),
      SystemSettings.findOne().lean()
    ]);

    const backupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: {
        users,
        properties,
        leases,
        payments,
        maintenance,
        settings
      }
    };

    const backupJson = JSON.stringify(backupData, null, 2);
    
    return new Response(backupJson, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="rentease-backup-${new Date().toISOString().split('T')[0]}.json"`
      }
    });

  } catch (error) {
    console.error('Error creating backup:', error);
    return Response.json({ 
      error: 'Failed to create backup',
      details: error.message 
    }, { status: 500 });
  }
}
