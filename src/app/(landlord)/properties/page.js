// app/properties/page.js - Fixed Properties Page
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import dbConnect from "lib/db";
import Breadcrumbs from "@/components/Breadcrumbs";
// Import models
import Property from "models";
import User from "models";
import Lease from "models";
import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import {
  Home,
  Plus,
  MapPin,
  AlertCircle,
  Eye,
  Edit,
  Users,
  DollarSign,
  Calendar,
  Building,
  CheckCircle,
  XCircle,
  Lock,
  RefreshCw,
  FileText,
  TrendingUp,
} from "lucide-react";

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

    if (userRole === "landlord") {
      baseQuery.landlord = userId;
    } else if (userRole === "tenant") {
      throw new Error("Tenants are not authorized to view properties");
    }
    // Managers and Admins can see all properties (no additional filtering)

    console.log(`Fetching properties for ${userRole}:`, baseQuery);

    // Fetch properties with aggregation for better performance
    const properties = await Property.aggregate([
      {
        $match: {
          landlord: new ObjectId(`${userId}`), // <- Replace with actual ObjectId
        },
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
              $match: {
                role: { $ne: "user" },
              },
            },
          ],
          as: "leases",
        },
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
        },
      },
    ]);

    console.log(`Found ${properties.length} properties for ${userRole}`);

    // Convert MongoDB ObjectIds to strings and format data
    return properties.map((property) => ({
      ...property,
      _id: property._id.toString(),
      landlord: property.landlord?.toString(),
      createdAt: property.createdAt?.toISOString() || null,
      updatedAt: property.updatedAt?.toISOString() || null,
      leases: property.leases.map((lease) => ({
        ...lease,
        _id: lease._id?.toString() || lease._id,
        tenant: lease.tenantId?.toString() || null,
        property: lease.propertyId?.toString() || null,
      })),
      activeLeases: property.activeLeases,
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
    if (userRole === "landlord") {
      baseQuery.landlord = userId;
    }

    // Get comprehensive statistics
    const [totalProperties, occupancyStats, revenueStats, recentActivity] =
      await Promise.all([
        Property.countDocuments(baseQuery),

        Property.aggregate([
          { $match: {landlord: new ObjectId(`${userId}`)} },

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
              landlordId: new ObjectId(`${userId}`)
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
    console.log('getcardstats',totalProperties,occupancyStats, revenueStats);
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
function ErrorDisplay({ error, session, onRetry }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Home className="w-6 h-6 mr-3 text-blue-600" />
            Properties
          </h1>
        </div>

        <Breadcrumbs />
        <SessionDebug session={session} />

        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
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

              <div className="flex space-x-4">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  ← Back to Dashboard
                </Link>
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
function PropertiesTableLoading() {
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
            <div
              key={index}
              className="bg-white rounded-lg shadow p-4 animate-pulse"
            >
              <div className="w-full h-16 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>

        {/* Table loading */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4">
            <div className="w-full h-8 bg-gray-200 rounded animate-pulse mb-4"></div>
            {[...Array(5)].map((_, index) => (
              <div
                key={index}
                className="w-full h-12 bg-gray-200 rounded animate-pulse mb-2"
              ></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Stats component with enhanced metrics
function PropertiesStats({ statistics, userRole, userName }) {
  const {
    totalProperties,
    occupiedProperties,
    vacantProperties,
    occupancyRate,
    totalMonthlyRent,
    averageRent,
    totalActiveLeases,
    recentlyAdded,
  } = statistics;

  return (
    <div className="mb-6">
      {/* Role indicator */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                userRole === "landlord"
                  ? "bg-blue-500"
                  : userRole === "manager"
                    ? "bg-purple-500"
                    : "bg-green-500"
              }`}
            ></div>
            <span className="text-sm font-medium text-gray-700">
              {userRole === "landlord" && `Landlord Dashboard - ${userName}`}
              {userRole === "manager" &&
                `Manager Dashboard - All Properties View`}
              {userRole === "admin" && `Admin Dashboard - System Overview`}
            </span>
          </div>
          <span className="text-xs text-blue-600">
            {userRole === "landlord" &&
              `Your ${totalProperties} propert${totalProperties !== 1 ? "ies" : "y"}`}
            {userRole === "manager" && `${totalProperties} total properties`}
            {userRole === "admin" &&
              `${totalProperties} properties system-wide`}
          </span>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">
                {userRole === "manager" || userRole === "admin"
                  ? "Total Properties"
                  : "My Properties"}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {totalProperties}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Occupied</p>
              <p className="text-2xl font-bold text-gray-900">
                {occupiedProperties}
              </p>
              <p className="text-xs text-gray-500">
                {occupancyRate}% occupancy
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <XCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Vacant</p>
              <p className="text-2xl font-bold text-gray-900">
                {vacantProperties}
              </p>
              <p className="text-xs text-gray-500">
                {totalActiveLeases} active leases
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">
                Monthly Revenue
              </p>
              <p className="text-lg font-bold text-gray-900">
                ZMW {totalMonthlyRent.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                Avg: ZMW {Math.round(averageRent).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Empty state component
function EmptyState({ userRole }) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Home className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {userRole === "landlord"
            ? "No properties yet"
            : "No properties available"}
        </h3>
        <p className="text-gray-500 mb-6 max-w-sm mx-auto">
          {userRole === "landlord"
            ? "Get started by adding your first property to begin managing your real estate portfolio."
            : userRole === "manager" || userRole === "admin"
              ? "No properties have been added to the system yet."
              : "You do not have access to property management."}
        </p>
        {(userRole === "landlord" ||
          userRole === "manager" ||
          userRole === "admin") && (
          <Link
            href="/properties/add"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Your First Property
          </Link>
        )}
      </div>
    </div>
  );
}

// Properties Table Component
function PropertiesTable({ properties, userRole }) {
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-ZM", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getOccupancyStatus = (isOccupied, activeLeaseCount) => {
    if (isOccupied) {
      return {
        label: `Occupied (${activeLeaseCount})`,
        color: "bg-green-100 text-green-800 border-green-200",
        icon: <CheckCircle className="w-4 h-4" />,
      };
    }
    return {
      label: "Vacant",
      color: "bg-orange-100 text-orange-800 border-orange-200",
      icon: <XCircle className="w-4 h-4" />,
    };
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Property Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type & Features
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rent & Revenue
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Occupancy Status
              </th>
              {(userRole === "manager" || userRole === "admin") && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Added
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {properties.map((property) => {
              const occupancyStatus = getOccupancyStatus(
                property.isAvailable,
                property.activeLeaseCount
              );

              return (
                <tr key={property._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {property.address || "No address"}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {property._id.slice(-8)}
                      </div>
                      {property.description && (
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {property.description}
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {property.type || "Not specified"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {property.bedrooms && (
                          <span>{property.bedrooms} bed</span>
                        )}
                        {property.bedrooms && property.bathrooms && (
                          <span> • </span>
                        )}
                        {property.bathrooms && (
                          <span>{property.bathrooms} bath</span>
                        )}
                      </div>
                      {property.squareFeet && (
                        <div className="text-sm text-gray-500">
                          {property.squareFeet.toLocaleString()} sq ft
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        ZMW{" "}
                        {(
                          property.baseRent ||
                          property.monthlyRent ||
                          0
                        ).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        base rent/month
                      </div>
                      {property.currentMonthlyRent > 0 &&
                        property.currentMonthlyRent !==
                          (property.baseRent || property.monthlyRent) && (
                          <div className="text-sm text-green-600 font-medium">
                            ZMW {property.currentMonthlyRent.toLocaleString()}{" "}
                            current
                          </div>
                        )}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-center text-xs font-medium border ${occupancyStatus.color}`}
                    >
                      {occupancyStatus.icon}
                      <span className="ml-1">{occupancyStatus.label}</span>
                    </span>
                    <div className="text-xs text-gray-500 mt-1">
                      {property.leases.length || 0} total lease
                      {property.leases.length !== 1 ? "s" : ""}
                    </div>
                  </td>

                  {(userRole === "manager" || userRole === "admin") && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {property.landlordName || "Unknown"}
                      </div>
                      <div className="text-sm text-gray-500">Landlord</div>
                    </td>
                  )}

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDate(property.createdAt)}
                    </div>
                    <div className="text-sm text-gray-500">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      Updated {formatDate(property.updatedAt)}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/properties/${property._id}`}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                        title="View property"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>

                      {(userRole === "landlord" ||
                        userRole === "manager" ||
                        userRole === "admin") && (
                        <Link
                          href={`/properties/${property._id}/edit`}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50 transition-colors"
                          title="Edit property"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                      )}

                      {property.isOccupied && (
                        <Link
                          href={`/properties/${property._id}/tenants`}
                          className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                          title="View tenants"
                        >
                          <Users className="w-4 h-4" />
                        </Link>
                      )}

                      <Link
                        href={`/properties/${property._id}/leases`}
                        className="text-purple-600 hover:text-purple-900 p-1 rounded hover:bg-purple-50 transition-colors"
                        title="View leases"
                      >
                        <FileText className="w-4 h-4" />
                      </Link>
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
          <Link
            href="/tenant"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Tenant Dashboard
          </Link>
          <div>
            <Link
              href="/dashboard"
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component
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
    console.log(
      "PropertiesPage: Successfully fetched",
      properties[0],
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

  return (
    <Suspense fallback={<PropertiesTableLoading />}>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-4">
          <SessionDebug session={session} />

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center mb-2 sm:mb-0">
                <Home className="w-6 h-6 mr-3 text-blue-600" />
                {session.user.role === "manager" ||
                session.user.role === "admin"
                  ? "All Properties"
                  : "My Properties"}
              </h1>
              <p className="text-gray-600">
                {session.user.role === "manager"
                  ? "Manage all properties in the system and track occupancy"
                  : session.user.role === "admin"
                    ? "System-wide property overview and management"
                    : "Manage your property portfolio and track occupancy"}
              </p>
            </div>
            <div className="flex items-center space-x-3 mt-4 sm:mt-0">
              {(session.user.role === "landlord" ||
                session.user.role === "manager" ||
                session.user.role === "admin") && (
                <Link
                  href="/properties/add"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Property
                </Link>
              )}
            </div>
          </div>

          {/* Breadcrumbs */}
          <Breadcrumbs />

          {/* Stats */}
          {properties.length > 0 && (
            <PropertiesStats
              statistics={statistics}
              userRole={session.user.role}
              userName={session.user.name}
            />
          )}

          {/* Properties Table or Empty State */}
          {properties.length === 0 ? (
            <EmptyState userRole={session.user.role} />
          ) : (
            <div>
              <PropertiesTable
                properties={properties}
                userRole={session.user.role}
              />

              {/* Footer Info */}
              <div className="mt-6 text-center text-sm text-gray-500">
                Showing {properties.length}{" "}
                {properties.length === 1 ? "property" : "properties"}
                {session.user.role === "landlord" && " that you own"}
                {(session.user.role === "manager" ||
                  session.user.role === "admin") &&
                  " in the system"}
                • Last updated: {new Date().toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </Suspense>
  );
}

// Page configuration
export const dynamic = "force-dynamic";
export const revalidate = 0;
