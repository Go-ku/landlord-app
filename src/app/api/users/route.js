// app/api/users/route.js - Fixed Complete User API
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { hash } from 'bcryptjs';
import User from 'models/User';
import Payment from 'models/StripePayment';
import Maintenance from 'models/Maintenance';
import Property from 'models/Property';
import Lease from 'models/Lease';
import dbConnect from 'lib/db';
import { authOptions } from '../auth/[...nextauth]/route';

// Helper function to get user from token (more reliable than getServerSession for API routes)
async function getUserFromToken(request) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });
    return token;
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
}

// FIXED: Helper function to calculate stats for consistent API responses
async function calculateUserStats() {
  try {
    // Calculate role statistics
    const roleStats = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const roleStatsMap = roleStats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    // Calculate status statistics
    const statusStats = await User.aggregate([
      { $group: { _id: '$isActive', count: { $sum: 1 } } }
    ]);

    const activeCount = statusStats.find(s => s._id === true)?.count || 0;
    const inactiveCount = statusStats.find(s => s._id === false)?.count || 0;

    return {
      roles: {
        landlord: roleStatsMap.landlord || 0,
        manager: roleStatsMap.manager || 0,
        admin: roleStatsMap.admin || 0,
        tenant: roleStatsMap.tenant || 0
      },
      status: {
        active: activeCount,
        inactive: inactiveCount
      }
    };
  } catch (error) {
    console.error('Error calculating user stats:', error);
    return {
      roles: { landlord: 0, manager: 0, admin: 0, tenant: 0 },
      status: { active: 0, inactive: 0 }
    };
  }
}

// GET - Fetch users with enhanced manager functionality
export async function GET(request) {
  try {
    const token = await getUserFromToken(request);
    
    if (!token?.id) {
      return Response.json({ error: 'Unauthorized - No valid session' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const landlordId = searchParams.get('landlordId');
    const includeDetails = searchParams.get('includeDetails') === 'true';
    
    // NEW: Manager-specific parameters for advanced user management
    const isManagerView = searchParams.get('managerView') === 'true';
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Manager advanced user management
    if (token.role === 'manager' && isManagerView) {
      return await getManagerUserManagement(searchParams, page, limit);
    }

    // If user is requesting their own data (tenant dashboard)
    if (token.role === 'tenant' && !role && !landlordId) {
      return await getTenantDashboardData(token.id);
    }

    // If user is a landlord requesting their tenants
    if (token.role === 'landlord') {
      return await getLandlordUsers(token.id, role, includeDetails);
    }

    // If user is requesting all users (basic admin functionality)
    if (token.role === 'manager' || token.role === 'landlord') {
      return await getAllUsers(token.id, role, landlordId);
    }

    return Response.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });

  } catch (error) {
    console.error('GET /api/users error:', error);
    return Response.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}

// Enhanced manager user management with filtering, pagination, search
async function getManagerUserManagement(searchParams, page, limit) {
  try {
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build filter object
    const filter = {};
    
    if (role && role !== 'all') {
      filter.role = role;
    }
    
    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute queries
    const [users, totalCount] = await Promise.all([
      User.find(filter)
        .select('-password') // Exclude password field
        .populate('supervisedBy', 'name email')
        .populate('assignedProperties.property', 'address')
        .populate('assignedProperties.assignedBy', 'name')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter)
    ]);

    // FIXED: Calculate stats using helper function
    const stats = await calculateUserStats();

    return Response.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          limit
        },
        stats
      }
    });
  } catch (error) {
    console.error('Error in getManagerUserManagement:', error);
    throw error;
  }
}

// EXISTING: GET tenant dashboard data
async function getTenantDashboardData(userId) {
  try {
    const user = await User.findById(userId)
      .populate('currentProperty', 'address type monthlyRent landlord')
      .populate('currentLease')
      .lean();

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Get tenant's payments, maintenance requests, and lease info
    const [payments, maintenanceRequests, lease] = await Promise.all([
      Payment.find({ tenantId: userId })
        .populate('propertyId', 'address')
        .sort({ dueDate: -1 })
        .limit(10)
        .lean(),

      Maintenance.find({ tenantId: userId })
        .populate('propertyId', 'address')
        .sort({ dateReported: -1 })
        .limit(10)
        .lean(),

      user.currentLease ? Lease.findById(user.currentLease)
        .populate('propertyId', 'address type amenities')
        .populate('landlordId', 'name email phone')
        .lean() : null
    ]);

    return Response.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          currentProperty: user.currentProperty
        },
        lease,
        payments,
        maintenanceRequests,
        stats: {
          totalPayments: payments.length,
          paidPayments: payments.filter(p => p.status === 'paid' || p.status === 'completed').length,
          pendingPayments: payments.filter(p => p.status === 'pending').length,
          maintenanceRequests: maintenanceRequests.length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching tenant dashboard data:', error);
    throw error;
  }
}

// FIXED: GET landlord's users (tenants, managers, etc.) - now returns consistent format
async function getLandlordUsers(landlordId, role, includeDetails) {
  try {
    let filter = {};
    
    if (role) {
      filter.role = role;
    }

    // If looking for tenants, get those in landlord's properties
    if (role === 'tenant') {
      const landlordProperties = await Property.find({ landlord: landlordId }).select('_id');
      const propertyIds = landlordProperties.map(p => p._id);
      filter.currentProperty = { $in: propertyIds };
    }

    let query = User.find(filter)
      .select('name email phone role currentProperty currentLease isActive createdAt')
      .sort({ createdAt: -1 });

    if (includeDetails) {
      query = query
        .populate('currentProperty', 'address type monthlyRent')
        .populate('currentLease', 'monthlyRent startDate endDate status');
    }

    const users = await query.lean();

    // FIXED: Calculate stats for consistent response format
    const stats = await calculateUserStats();

    return Response.json({
      success: true,
      data: {
        users,
        stats,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: users.length,
          limit: users.length
        }
      },
      count: users.length
    });
  } catch (error) {
    console.error('Error fetching landlord users:', error);
    throw error;
  }
}

// FIXED: GET all users (for managers/admins) - now returns consistent format
async function getAllUsers(userId, role, landlordId) {
  try {
    let filter = { isActive: true };
    
    if (role) {
      filter.role = role;
    }

    if (landlordId) {
      // Get users associated with specific landlord
      const landlordProperties = await Property.find({ landlord: landlordId }).select('_id');
      const propertyIds = landlordProperties.map(p => p._id);
      filter.currentProperty = { $in: propertyIds };
    }

    const users = await User.find(filter)
      .select('name email phone role currentProperty isActive createdAt')
      .populate('currentProperty', 'address type')
      .sort({ createdAt: -1 })
      .lean();

    // FIXED: Calculate stats for consistent response format
    const stats = await calculateUserStats();

    return Response.json({
      success: true,
      data: {
        users,
        stats,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: users.length,
          limit: users.length
        }
      },
      count: users.length
    });
  } catch (error) {
    console.error('Error fetching all users:', error);
    throw error;
  }
}

// ENHANCED: POST - Create new user (keeping existing logic + manager enhancements)
export async function POST(request) {
  try {
    const token = await getUserFromToken(request);
    
    if (!token?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.email || !body.role) {
      return Response.json(
        { error: 'Name, email, and role are required' }, 
        { status: 400 }
      );
    }

    // Enhanced permission checking
    if (token.role === 'landlord' && body.role !== 'tenant') {
      return Response.json(
        { error: 'Landlords can only create tenant accounts' }, 
        { status: 403 }
      );
    }

    // Managers can create any user type
    if (token.role !== 'manager' && token.role !== 'landlord') {
      return Response.json(
        { error: 'Insufficient permissions to create users' }, 
        { status: 403 }
      );
    }

    // Check if user with this email already exists
    const existingUser = await User.findOne({
      email: body.email.toLowerCase()
    });

    if (existingUser) {
      return Response.json(
        { error: 'A user with this email already exists' }, 
        { status: 409 }
      );
    }

    // Validate property assignment for tenants
    if (body.role === 'tenant' && body.currentProperty) {
      const property = await Property.findById(body.currentProperty);
      if (!property) {
        return Response.json(
          { error: 'Invalid property ID' }, 
          { status: 400 }
        );
      }

      // Ensure landlord can only assign tenants to their own properties
      if (token.role === 'landlord' && property.landlord.toString() !== token.id) {
        return Response.json(
          { error: 'You can only assign tenants to your own properties' }, 
          { status: 403 }
        );
      }
    }

    // Prepare user data
    const userData = {
      name: body.name.trim(),
      email: body.email.toLowerCase().trim(),
      phone: body.phone?.trim() || '',
      role: body.role,
      isActive: body.isActive !== false // Default to true unless explicitly set to false
    };

    // Add role-specific fields
    if (body.role === 'tenant') {
      userData.currentProperty = body.currentProperty || null;
      userData.currentLease = body.currentLease || null;
      userData.dateOfBirth = body.dateOfBirth || null;
      userData.emergencyContact = {
        name: body.emergencyContact?.name?.trim() || '',
        phone: body.emergencyContact?.phone?.trim() || '',
        relationship: body.emergencyContact?.relationship?.trim() || ''
      };
    }

    if (body.role === 'landlord') {
      userData.company = body.company?.trim() || '';
      userData.licenseNumber = body.licenseNumber?.trim() || '';
    }

    // Handle admin-specific fields
    if (body.role === 'admin') {
      userData.adminLevel = body.adminLevel || 'financial';
      userData.company = body.company?.trim() || '';
      userData.supervisedBy = token.id; // Manager supervises new admin
    }

    // Handle manager fields
    if (body.role === 'manager') {
      userData.company = body.company?.trim() || '';
    }

    // Handle password
    if (body.password) {
      userData.password = await hash(body.password, 12);
    } else {
      // Generate temporary password
      const tempPassword = Math.random().toString(36).slice(-8);
      userData.password = await hash(tempPassword, 12);
      userData.requirePasswordReset = true;
      
      console.log(`Temporary password for ${userData.email}: ${tempPassword}`);
    }

    // Create user
    const user = await User.create(userData);

    // Populate the created user before returning
    const populatedUser = await User.findById(user._id)
      .populate('currentProperty', 'address type monthlyRent')
      .populate('currentLease', 'monthlyRent startDate endDate')
      .populate('supervisedBy', 'name email')
      .select('-password'); // Exclude password from response

    return Response.json({
      success: true,
      data: { user: populatedUser },
      message: `${body.role.charAt(0).toUpperCase() + body.role.slice(1)} created successfully`
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating user:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return Response.json(
        { 
          error: 'Validation failed', 
          details: validationErrors 
        }, 
        { status: 400 }
      );
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return Response.json(
        { error: 'A user with this email already exists' }, 
        { status: 409 }
      );
    }

    return Response.json(
      { 
        success: false,
        error: 'Failed to create user',
        details: error.message 
      }, 
      { status: 500 }
    );
  }
}

// ENHANCED: PUT - Update user (keeping existing logic + manager enhancements)
export async function PUT(request) {
  try {
    const token = await getUserFromToken(request);
    
    if (!token?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id') || searchParams.get('userId');
    const body = await request.json();

    if (!userId) {
      return Response.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Find the user to update
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Enhanced permission checking
    const canUpdate = 
      token.id === userId || // User updating themselves
      token.role === 'manager' || // Managers can update anyone
      (token.role === 'landlord' && existingUser.role === 'tenant'); // Landlords can update their tenants

    if (!canUpdate) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Prepare update data
    const updateData = {};
    const allowedFields = ['name', 'phone', 'currentProperty', 'currentLease', 'isActive'];
    
    // Add role-specific allowed fields
    if (existingUser.role === 'tenant') {
      allowedFields.push('dateOfBirth', 'emergencyContact');
    }
    
    if (existingUser.role === 'landlord') {
      allowedFields.push('company', 'licenseNumber');
    }

    // Admin-specific fields
    if (existingUser.role === 'admin') {
      allowedFields.push('adminLevel', 'company');
    }

    // Manager-specific fields  
    if (existingUser.role === 'manager') {
      allowedFields.push('company');
    }

    // Only update allowed fields
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    // Handle password update
    if (body.password && body.password.length >= 6) {
      updateData.password = await hash(body.password, 12);
      updateData.requirePasswordReset = false;
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('currentProperty', 'address type monthlyRent')
    .populate('currentLease', 'monthlyRent startDate endDate')
    .populate('supervisedBy', 'name email')
    .populate('assignedProperties.property', 'address')
    .populate('assignedProperties.assignedBy', 'name')
    .select('-password');

    return Response.json({
      success: true,
      data: { user: updatedUser },
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('Error updating user:', error);
    return Response.json(
      { 
        success: false,
        error: 'Failed to update user',
        details: error.message 
      }, 
      { status: 500 }
    );
  }
}

// EXISTING: DELETE - Deactivate user (soft delete)
export async function DELETE(request) {
  try {
    const token = await getUserFromToken(request);
    
    if (!token?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id') || searchParams.get('userId');

    if (!userId) {
      return Response.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Check permissions
    const canDelete = 
      token.role === 'manager' || // Managers can delete anyone
      (token.role === 'landlord' && user.role === 'tenant'); // Landlords can delete their tenants

    if (!canDelete) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Soft delete (deactivate) instead of hard delete
    await User.findByIdAndUpdate(userId, { 
      isActive: false,
      currentProperty: null,
      currentLease: null
    });

    return Response.json({
      success: true,
      message: 'User deactivated successfully'
    });

  } catch (error) {
    console.error('Error deactivating user:', error);
    return Response.json(
      { 
        success: false,
        error: 'Failed to deactivate user',
        details: error.message 
      }, 
      { status: 500 }
    );
  }
}