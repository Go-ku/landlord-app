import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import dbConnect from 'lib/db';
import Payment from 'models/Payment';
import Invoice from 'models/Invoice';
import Property from 'models/Property';

// Helper function to check approval permissions
async function checkApprovalPermission(session, propertyId) {
  if (!session?.user?.id || !['manager', 'landlord'].includes(session.user.role)) {
    return false;
  }

  await dbConnect();

  if (session.user.role === 'landlord') {
    // Landlords can only approve for their own properties
    const property = await Property.findById(propertyId);
    return property && property.landlord.toString() === session.user.id;
  }

  // Managers can approve for all properties (if they have the permission)
  if (session.user.role === 'manager') {
    return session.user.permissions?.includes('approve_payments') || 
           session.user.permissions?.includes('approve_invoices');
  }

  return false;
}

// GET /api/manager/approvals/[type]/[id] - Get specific item for approval
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const { type, id } = params;

    if (!session?.user?.id || !['manager', 'landlord'].includes(session.user.role)) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - Manager or Landlord permissions required'
      }, { status: 403 });
    }

    await dbConnect();

    let item;
    let Model;

    if (type === 'payment') {
      Model = Payment;
    } else if (type === 'invoice') {
      Model = Invoice;
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid type. Must be "payment" or "invoice"'
      }, { status: 400 });
    }

    // Get the item with populated references
    item = await Model.findById(id)
      .populate('tenant', 'name email phone')
      .populate('property', 'address type landlord')
      .populate('recordedBy createdBy', 'name email')
      .populate('approvalHistory.by', 'name');

    if (!item) {
      return NextResponse.json({
        success: false,
        error: `${type.charAt(0).toUpperCase() + type.slice(1)} not found`
      }, { status: 404 });
    }

    // Check permission for this specific property
    const hasPermission = await checkApprovalPermission(session, item.property._id);
    if (!hasPermission) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions for this property'
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: item
    });

  } catch (error) {
    console.error('Error fetching approval item:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch item',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

// POST /api/manager/approvals/[type]/[id] - Approve or reject item
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const { type, id } = params;

    if (!session?.user?.id || !['manager', 'landlord'].includes(session.user.role)) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - Manager or Landlord permissions required'
      }, { status: 403 });
    }

    await dbConnect();

    const data = await request.json();
    const { action, notes } = data; // action: 'approve', 'reject', 'request_changes'

    if (!['approve', 'reject', 'request_changes'].includes(action)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Must be "approve", "reject", or "request_changes"'
      }, { status: 400 });
    }

    let item;
    let Model;

    if (type === 'payment') {
      Model = Payment;
    } else if (type === 'invoice') {
      Model = Invoice;
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid type. Must be "payment" or "invoice"'
      }, { status: 400 });
    }

    // Get the item
    item = await Model.findById(id).populate('property', 'landlord');

    if (!item) {
      return NextResponse.json({
        success: false,
        error: `${type.charAt(0).toUpperCase() + type.slice(1)} not found`
      }, { status: 404 });
    }

    // Check permission for this specific property
    const hasPermission = await checkApprovalPermission(session, item.property._id);
    if (!hasPermission) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions for this property'
      }, { status: 403 });
    }

    // Check if item is in pending status
    if (item.approvalStatus !== 'pending') {
      return NextResponse.json({
        success: false,
        error: `${type.charAt(0).toUpperCase() + type.slice(1)} is not pending approval`
      }, { status: 400 });
    }

    // Perform the action
    switch (action) {
      case 'approve':
        item.approve(session.user.id, notes);
        break;
      case 'reject':
        item.reject(session.user.id, notes);
        break;
      case 'request_changes':
        item.requestChanges(session.user.id, notes);
        break;
    }

    await item.save();

    // Populate and return updated item
    const updatedItem = await Model.findById(id)
      .populate('tenant', 'name email')
      .populate('property', 'address')
      .populate('approvedBy', 'name');

    return NextResponse.json({
      success: true,
      data: updatedItem,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} ${action}d successfully`
    });

  } catch (error) {
    console.error('Error processing approval:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process approval',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}