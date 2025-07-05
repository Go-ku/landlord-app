// src/app/tenants/page.js - Server Component
import { Suspense } from "react";
import dbConnect from "lib/db";
import User from "models/User";
import Lease from "models/Lease";
import Property from "models/Property";
import Payment from "models/Payment";
import Breadcrumbs from "@/components/Breadcrumbs";
import TenantsClient from "./tenants-client";
import { 
  Users, 
  Plus, 
  AlertCircle
} from "lucide-react";

export const metadata = {
  title: 'Tenants - Property Management',
  description: 'Manage your tenants and track their lease information',
};

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
    
    // Convert MongoDB ObjectIds to strings for client
    return tenants.map(tenant => ({
      ...tenant,
      _id: tenant._id.toString(),
      createdAt: tenant.createdAt?.toISOString() || null,
      updatedAt: tenant.updatedAt?.toISOString() || null,
      activeLease: tenant.activeLease ? {
        ...tenant.activeLease,
        _id: tenant.activeLease._id.toString(),
        propertyId: tenant.activeLease.propertyId?.toString() || null,
        startDate: tenant.activeLease.startDate?.toISOString() || null,
        endDate: tenant.activeLease.endDate?.toISOString() || null,
        property: tenant.activeLease.property ? {
          ...tenant.activeLease.property,
          _id: tenant.activeLease.property._id.toString(),
          createdAt: tenant.activeLease.property.createdAt?.toISOString() || null,
          updatedAt: tenant.activeLease.property.updatedAt?.toISOString() || null
        } : null
      } : null,
      leases: tenant.leases.map(lease => ({
        ...lease,
        _id: lease._id.toString(),
        propertyId: lease.propertyId?.toString() || null,
        startDate: lease.startDate?.toISOString() || null,
        endDate: lease.endDate?.toISOString() || null,
        property: lease.property ? {
          ...lease.property,
          _id: lease.property._id.toString(),
          createdAt: lease.property.createdAt?.toISOString() || null,
          updatedAt: lease.property.updatedAt?.toISOString() || null
        } : null
      })),
      recentPayments: tenant.recentPayments.map(payment => ({
        ...payment,
        _id: payment._id.toString(),
        tenantId: payment.tenantId?.toString() || null,
        propertyId: payment.propertyId?.toString() || null,
        leaseId: payment.leaseId?.toString() || null,
        createdAt: payment.createdAt?.toISOString() || null,
        dueDate: payment.dueDate?.toISOString() || null,
        paidDate: payment.paidDate?.toISOString() || null
      }))
    }));
  } catch (error) {
    console.error("Error fetching tenants:", error);
    throw error;
  }
}

// Loading component
function TenantsLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 py-6">
        {/* Header loading */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-6 h-6 bg-gray-200 rounded animate-pulse mr-2"></div>
              <div className="w-20 h-6 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
          <div className="w-full h-4 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Search loading */}
        <div className="mb-6">
          <div className="w-full h-10 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
        
        {/* Stats loading - mobile stack */}
        <div className="space-y-3 mb-6">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-4 animate-pulse">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-200 rounded-lg mr-3"></div>
                <div className="flex-1">
                  <div className="w-20 h-3 bg-gray-200 rounded mb-2"></div>
                  <div className="w-16 h-5 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Cards loading */}
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-4 animate-pulse">
              <div className="w-full h-20 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Error component
function TenantsError({ error }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-blue-600" />
            Tenants
          </h1>
        </div>
        
        <Breadcrumbs />

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
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
    return <TenantsError error={error} />;
  }

  return (
    <Suspense fallback={<TenantsLoading />}>
      <div className="min-h-screen bg-gray-50">
        <div className="px-4 py-6 sm:container sm:mx-auto sm:p-4">
          {/* Breadcrumbs */}
          <div className="mb-6">
            <Breadcrumbs />
          </div>

          {/* Pass data to client component */}
          <TenantsClient initialTenants={tenants} />
        </div>
      </div>
    </Suspense>
  );
}