// src/app/tenants/page.js
import Link from "next/link";
import { Suspense } from "react";
import dbConnect from "lib/db";
import User from "models/User";
import Lease from "models/Lease";
import Property from "models/Property";
import Payment from "models/Payment";
import Breadcrumbs from "@/components/Breadcrumbs";
import { 
  Users, 
  Plus, 
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Edit,
  Phone,
  Mail,
  Home,
  DollarSign,
  Calendar,
  UserCheck,
  UserX
} from "lucide-react";

async function getTenantsWithDetails() {
  try {
    await dbConnect();
    
    // Fetch tenants with their lease and payment information
    const tenants = await User.aggregate([
      {
        $match: { role: 'tenant' }
      },
      {
        $lookup: {
          from: 'leases',
          let: { tenantId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$tenantId', '$$tenantId'] }
              }
            },
            {
              $lookup: {
                from: 'properties',
                localField: 'propertyId',
                foreignField: '_id',
                as: 'property'
              }
            },
            {
              $unwind: { path: '$property', preserveNullAndEmptyArrays: true }
            },
            {
              $sort: { createdAt: -1 }
            }
          ],
          as: 'leases'
        }
      },
      {
        $lookup: {
          from: 'payments',
          let: { tenantId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$tenantId', '$$tenantId'] }
              }
            },
            {
              $sort: { createdAt: -1 }
            },
            {
              $limit: 5
            }
          ],
          as: 'recentPayments'
        }
      },
      {
        $addFields: {
          activeLease: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$leases',
                  cond: { $eq: ['$$this.status', 'active'] }
                }
              },
              0
            ]
          },
          totalLeases: { $size: '$leases' },
          totalPayments: { $size: '$recentPayments' },
          totalPaid: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$recentPayments',
                    cond: { $eq: ['$$this.status', 'verified'] }
                  }
                },
                as: 'payment',
                in: '$$payment.amount'
              }
            }
          }
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);
    
    // Convert MongoDB ObjectIds to strings
    return tenants.map(tenant => ({
      ...tenant,
      _id: tenant._id.toString(),
      createdAt: tenant.createdAt?.toISOString() || null,
      updatedAt: tenant.updatedAt?.toISOString() || null,
      activeLease: tenant.activeLease ? {
        ...tenant.activeLease,
        _id: tenant.activeLease._id.toString(),
        propertyId: tenant.activeLease.propertyId?.toString() || null,
        property: tenant.activeLease.property ? {
          ...tenant.activeLease.property,
          _id: tenant.activeLease.property._id.toString()
        } : null
      } : null,
      leases: tenant.leases.map(lease => ({
        ...lease,
        _id: lease._id.toString(),
        propertyId: lease.propertyId?.toString() || null,
        property: lease.property ? {
          ...lease.property,
          _id: lease.property._id.toString()
        } : null
      })),
      recentPayments: tenant.recentPayments.map(payment => ({
        ...payment,
        _id: payment._id.toString(),
        tenantId: payment.tenantId?.toString() || null,
        propertyId: payment.propertyId?.toString() || null,
        leaseId: payment.leaseId?.toString() || null
      }))
    }));
  } catch (error) {
    console.error("Error fetching tenants:", error);
    return [];
  }
}

// Loading component
function TenantsLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-200 rounded animate-pulse mr-3"></div>
            <div className="w-32 h-8 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="w-32 h-10 bg-gray-200 rounded animate-pulse"></div>
        </div>
        
        <div className="w-full h-6 bg-gray-200 rounded animate-pulse mb-6"></div>
        
        {/* Stats loading */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-4 animate-pulse">
              <div className="w-full h-16 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
        
        {/* Table loading */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4">
            <div className="w-full h-8 bg-gray-200 rounded animate-pulse mb-4"></div>
            {[...Array(5)].map((_, index) => (
              <div key={index} className="w-full h-12 bg-gray-200 rounded animate-pulse mb-2"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Stats component
function TenantsStats({ tenants }) {
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter(t => t.activeLease).length;
  const inactiveTenants = totalTenants - activeTenants;
  const totalMonthlyRent = tenants.reduce((sum, tenant) => {
    return sum + (tenant.activeLease?.monthlyRent || 0);
  }, 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-600">Total Tenants</p>
            <p className="text-2xl font-bold text-gray-900">{totalTenants}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center">
          <div className="p-2 bg-green-100 rounded-lg">
            <UserCheck className="w-5 h-5 text-green-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-600">Active Tenants</p>
            <p className="text-2xl font-bold text-gray-900">{activeTenants}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center">
          <div className="p-2 bg-orange-100 rounded-lg">
            <UserX className="w-5 h-5 text-orange-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-600">Inactive Tenants</p>
            <p className="text-2xl font-bold text-gray-900">{inactiveTenants}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center">
          <div className="p-2 bg-green-100 rounded-lg">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
            <p className="text-lg font-bold text-gray-900">
              ZMW {totalMonthlyRent.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Empty state component
function EmptyState() {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Users className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No tenants yet</h3>
        <p className="text-gray-500 mb-6 max-w-sm mx-auto">
          Start by adding tenants to your system to manage leases and track payments.
        </p>
        <Link 
          href="/tenants/add" 
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Your First Tenant
        </Link>
      </div>
    </div>
  );
}

// Tenants Table Component
function TenantsTable({ tenants }) {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount || isNaN(amount)) return 'ZMW 0';
    return `ZMW ${amount.toLocaleString()}`;
  };

  const getTenantStatus = (tenant) => {
    if (tenant.activeLease) {
      const balanceDue = tenant.activeLease.balanceDue || 0;
      if (balanceDue > 0) {
        return {
          label: 'Overdue',
          color: 'bg-red-100 text-red-800',
          icon: <AlertCircle className="w-4 h-4" />
        };
      }
      return {
        label: 'Active',
        color: 'bg-green-100 text-green-800',
        icon: <CheckCircle className="w-4 h-4" />
      };
    }
    return {
      label: 'Inactive',
      color: 'bg-gray-100 text-gray-800',
      icon: <XCircle className="w-4 h-4" />
    };
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tenant Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact Information
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Current Property
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tenants.map((tenant) => {
              const tenantStatus = getTenantStatus(tenant);
              const tenantName = tenant.name || 
                `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim() || 
                'Unknown Tenant';
              
              return (
                <tr key={tenant._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {tenantName}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {tenant._id.slice(-8)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Joined: {formatDate(tenant.createdAt)}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      {tenant.email && (
                        <div className="text-sm text-gray-900 flex items-center mb-1">
                          <Mail className="w-4 h-4 mr-2 text-gray-400" />
                          <a
                            href={`mailto:${tenant.email}`}
                            className="text-blue-600 hover:text-blue-800 truncate max-w-xs"
                          >
                            {tenant.email}
                          </a>
                        </div>
                      )}
                      {tenant.phone && (
                        <div className="text-sm text-gray-900 flex items-center">
                          <Phone className="w-4 h-4 mr-2 text-gray-400" />
                          <a
                            href={`tel:${tenant.phone}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {tenant.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      {tenant.activeLease ? (
                        <>
                          <div className="text-sm font-medium text-gray-900">
                            {tenant.activeLease.property?.address || 'Unknown Property'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatCurrency(tenant.activeLease.monthlyRent)}/month
                          </div>
                          <div className="text-sm text-gray-500">
                            Lease ends: {formatDate(tenant.activeLease.endDate)}
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-500">
                          No active lease
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        Total Paid: {formatCurrency(tenant.totalPaid || 0)}
                      </div>
                      {tenant.activeLease && (
                        <div className="text-sm text-gray-500">
                          Balance: {formatCurrency(tenant.activeLease.balanceDue || 0)}
                        </div>
                      )}
                      <div className="text-sm text-gray-500">
                        {tenant.totalPayments} payment{tenant.totalPayments !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${tenantStatus.color}`}>
                      {tenantStatus.icon}
                      <span className="ml-1">{tenantStatus.label}</span>
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/tenants/${tenant._id}`}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                        title="View tenant"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/tenants/${tenant._id}/edit`}
                        className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50 transition-colors"
                        title="Edit tenant"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      {tenant.activeLease && (
                        <Link
                          href={`/leases/${tenant.activeLease._id}`}
                          className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                          title="View lease"
                        >
                          <Home className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function TenantsPage() {
  let tenants;
  let error = null;

  try {
    tenants = await getTenantsWithDetails();
  } catch (err) {
    error = err.message;
    tenants = [];
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Users className="w-6 h-6 mr-3 text-blue-600" />
              Tenants
            </h1>
            <Link 
              href="/tenants/add" 
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Tenant
            </Link>
          </div>
          
          <Breadcrumbs />

          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  Error Loading Tenants
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  There was a problem loading your tenants. This could be due to a database connection issue.
                </p>
                {process.env.NODE_ENV === 'development' && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-600 cursor-pointer">
                      Technical Details (Dev Mode)
                    </summary>
                    <p className="text-xs text-red-600 mt-1 font-mono">
                      {error}
                    </p>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<TenantsLoading />}>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center mb-2 sm:mb-0">
                <Users className="w-6 h-6 mr-3 text-blue-600" />
                Tenants
              </h1>
              <p className="text-gray-600">
                Manage your tenants and track their lease information
              </p>
            </div>
            <div className="flex items-center space-x-3 mt-4 sm:mt-0">
              <Link 
                href="/tenants/add" 
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Tenant
              </Link>
            </div>
          </div>

          {/* Breadcrumbs */}
          <Breadcrumbs />

          {/* Stats */}
          {tenants.length > 0 && <TenantsStats tenants={tenants} />}
          
          {/* Tenants Table or Empty State */}
          {tenants.length === 0 ? (
            <EmptyState />
          ) : (
            <div>
              <TenantsTable tenants={tenants} />
              
              {/* Footer Info */}
              <div className="mt-6 text-center text-sm text-gray-500">
                Showing {tenants.length} {tenants.length === 1 ? 'tenant' : 'tenants'}
                • Last updated: {new Date().toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </Suspense>
  );
}