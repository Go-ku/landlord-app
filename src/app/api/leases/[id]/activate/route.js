// src/app/api/leases/[id]/activate/route.js - Manual activation override
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Lease from 'models/Lease';

// Connect to MongoDB
async function connectDB() {
  if (mongoose.connections[0].readyState) {
    return;
  }
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// POST - Manually activate a lease (override for special cases)
export async function POST(request, { params }) {
  try {
    await connectDB();
    
    // Await params for Next.js 15 compatibility
    const { id: leaseId } = await params;
    const body = await request.json();
    const { action, reason = '', activatedBy } = body;
    
    console.log('Manual lease activation request:', {
      leaseId,
      action,
      reason: reason ? 'provided' : 'none',
      activatedBy
    });
    
    // Validation
    if (!mongoose.Types.ObjectId.isValid(leaseId)) {
      return NextResponse.json(
        { error: 'Invalid lease ID format' },
        { status: 400 }
      );
    }
    
    if (!action || !['activate', 'deactivate'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be either "activate" or "deactivate"' },
        { status: 400 }
      );
    }
    
    // Find the lease
    const lease = await Lease.findById(leaseId)
      .populate('propertyId', 'address name')
      .populate('tenantId', 'name firstName lastName email')
      .populate('landlordId', 'name firstName lastName email');
    
    if (!lease) {
      return NextResponse.json(
        { error: 'Lease not found' },
        { status: 404 }
      );
    }
    
    console.log('Found lease:', {
      id: lease._id,
      currentStatus: lease.status,
      property: lease.propertyId?.address,
      tenant: lease.tenantId?.name || `${lease.tenantId?.firstName} ${lease.tenantId?.lastName}`
    });
    
    let updateData = {};
    let responseMessage = '';
    
    if (action === 'activate') {
      // Manual activation
      if (lease.status === 'active') {
        return NextResponse.json(
          { error: 'Lease is already active' },
          { status: 400 }
        );
      }
      
      if (lease.status === 'terminated' || lease.status === 'expired') {
        return NextResponse.json(
          { error: 'Cannot activate terminated or expired lease' },
          { status: 400 }
        );
      }
      
      // Calculate next payment due
      const nextPaymentDue = calculateNextPaymentDue(lease);
      
      updateData = {
        status: 'active',
        activatedAt: new Date(),
        nextPaymentDue: nextPaymentDue,
        activationMethod: 'manual',
        activationReason: reason || 'Manual activation by landlord',
        activatedBy: activatedBy || null
      };
      
      responseMessage = 'Lease activated successfully';
      
    } else if (action === 'deactivate') {
      // Manual deactivation (back to draft)
      if (lease.status !== 'active') {
        return NextResponse.json(
          { error: 'Only active leases can be deactivated' },
          { status: 400 }
        );
      }
      
      updateData = {
        status: 'draft',
        deactivatedAt: new Date(),
        deactivationReason: reason || 'Manual deactivation by landlord',
        deactivatedBy: activatedBy || null
      };
      
      responseMessage = 'Lease deactivated successfully';
    }
    
    // Update the lease
    const updatedLease = await Lease.findByIdAndUpdate(
      leaseId,
      updateData,
      { new: true, runValidators: true }
    );
    
    // Populate the response
    const populatedLease = await Lease.findById(updatedLease._id)
      .populate('propertyId', 'address name type')
      .populate('tenantId', 'name firstName lastName email phone')
      .populate('landlordId', 'name firstName lastName email');
    
    console.log(`Lease ${action}d successfully:`, updatedLease._id);
    
    return NextResponse.json({
      success: true,
      message: responseMessage,
      lease: populatedLease,
      action: action,
      method: 'manual',
      timestamp: new Date(),
      reason: reason
    });
    
  } catch (error) {
    console.error('Error in manual lease activation:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update lease status', details: error.message },
      { status: 500 }
    );
  }
}

// Calculate next payment due date
function calculateNextPaymentDue(lease) {
  const today = new Date();
  const startDate = new Date(lease.startDate);
  const paymentDueDay = lease.paymentDueDay || 1;
  
  // If lease hasn't started yet, first payment is due on start date's payment day
  if (startDate > today) {
    const firstPaymentDue = new Date(startDate);
    firstPaymentDue.setDate(paymentDueDay);
    
    // If the due day is before the start date, move to next month
    if (firstPaymentDue < startDate) {
      firstPaymentDue.setMonth(firstPaymentDue.getMonth() + 1);
    }
    
    return firstPaymentDue;
  }
  
  // Lease has started - calculate next payment due
  const nextPayment = new Date();
  nextPayment.setDate(paymentDueDay);
  
  // If this month's payment day has passed, move to next month
  if (nextPayment <= today) {
    nextPayment.setMonth(nextPayment.getMonth() + 1);
  }
  
  return nextPayment;
}