// app/api/payments/[id]/route.js
import Payment from 'models/Payment';
import dbConnect from '@/lib/db';

export async function GET(req, { params }) {
  await dbConnect();
  
  try {
    const payment = await Payment.findById(params.id)
      .populate('tenantId', 'name email')
      .populate('propertyId', 'address');
      
    if (!payment) {
      return Response.json({ error: 'Payment not found' }, { status: 404 });
    }
    
    return Response.json(payment);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}