// src/app/api/payments/[id]/verify/route.js - Updated with lease activation
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Payment from 'models/Payment';
import Lease from 'models/Lease';
import User from 'models/User';

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

// POST - Verify or dispute a payment (Enhanced with lease activation)
export async function POST(request, { params }) {
  try {
    await connectDB();
    
    // Await params for Next.js 15 compatibility
    const { id: paymentId } = await params;
    const body = await request.json();
    const { action, notes = '', verifiedBy } = body;
    
    console.log('Payment verification request:', {
      paymentId,
      action,
      notes: notes ? 'provided' : 'none',
      verifiedBy
    });
    
    // Validation
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return NextResponse.json(
        { error: 'Invalid payment ID format' },
        { status: 400 }
      );
    }
    
    if (!action || !['verify', 'dispute'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be either "verify" or "dispute"' },
        { status: 400 }
      );
    }
    
    // Find the payment with populated data
    const payment = await Payment.findById(paymentId)
      .populate({
        path: 'leaseId',
        select: 'propertyId tenantId landlordId monthlyRent balanceDue totalPaid status startDate endDate paymentDueDay'
      })
      .populate('tenantId', 'name firstName lastName email')
      .populate('propertyId', 'address name');
    
    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }
    
    console.log('Found payment:', {
      id: payment._id,
      status: payment.status,
      amount: payment.amount,
      leaseStatus: payment.leaseId?.status,
      tenant: payment.tenantId?.name || `${payment.tenantId?.firstName} ${payment.tenantId?.lastName}`,
      property: payment.propertyId?.address
    });
    
    // Check if payment can be verified/disputed
    if (payment.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot modify cancelled payment' },
        { status: 400 }
      );
    }
    
    // Prepare update data
    const updateData = {
      verifiedAt: new Date(),
      verificationNotes: notes
    };
    
    // Add verifiedBy if provided (current user ID)
    if (verifiedBy && mongoose.Types.ObjectId.isValid(verifiedBy)) {
      updateData.verifiedBy = verifiedBy;
    }
    
    let updatedPayment;
    let leaseUpdateResult = null;
    let leaseActivationResult = null;
    
    if (action === 'verify') {
      // Verify the payment
      updateData.status = 'verified';
      
      // Update payment
      updatedPayment = await Payment.findByIdAndUpdate(
        paymentId,
        updateData,
        { new: true, runValidators: true }
      );
      
      // Update lease balance if payment wasn't already verified
      if (payment.status !== 'verified') {
        leaseUpdateResult = await updateLeaseBalance(payment.leaseId, payment.amount, 'add');
        
        // 🎯 LEASE ACTIVATION LOGIC - Option 3 Implementation
        leaseActivationResult = await checkAndActivateLease(payment.leaseId, payment.amount);
      }
      
      console.log('Payment verified successfully');
      
    } else if (action === 'dispute') {
      // Dispute the payment
      updateData.status = 'disputed';
      
      // Update payment
      updatedPayment = await Payment.findByIdAndUpdate(
        paymentId,
        updateData,
        { new: true, runValidators: true }
      );
      
      // If payment was previously verified, reverse the lease balance
      if (payment.status === 'verified') {
        leaseUpdateResult = await updateLeaseBalance(payment.leaseId, payment.amount, 'subtract');
        
        // Check if lease should be deactivated
        leaseActivationResult = await checkLeaseDeactivation(payment.leaseId);
      }
      
      console.log('Payment disputed successfully');
    }
    
    // Populate the response with complete data
    const populatedPayment = await Payment.findById(updatedPayment._id)
      .populate({
        path: 'leaseId',
        select: 'propertyId tenantId landlordId monthlyRent balanceDue totalPaid status startDate endDate',
        populate: [
          { path: 'propertyId', select: 'address name type' },
          { path: 'tenantId', select: 'name firstName lastName email phone' }
        ]
      })
      .populate('tenantId', 'name firstName lastName email phone')
      .populate('propertyId', 'address name type')
      .populate('verifiedBy', 'name firstName lastName email');
    
    // Prepare response
    const response = {
      success: true,
      message: action === 'verify' 
        ? 'Payment verified successfully' 
        : 'Payment disputed successfully',
      payment: populatedPayment
    };
    
    // Add lease update info if available
    if (leaseUpdateResult) {
      response.leaseUpdate = leaseUpdateResult;
    }
    
    // Add lease activation info if available
    if (leaseActivationResult) {
      response.leaseActivation = leaseActivationResult;
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error in payment verification:', error);
    
    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      );
    }
    
    if (error.name === 'CastError') {
      return NextResponse.json(
        { error: 'Invalid data format', details: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to process payment verification', details: error.message },
      { status: 500 }
    );
  }
}

// 🎯 LEASE ACTIVATION FUNCTION - Core of Option 3
async function checkAndActivateLease(lease, paymentAmount) {
  try {
    console.log('Checking lease activation for:', lease._id, 'Payment amount:', paymentAmount);
    
    // Only activate if lease is currently in draft status
    if (lease.status !== 'draft') {
      console.log('Lease already active or not eligible for activation. Status:', lease.status);
      return null;
    }
    
    // Check if lease period has started or is starting soon
    const today = new Date();
    const leaseStartDate = new Date(lease.startDate);
    const daysUntilStart = Math.ceil((leaseStartDate - today) / (1000 * 60 * 60 * 24));
    
    // Activate if:
    // 1. Lease has started (start date is today or in the past)
    // 2. OR lease starts within next 7 days (early activation)
    const shouldActivate = daysUntilStart <= 7;
    
    if (!shouldActivate) {
      console.log(`Lease starts in ${daysUntilStart} days. Not activating yet.`);
      return {
        action: 'pending',
        reason: `Lease will auto-activate when start date (${leaseStartDate.toLocaleDateString()}) approaches`,
        daysUntilStart
      };
    }
    
    // Calculate next payment due date
    const nextPaymentDue = calculateNextPaymentDue(lease);
    
    // Activate the lease
    const activationData = {
      status: 'active',
      activatedAt: new Date(),
      nextPaymentDue: nextPaymentDue
    };
    
    const updatedLease = await Lease.findByIdAndUpdate(
      lease._id,
      activationData,
      { new: true }
    );
    
    console.log(`🎉 Lease activated! ID: ${lease._id}`);
    
    return {
      action: 'activated',
      reason: 'First payment verified - lease is now active',
      activatedAt: activationData.activatedAt,
      nextPaymentDue: nextPaymentDue,
      leaseId: updatedLease._id,
      daysUntilStart
    };
    
  } catch (error) {
    console.error('Error in lease activation check:', error);
    return {
      action: 'error',
      reason: 'Failed to check lease activation',
      error: error.message
    };
  }
}

// Check if lease should be deactivated (when payments are disputed)
async function checkLeaseDeactivation(lease) {
  try {
    // Only check if lease is currently active
    if (lease.status !== 'active') {
      return null;
    }
    
    // Check if there are any verified payments left
    const verifiedPayments = await Payment.find({
      leaseId: lease._id,
      status: 'verified'
    });
    
    // If no verified payments remain, consider deactivating
    if (verifiedPayments.length === 0) {
      console.log(`No verified payments remain for lease ${lease._id}. Consider manual review.`);
      
      return {
        action: 'review_required',
        reason: 'No verified payments remain - manual review recommended',
        leaseId: lease._id,
        suggestion: 'Consider setting lease back to draft status'
      };
    }
    
    return null;
    
  } catch (error) {
    console.error('Error checking lease deactivation:', error);
    return {
      action: 'error',
      reason: 'Failed to check lease deactivation',
      error: error.message
    };
  }
}

// Calculate next payment due date based on lease terms
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

// Helper function to update lease balance (existing function)
async function updateLeaseBalance(lease, paymentAmount, operation) {
  try {
    const currentBalance = lease.balanceDue || 0;
    const currentTotalPaid = lease.totalPaid || 0;
    
    let newBalance, newTotalPaid;
    
    if (operation === 'add') {
      // Adding verified payment - reduce balance, increase total paid
      newBalance = Math.max(0, currentBalance - paymentAmount);
      newTotalPaid = currentTotalPaid + paymentAmount;
    } else if (operation === 'subtract') {
      // Removing verified payment - increase balance, decrease total paid
      newBalance = currentBalance + paymentAmount;
      newTotalPaid = Math.max(0, currentTotalPaid - paymentAmount);
    } else {
      throw new Error('Invalid operation: must be "add" or "subtract"');
    }
    
    // Update lease
    const updateData = {
      balanceDue: newBalance,
      totalPaid: newTotalPaid,
      lastPaymentDate: operation === 'add' ? new Date() : lease.lastPaymentDate
    };
    
    const updatedLease = await Lease.findByIdAndUpdate(
      lease._id,
      updateData,
      { new: true }
    );
    
    console.log(`Lease ${lease._id} balance updated:`, {
      operation,
      paymentAmount,
      oldBalance: currentBalance,
      newBalance,
      oldTotalPaid: currentTotalPaid,
      newTotalPaid
    });
    
    return {
      leaseId: updatedLease._id,
      operation,
      paymentAmount,
      previousBalance: currentBalance,
      newBalance,
      previousTotalPaid: currentTotalPaid,
      newTotalPaid
    };
    
  } catch (error) {
    console.error('Error updating lease balance:', error);
    throw error;
  }
}

// GET - Get payment verification history (existing function)
export async function GET(request, { params }) {
  try {
    await connectDB();
    
    // Await params for Next.js 15 compatibility
    const { id: paymentId } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return NextResponse.json(
        { error: 'Invalid payment ID format' },
        { status: 400 }
      );
    }
    
    // Find payment with verification details
    const payment = await Payment.findById(paymentId)
      .populate('verifiedBy', 'name firstName lastName email')
      .select('status verifiedAt verificationNotes verifiedBy createdAt updatedAt');
    
    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }
    
    // Build verification history
    const verificationHistory = {
      paymentId: payment._id,
      currentStatus: payment.status,
      createdAt: payment.createdAt,
      lastUpdated: payment.updatedAt,
      verification: null
    };
    
    // Add verification details if available
    if (payment.verifiedAt) {
      verificationHistory.verification = {
        verifiedAt: payment.verifiedAt,
        verifiedBy: payment.verifiedBy,
        notes: payment.verificationNotes,
        action: payment.status === 'verified' ? 'verified' : 'disputed'
      };
    }
    
    return NextResponse.json(verificationHistory);
    
  } catch (error) {
    console.error('Error fetching payment verification history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch verification history', details: error.message },
      { status: 500 }
    );
  }
}