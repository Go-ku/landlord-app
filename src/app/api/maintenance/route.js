import { getServerSession } from 'next-auth';
import Maintenance from 'models/Maintenance';
import dbConnect from 'lib/db';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET(request) {
  try {
    // Get session with authOptions
    const session = await getServerSession(authOptions);
    console.log('API Route Session:', session); // Debug log
    
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 10;
    
    const requests = await Maintenance.find({ landlordId: session.user.id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('propertyId', 'address')
      .populate('tenantId', 'name');

    return new Response(JSON.stringify(requests), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Maintenance API Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}