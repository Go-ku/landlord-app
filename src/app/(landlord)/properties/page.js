// app/properties/page.js - Server Component
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import dbConnect from "lib/db";
import Breadcrumbs from "@/components/Breadcrumbs";
import PropertiesClient from "./properties-client";
import Property from "models/Property";
import User from "models/User";
import Lease from "models/Lease";
import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import {
  Home,
  Plus,
  AlertCircle,
  Lock,
} from "lucide-react";

export const metadata = {
  title: 'Properties - Property Management',
  description: 'Manage your properties and track occupancy',
};

// Helper function to get models
function getModels() {
  return {
    Property: mongoose.model("Property"),
    Lease: mongoose.model("Lease"),
    User: mongoose.model("User"),
  };
}

// Server function to get properties with status and role-based filtering
async function getPropertiesWithStatus(userId, userRole) {
  try {
    await dbConnect();

    const { Property, Lease, User } = getModels();

    // Build base query based on user role
    let baseQuery = {};
    let aggregationMatch = {};

    if (userRole === "landlord") {
      baseQuery.landlord = userId;
      aggregationMatch.landlord = new ObjectId(userId);
    } else if (userRole === "tenant") {
      throw new Error("Tenants are not authorized to view properties");
    }
    // Managers and Admins can see all properties (no additional filtering)

    console.log(`Fetching properties for ${userRole}:`, baseQuery);

    // Fetch properties with aggregation for better performance
    const properties = await Property.aggregate([
      {
        $match: aggregationMatch,
      },
      {
        $lookup: {
          from: "leases",
          let: { propertyId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$propertyId", "$$propertyId"] },
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "tenantId",
                foreignField: "_id",
                as: "tenant"
              }
            },
            {
              $unwind: { path: "$tenant", preserveNullAndEmptyArrays: true }
            }
          ],
          as: "leases",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "landlord",
          foreignField: "_id",
          as: "landlordInfo"
        }
      },
      {
        $unwind: { path: "$landlordInfo", preserveNullAndEmptyArrays: true }
      },
      {
        $addFields: {
          activeLeases: {
            $filter: {
              input: "$leases",
              as: "lease",
              cond: { $eq: ["$$lease.status", "active"] },
            },
          },
          landlordName: {
            $ifNull: [
              "$landlordInfo.name",
              {
                $concat: [
                  { $ifNull: ["$landlordInfo.firstName", ""] },
                  " ",
                  { $ifNull: ["$landlordInfo.lastName", ""] }
                ]
              }
            ]
          }
        },
      },
    ]);

    console.log(`Found ${properties.length} properties for ${userRole}`);

    // Convert MongoDB ObjectIds to strings and format data
    return properties.map((property) => ({
      ...property,
      _id: property._id.toString(),
      landlord: property.landlord?.toString(),
      landlordName: property.landlordName?.trim() || 'Unknown',
      createdAt: property.createdAt?.toISOString() || null,
      updatedAt: property.updatedAt?.toISOString() || null,
      leases: property.leases.map((lease) => ({
        ...lease,
        _id: lease._id?.toString() || lease._id,
        tenantId: lease.tenantId?.toString() || null,
        propertyId: lease.propertyId?.toString() || null,
        startDate: lease.startDate?.toISOString() || null,
        endDate: lease.endDate?.toISOString() || null,
        tenant: lease.tenant ? {
          ...lease.tenant,
          _id: lease.tenant._id?.toString(),
          createdAt: lease.tenant.createdAt?.toISOString() || null,
          updatedAt: lease.tenant.updatedAt?.toISOString() || null,
        } : null
      })),
      activeLeases: property.activeLeases.map((lease) => ({
        ...lease,
        _id: lease._id?.toString(),
        tenantId: lease.tenantId?.toString() || null,
        propertyId: lease.propertyId?.toString() || null,
        tenant: lease.tenant ? {
          ...lease.tenant,
          _id: lease.tenant._id?.toString(),
        } : null
      })),
      activeLeaseCount: property.activeLeases?.length || 0,
    }));
  } catch (error) {
    console.error("Error fetching properties:", error);
    throw error;
  }
}

// Server function to get property statistics
async function getPropertyStatistics(userId, userRole) {
  try {
    await dbConnect();

    const { Property, Lease } = getModels();

    let baseQuery = {};
    let aggregationMatch = {};

    if (userRole === "landlord") {
      baseQuery.landlord = userId;
      aggregationMatch.landlord = new ObjectId(userId);
    }

    // Get comprehensive statistics
    const [totalProperties, occupancyStats, revenueStats, recentActivity] =
      await Promise.all([
        Property.countDocuments(baseQuery),

        Property.aggregate([
          { $match: aggregationMatch },
          {
            $group: {
              _id: null,
              totalProperties: { $sum: 1 },
              occupiedProperties: {
                $sum: { $cond: [{ $eq: ["$isAvailable", false] }, 1, 0] },
              },
            },
          },
        ]),

        Lease.aggregate([
          {
            $match: {
              status: "active",
              ...(userRole === "landlord" && { landlordId: new ObjectId(userId) })
            },
          },
          {
            $group: {
              _id: null,
              totalMonthlyRent: {
                $sum: "$monthlyRent",
              },
              averageRent: {
                $avg: "$monthlyRent",
              },
              totalActiveLeases: {
                $sum: 1,
              },
            },
          },
        ]),

        Property.find(baseQuery)
          .sort({ createdAt: -1 })
          .limit(5)
          .select("address createdAt")
          .lean(),
      ]);

    const occupancy = occupancyStats[0] || {
      totalProperties: 0,
      occupiedProperties: 0,
    };
    const revenue = revenueStats[0] || {
      totalMonthlyRent: 0,
      averageRent: 0,
      totalActiveLeases: 0,
    };

    return {
      totalProperties,
      occupiedProperties: occupancy.occupiedProperties,
      vacantProperties: totalProperties - occupancy.occupiedProperties,
      occupancyRate:
        totalProperties > 0
          ? Math.round((occupancy.occupiedProperties / totalProperties) * 100)
          : 0,
      totalMonthlyRent: revenue.totalMonthlyRent || 0,
      averageRent: revenue.averageRent || 0,
      totalActiveLeases: revenue.totalActiveLeases || 0,
      recentlyAdded: recentActivity.length,
    };
  } catch (error) {
    console.error("Error fetching property statistics:", error);
    return {
      totalProperties: 0,
      occupiedProperties: 0,
      vacantProperties: 0,
      occupancyRate: 0,
      totalMonthlyRent: 0,
      averageRent: 0,
      totalActiveLeases: 0,
      recentlyAdded: 0,
    };
  }
}

// Session Debug Component for Development
function SessionDebug({ session }) {
  if (process.env.NODE_ENV !== "development") return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <h4 className="font-medium text-yellow-800 mb-2">
        Debug Info (Dev Mode)
      </h4>
      <div className="text-sm text-yellow-700 space-y-1">
        <div>Session exists: {session ? "✅" : "❌"}</div>
        <div>User ID: {session?.user?.id || "Missing"}</div>
        <div>Email: {session?.user?.email || "Missing"}</div>
        <div>Role: {session?.user?.role || "Missing"}</div>
        <div>Name: {session?.user?.name || "Missing"}</div>
      </div>
    </div>
  );
}

// Enhanced Error Component
function ErrorDisplay({ error, session }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
            <Home className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-blue-600" />
            Properties
          </h1>
        </div>

        <Breadcrumbs />
        <SessionDebug session={session} />

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800 mb-2">
                Error Loading Properties
              </h3>
              <p className="text-sm text-red-700 mb-4">
                {error.includes("not authorized")
                  ? "You do not have permission to view properties. This could be a role configuration issue."
                  : "There was a problem loading your properties. This could be due to a database connection issue or session configuration."}
              </p>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Try Again
                </button>
                <a
                  href="/dashboard"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  ← Back to Dashboard
                </a>
              </div>

              {process.env.NODE_ENV === "development" && (
                <details className="mt-4">
                  <summary className="text-xs text-red-600 cursor-pointer font-medium">
                    Technical Details (Dev Mode)
                  </summary>
                  <div className="mt-2 p-3 bg-red-100 rounded text-xs text-red-800 font-mono whitespace-pre-wrap">
                    {error}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading component
function PropertiesLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-gray-200 rounded animate-pulse mr-2"></div>
            <div className="w-24 h-6 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
        </div>

        <div className="w-full h-4 bg-gray-200 rounded animate-pulse mb-6"></div>

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

// Unauthorized access component
function UnauthorizedAccess() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center p-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Access Restricted
        </h2>
        <p className="text-gray-600 mb-6">
          Property management is only available to landlords, managers, and
          administrators.
        </p>
        <div className="space-y-3">
          <a
            href="/tenant"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Tenant Dashboard
          </a>
          <div>
            <a
              href="/dashboard"
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main server component
export default async function PropertiesPage() {
  console.log("PropertiesPage: Starting render");

  // Check authentication
  const session = await getServerSession(authOptions);
  console.log("PropertiesPage: Session check", {
    hasSession: !!session,
    userId: session?.user?.id,
    role: session?.user?.role,
  });

  if (!session?.user?.id) {
    console.log("PropertiesPage: No session, redirecting to login");
    redirect("/login?callbackUrl=/properties");
  }

  // Check if user has permission to view properties
  const allowedRoles = ["landlord", "manager", "admin"];
  if (!session.user.role) {
    console.error("PropertiesPage: User role is missing from session");
    return (
      <ErrorDisplay
        error="User role is missing from session. Please sign out and sign in again."
        session={session}
      />
    );
  }

  if (!allowedRoles.includes(session.user.role)) {
    console.log(
      `PropertiesPage: User role '${session.user.role}' not authorized`
    );
    return <UnauthorizedAccess />;
  }

  let properties;
  let statistics;
  let error = null;

  try {
    console.log("PropertiesPage: Fetching properties and statistics...");
    [properties, statistics] = await Promise.all([
      getPropertiesWithStatus(session.user.id, session.user.role),
      getPropertyStatistics(session.user.id, session.user.role),
    ]);
    console.log(
      "PropertiesPage: Successfully fetched",
      properties.length,
      "properties"
    );
  } catch (err) {
    console.error("PropertiesPage: Error fetching data:", err);
    error = err.message;
    properties = [];
    statistics = {};
  }

  if (error) {
    return <ErrorDisplay error={error} session={session} />;
  }

  const initialData = {
    properties,
    statistics,
    userRole: session.user.role,
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
  };

  return (
    <Suspense fallback={<PropertiesLoading />}>
      <div className="min-h-screen bg-gray-50">
        <div className="px-4 py-6 sm:container sm:mx-auto sm:p-4">
          <SessionDebug session={session} />

          {/* Breadcrumbs */}
          <div className="mb-6">
            <Breadcrumbs />
          </div>

          {/* Pass data to client component */}
          <PropertiesClient initialData={initialData} />
        </div>
      </div>
    </Suspense>
  );
}

// Page configuration
export const dynamic = "force-dynamic";
export const revalidate = 0;