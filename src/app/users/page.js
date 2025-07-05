// src/app/users/page.js
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import dbConnect from 'lib/db';
import User from 'models/User';
import UsersClient from './UsersClient';
import { 
  Users, 
  AlertCircle,
  Shield,
  Building,
  Crown,
  User as UserIcon
} from 'lucide-react';

// Helper function to serialize MongoDB data
function serializeData(data) {
  if (!data) return null;
  
  return JSON.parse(JSON.stringify(data, (key, value) => {
    if (value && typeof value === 'object' && value.constructor?.name === 'ObjectId') {
      return value.toString();
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }));
}

async function getUsersData(userRole, searchParams) {
  try {
    await dbConnect();
    
    // Build query based on filters
    let query = {};
    let sortOptions = {};
    
    // Parse search parameters
    const search = searchParams?.search || '';
    const roleFilter = searchParams?.role || 'all';
    const statusFilter = searchParams?.status || 'all';
    const sortBy = searchParams?.sortBy || 'createdAt';
    const sortOrder = searchParams?.sortOrder || 'desc';
    const page = parseInt(searchParams?.page) || 1;
    const limit = 20;
    
    // Apply filters
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (roleFilter !== 'all') {
      query.role = roleFilter;
    }
    
    if (statusFilter !== 'all') {
      query.isActive = statusFilter === 'active';
    }
    
    // Sort options
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Execute queries in parallel
    const [users, totalCount, stats] = await Promise.allSettled([
      User.find(query)
        .select('name firstName lastName email phone role isActive company createdAt lastLogin adminLevel')
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      
      User.countDocuments(query),
      
      // Get role and status statistics
      User.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            landlords: { $sum: { $cond: [{ $eq: ['$role', 'landlord'] }, 1, 0] } },
            managers: { $sum: { $cond: [{ $eq: ['$role', 'manager'] }, 1, 0] } },
            admins: { $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] } },
            tenants: { $sum: { $cond: [{ $eq: ['$role', 'tenant'] }, 1, 0] } },
            active: { $sum: { $cond: ['$isActive', 1, 0] } },
            inactive: { $sum: { $cond: [{ $not: '$isActive' }, 1, 0] } }
          }
        }
      ])
    ]);
    
    // Process results safely
    const usersData = users.status === 'fulfilled' ? users.value : [];
    const count = totalCount.status === 'fulfilled' ? totalCount.value : 0;
    const statsData = stats.status === 'fulfilled' && stats.value[0] ? stats.value[0] : {
      landlords: 0, managers: 0, admins: 0, tenants: 0, active: 0, inactive: 0
    };
    
    return {
      users: serializeData(usersData),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalCount: count,
        limit
      },
      stats: {
        roles: {
          landlord: statsData.landlords || 0,
          manager: statsData.managers || 0,
          admin: statsData.admins || 0,
          tenant: statsData.tenants || 0
        },
        status: {
          active: statsData.active || 0,
          inactive: statsData.inactive || 0
        }
      },
      filters: {
        search,
        role: roleFilter,
        status: statusFilter,
        sortBy,
        sortOrder,
        page
      }
    };

  } catch (error) {
    console.error('Error fetching users data:', error);
    return {
      users: [],
      pagination: { currentPage: 1, totalPages: 1, totalCount: 0, limit: 20 },
      stats: {
        roles: { landlord: 0, manager: 0, admin: 0, tenant: 0 },
        status: { active: 0, inactive: 0 }
      },
      filters: { search: '', role: 'all', status: 'all', sortBy: 'createdAt', sortOrder: 'desc', page: 1 },
      error: error.message
    };
  }
}

export default async function UsersPage({ searchParams }) {
  // Await searchParams for Next.js 15 compatibility
  const params = await searchParams;
  
  // Check authentication
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/users');
  }

  // Check if user has permission to manage users (only managers and admins)
  const allowedRoles = ['manager', 'admin'];
  if (!allowedRoles.includes(session.user.role)) {
    redirect('/unauthorized?reason=insufficient_permissions');
  }

  const data = await getUsersData(session.user.role, params);
  
  // Handle errors
  if (data.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Users</h2>
          <p className="text-gray-600 mb-6">{data.error}</p>
          <a
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Users className="w-8 h-8 mr-3 text-purple-600" />
              User Management
            </h1>
            <p className="text-gray-600 mt-2">
              {session.user.role === 'manager' 
                ? 'Manage all users across the property management system'
                : session.user.role === 'admin'
                ? 'System-wide user administration and role management'
                : 'Manage users in the system'
              }
            </p>
            
            <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-md">
              <p className="text-sm text-purple-800">
                <strong>System Overview:</strong> {data.stats.status.active} active users, 
                {data.stats.roles.landlord} landlords, {data.stats.roles.tenant} tenants
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Building className="w-5 h-5 text-blue-600 mr-2" />
              <div>
                <p className="text-xs text-gray-600">Landlords</p>
                <p className="text-lg font-bold text-blue-600">{data.stats.roles.landlord}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Crown className="w-5 h-5 text-purple-600 mr-2" />
              <div>
                <p className="text-xs text-gray-600">Managers</p>
                <p className="text-lg font-bold text-purple-600">{data.stats.roles.manager}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Shield className="w-5 h-5 text-red-600 mr-2" />
              <div>
                <p className="text-xs text-gray-600">Admins</p>
                <p className="text-lg font-bold text-red-600">{data.stats.roles.admin}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <UserIcon className="w-5 h-5 text-green-600 mr-2" />
              <div>
                <p className="text-xs text-gray-600">Tenants</p>
                <p className="text-lg font-bold text-green-600">{data.stats.roles.tenant}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="w-5 h-5 bg-green-500 rounded-full mr-2"></div>
              <div>
                <p className="text-xs text-gray-600">Active</p>
                <p className="text-lg font-bold text-green-600">{data.stats.status.active}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="w-5 h-5 bg-red-500 rounded-full mr-2"></div>
              <div>
                <p className="text-xs text-gray-600">Inactive</p>
                <p className="text-lg font-bold text-red-600">{data.stats.status.inactive}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Client Component for Interactive Features */}
        <UsersClient 
          initialData={serializeData(data)}
          userRole={session.user.role}
          searchParams={params}
        />
      </div>
    </div>
  );
}

export async function generateMetadata({ searchParams }) {
  // Await searchParams for Next.js 15 compatibility
  const params = await searchParams;
  
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return {
      title: 'User Management - Authentication Required',
      description: 'Please sign in to manage users',
    };
  }

  // Get user count for metadata
  const data = await getUsersData(session.user.role, params);
  
  let title = 'User Management - Property Management';
  let description = 'Manage system users and their roles';
  
  if (session.user.role === 'manager') {
    title = `User Management (${data.stats.status.active} users) - Property Management`;
    description = `Manage ${data.stats.status.active} active users across the property management system`;
  } else if (session.user.role === 'admin') {
    title = `System Administration (${data.pagination.totalCount} users) - Property Management`;
    description = `Administer ${data.pagination.totalCount} total users in the system`;
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
  };
}