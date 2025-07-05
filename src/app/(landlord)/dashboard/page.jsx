// app/dashboard/page.js
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import dbConnect from "lib/db";
import User from "models/User";
import Property from "models/Property";
import Maintenance from "models/Maintenance";
import DashboardClient from "./DashboardClient";
import {
  Home,
  Users,
  Wrench,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Building,
  CreditCard,
  Shield,
  Crown,
  UserCheck,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Bell,
  Settings,
  Plus,
  Eye,
  Mail,
  Phone,
  MapPin,
  FileText,
  Zap,
  Info
} from "lucide-react";

// Helper function to serialize MongoDB data
function serializeData(data) {
  if (!data) return null;

  return JSON.parse(
    JSON.stringify(data, (key, value) => {
      if (
        value &&
        typeof value === "object" &&
        value.constructor?.name === "ObjectId"
      ) {
        return value.toString();
      }
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    })
  );
}

// Admin Dashboard Data
async function getAdminDashboardData(userId) {
  try {
    await dbConnect();

    // System-wide statistics
    const [
      totalUsers,
      totalProperties,
      totalMaintenance,
      activeUsers,
      usersByRole,
      recentUsers,
      systemStats,
      recentMaintenance,
    ] = await Promise.allSettled([
      User.countDocuments(),
      Property.countDocuments(),
      Maintenance.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      User.find().sort({ createdAt: -1 }).limit(5).lean(),
      Maintenance.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
      Maintenance.find()
        .populate("propertyId", "address name")
        .populate("tenantId", "name firstName lastName")
        .sort({ dateReported: -1 })
        .limit(10)
        .lean(),
    ]);

    // Process role statistics
    const roleStats = {};
    if (usersByRole.status === "fulfilled") {
      usersByRole.value.forEach((item) => {
        roleStats[item._id] = item.count;
      });
    }

    // Process maintenance statistics
    const maintenanceStats = {};
    if (systemStats.status === "fulfilled") {
      systemStats.value.forEach((item) => {
        maintenanceStats[item._id] = item.count;
      });
    }

    return {
      stats: {
        totalUsers: totalUsers.status === "fulfilled" ? totalUsers.value : 0,
        totalProperties:
          totalProperties.status === "fulfilled" ? totalProperties.value : 0,
        totalMaintenance:
          totalMaintenance.status === "fulfilled" ? totalMaintenance.value : 0,
        activeUsers: activeUsers.status === "fulfilled" ? activeUsers.value : 0,
        roleStats: {
          admin: roleStats.admin || 0,
          manager: roleStats.manager || 0,
          landlord: roleStats.landlord || 0,
          tenant: roleStats.tenant || 0,
        },
        maintenanceStats: {
          pending: maintenanceStats.Pending || 0,
          inProgress: maintenanceStats["In Progress"] || 0,
          completed: maintenanceStats.Completed || 0,
        },
      },
      recentUsers:
        recentUsers.status === "fulfilled"
          ? serializeData(recentUsers.value)
          : [],
      recentMaintenance:
        recentMaintenance.status === "fulfilled"
          ? serializeData(recentMaintenance.value)
          : [],
      alerts: [
        {
          type: "info",
          title: "System Status",
          message: "All systems operational",
          action: null,
        },
      ],
    };
  } catch (error) {
    console.error("Error fetching admin dashboard data:", error);
    return { stats: {}, recentUsers: [], recentMaintenance: [], alerts: [] };
  }
}

// Manager Dashboard Data
async function getManagerDashboardData(userId) {
  try {
    await dbConnect();

    const [
      propertiesManaged,
      tenantsManaged,
      maintenanceRequests,
      overdueMaintenanceCount,
      recentMaintenance,
      propertyOccupancy,
    ] = await Promise.allSettled([
      Property.countDocuments(),
      User.countDocuments({ role: "tenant", isActive: true }),
      Maintenance.find()
        .populate("propertyId", "address name")
        .populate("tenantId", "name firstName lastName")
        .sort({ dateReported: -1 })
        .limit(10)
        .lean(),
      Maintenance.countDocuments({
        status: { $in: ["Pending", "In Progress"] },
        dateReported: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
      Maintenance.find({ status: "Pending" })
        .populate("propertyId", "address name")
        .populate("tenantId", "name firstName lastName")
        .sort({ dateReported: -1 })
        .limit(5)
        .lean(),
      Property.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "currentProperty",
            as: "tenants",
          },
        },
        {
          $group: {
            _id: null,
            totalProperties: { $sum: 1 },
            occupiedProperties: {
              $sum: {
                $cond: [{ $gt: [{ $size: "$tenants" }, 0] }, 1, 0],
              },
            },
          },
        },
      ]),
    ]);

    const occupancyData =
      propertyOccupancy.status === "fulfilled" && propertyOccupancy.value[0]
        ? propertyOccupancy.value[0]
        : { totalProperties: 0, occupiedProperties: 0 };

    const occupancyRate =
      occupancyData.totalProperties > 0
        ? Math.round(
            (occupancyData.occupiedProperties / occupancyData.totalProperties) *
              100
          )
        : 0;

    // Generate alerts
    const alerts = [];
    const overdueCount =
      overdueMaintenanceCount.status === "fulfilled"
        ? overdueMaintenanceCount.value
        : 0;

    if (overdueCount > 0) {
      alerts.push({
        type: "warning",
        title: "Overdue Maintenance",
        message: `${overdueCount} maintenance requests are overdue`,
        action: {
          text: "Review",
          href: "/maintenance?status=overdue",
        },
      });
    }

    return {
      stats: {
        propertiesManaged:
          propertiesManaged.status === "fulfilled"
            ? propertiesManaged.value
            : 0,
        tenantsManaged:
          tenantsManaged.status === "fulfilled" ? tenantsManaged.value : 0,
        openMaintenanceRequests:
          maintenanceRequests.status === "fulfilled"
            ? maintenanceRequests.value.filter((r) => r.status !== "Completed")
                .length
            : 0,
        occupancyRate,
        overdueMaintenanceCount: overdueCount,
      },
      recentMaintenance:
        recentMaintenance.status === "fulfilled"
          ? serializeData(recentMaintenance.value)
          : [],
      maintenanceRequests:
        maintenanceRequests.status === "fulfilled"
          ? serializeData(maintenanceRequests.value)
          : [],
      alerts: serializeData(alerts),
    };
  } catch (error) {
    console.error("Error fetching manager dashboard data:", error);
    return {
      stats: {},
      recentMaintenance: [],
      maintenanceRequests: [],
      alerts: [],
    };
  }
}

// Landlord Dashboard Data
async function getLandlordDashboardData(userId) {
  try {
    await dbConnect();

    const [propertiesOwned, tenants, maintenanceRequests, monthlyRentTotal] =
      await Promise.allSettled([
        Property.find({ landlord: userId })
          .populate("tenants", "name firstName lastName email")
          .lean(),
        User.find({
          currentProperty: {
            $in: await Property.find({ landlord: userId }).select("_id"),
          },
          role: "tenant",
        }).lean(),
        Maintenance.find({ landlordId: userId })
          .populate("propertyId", "address name")
          .populate("tenantId", "name firstName lastName")
          .sort({ dateReported: -1 })
          .lean(),
        Property.aggregate([
          { $match: { landlord: userId } },
          { $group: { _id: null, total: { $sum: "$monthlyRent" } } },
        ]),
      ]);

    const properties =
      propertiesOwned.status === "fulfilled" ? propertiesOwned.value : [];
    const tenantList = tenants.status === "fulfilled" ? tenants.value : [];
    const maintenance =
      maintenanceRequests.status === "fulfilled"
        ? maintenanceRequests.value
        : [];
    const rentTotal =
      monthlyRentTotal.status === "fulfilled" && monthlyRentTotal.value[0]
        ? monthlyRentTotal.value[0].total
        : 0;

    // Calculate occupancy
    const occupiedProperties = properties.filter((p) =>
      tenantList.some((t) => t.currentProperty?.toString() === p._id.toString())
    ).length;
    const occupancyRate =
      properties.length > 0
        ? Math.round((occupiedProperties / properties.length) * 100)
        : 0;

    // Generate alerts
    const alerts = [];
    const pendingMaintenance = maintenance.filter(
      (m) => m.status === "Pending"
    ).length;

    if (pendingMaintenance > 0) {
      alerts.push({
        type: "info",
        title: "Pending Maintenance",
        message: `You have ${pendingMaintenance} pending maintenance requests`,
        action: {
          text: "Review",
          href: "/maintenance?status=pending",
        },
      });
    }

    return {
      stats: {
        propertiesOwned: properties.length,
        totalTenants: tenantList.length,
        monthlyRentTotal: rentTotal,
        occupancyRate,
        openMaintenanceRequests: maintenance.filter(
          (m) => m.status !== "Completed"
        ).length,
      },
      properties: serializeData(properties),
      tenants: serializeData(tenantList),
      recentMaintenance: serializeData(maintenance.slice(0, 5)),
      alerts: serializeData(alerts),
    };
  } catch (error) {
    console.error("Error fetching landlord dashboard data:", error);
    return {
      stats: {},
      properties: [],
      tenants: [],
      recentMaintenance: [],
      alerts: [],
    };
  }
}

// Updated getTenantDashboardData function
async function getTenantDashboardData(userId) {
  try {
    await dbConnect();

    const lease = await Lease.find({tenantId : new ObjectId(userId) })

    // const tenant = await User.findById(userId)
    //   .populate({
    //     path: "currentProperty",
    //     select: "address name type bedrooms bathrooms monthlyRent landlord",
    //     populate: {
    //       path: "landlord",
    //       select: "name firstName lastName email phone",
    //     },
    //   })
    //   .lean();

    if (!lease) {
      throw new Error("Tenant not found");
    }

    // Determine application status
    let applicationStatus = "pending"; // pending, approved, rejected
    let statusMessage = "";
    let statusAction = null;

    if (lease.status === "draft") {
      applicationStatus = "approved";
      statusMessage = "Your application has been approved!";
    } else if (lease.status === "rejected") {
      applicationStatus = "rejected";
      statusMessage = "Your application was not approved.";
      statusAction = {
        text: "Contact Support",
        href: "/contact",
      };
    } else {
      applicationStatus = "pending";
      statusMessage = "Your application is under review.";
      statusAction = {
        text: "View Requirements",
        href: "/tenant/requirements",
      };
    }

    // Generate alerts
    const alerts = [
      {
        type:
          applicationStatus === "approved"
            ? "success"
            : applicationStatus === "rejected"
              ? "error"
              : "info",
        title:
          applicationStatus === "approved"
            ? "Application Approved"
            : applicationStatus === "rejected"
              ? "Application Not Approved"
              : "Application Pending Review",
        message: statusMessage,
        action: statusAction,
      },
    ];

    // Only show other data if approved
    if (applicationStatus === "approved") {
      const maintenanceRequests = await Maintenance.find({ tenantId: userId })
        .populate("propertyId", "address name")
        .sort({ dateReported: -1 })
        .lean();

      const payments = await Payment.find({ tenant: userId })
        .sort({ dueDate: -1 })
        .lean();

      // Check if initial payment has been made
      const initialPaymentMade = payments.some(
        (payment) => payment.type === "initial" && payment.status === "paid"
      );

      // Add initial payment alert if needed
      if (!initialPaymentMade) {
        alerts.push({
          type: "warning",
          title: "Initial Payment Required",
          message:
            "Please pay security deposit and first month's rent to complete your move-in",
          action: {
            text: "Make Payment",
            href: "/payments/new?type=initial",
          },
        });
      }

      return {
        user: serializeData(tenant),
        property: serializeData(tenant.currentProperty),
        stats: {
          monthlyRent: tenant.currentProperty?.monthlyRent || 0,
          openMaintenanceRequests: maintenanceRequests.filter(
            (r) => r.status !== "Completed"
          ).length,
          totalMaintenanceRequests: maintenanceRequests.length,
          paymentStatus:
            payments.filter((p) => p.status === "paid").length > 0
              ? "current"
              : "pending",
        },
        recentMaintenance: serializeData(maintenanceRequests.slice(0, 5)),
        payments: serializeData(payments),
        alerts: serializeData(alerts),
        applicationStatus,
        initialPaymentMade,
      };
    }

    return {
      user: serializeData(tenant),
      property: null,
      stats: null,
      recentMaintenance: [],
      payments: [],
      alerts: serializeData(alerts),
      applicationStatus,
      initialPaymentMade: false,
    };
  } catch (error) {
    console.error("Error fetching tenant dashboard data:", error);
    return {
      user: null,
      property: null,
      stats: {},
      recentMaintenance: [],
      payments: [],
      alerts: [
        {
          type: "error",
          title: "Error Loading Data",
          message: "Could not load your dashboard information",
          action: {
            text: "Try Again",
            href: "/dashboard",
          },
        },
      ],
      applicationStatus: "error",
      initialPaymentMade: false,
    };
  }
}

// Main data fetching function
async function getDashboardData(userId, userRole) {
  switch (userRole) {
    case "admin":
      return getAdminDashboardData(userId);
    case "manager":
      return getManagerDashboardData(userId);
    case "landlord":
      return getLandlordDashboardData(userId);
    case "tenant":
      return getTenantDashboardData(userId);
    default:
      return { error: "Invalid user role" };
  }
}

export default async function DashboardPage() {
  // Check authentication
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/dashboard");
  }

  // Fetch role-specific dashboard data
  const dashboardData = await getDashboardData(
    session.user.id,
    session.user.role
  );

  // Handle errors
  if (dashboardData.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Dashboard Error
          </h2>
          <p className="text-gray-600 mb-6">{dashboardData.error}</p>
          <a
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </a>
        </div>
      </div>
    );
  }

  // Role-specific dashboard layouts
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Role-specific Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                {session.user.role === "admin" && (
                  <>
                    <Shield className="w-8 h-8 mr-3 text-red-600" />
                    System Administration
                  </>
                )}
                {session.user.role === "manager" && (
                  <>
                    <Crown className="w-8 h-8 mr-3 text-purple-600" />
                    Property Management
                  </>
                )}
                {session.user.role === "landlord" && (
                  <>
                    <Building className="w-8 h-8 mr-3 text-blue-600" />
                    Landlord Dashboard
                  </>
                )}
                {session.user.role === "tenant" && (
                  <>
                    <Home className="w-8 h-8 mr-3 text-green-600" />
                    Tenant Portal
                  </>
                )}
              </h1>
              <p className="text-gray-600 mt-1">
                {session.user.role === "admin" &&
                  "Manage users, properties, and system settings"}
                {session.user.role === "manager" &&
                  "Oversee properties, tenants, and maintenance"}
                {session.user.role === "landlord" &&
                  "Manage your properties and tenants"}
                {session.user.role === "tenant" &&
                  "Here's what's happening with your rental"}
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-3">
              <button className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </button>
              <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </button>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {dashboardData.alerts && dashboardData.alerts.length > 0 && (
          <div className="mb-6 space-y-3">
            {dashboardData.alerts.map((alert, index) => (
              <div
                key={index}
                className={`rounded-lg p-4 border ${
                  alert.type === "error"
                    ? "bg-red-50 border-red-200"
                    : alert.type === "warning"
                      ? "bg-yellow-50 border-yellow-200"
                      : alert.type === "success"
                        ? "bg-green-50 border-green-200"
                        : "bg-blue-50 border-blue-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-start">
                    {alert.type === "error" ? (
                      <XCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                    ) : alert.type === "warning" ? (
                      <AlertTriangle className="w-5 h-5 text-yellow-500 mr-3 mt-0.5 flex-shrink-0" />
                    ) : alert.type === "success" ? (
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Info className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <p
                        className={`font-medium ${
                          alert.type === "error"
                            ? "text-red-900"
                            : alert.type === "warning"
                              ? "text-yellow-900"
                              : alert.type === "success"
                                ? "text-green-900"
                                : "text-blue-900"
                        }`}
                      >
                        {alert.title}
                      </p>
                      <p
                        className={`text-sm ${
                          alert.type === "error"
                            ? "text-red-700"
                            : alert.type === "warning"
                              ? "text-yellow-700"
                              : alert.type === "success"
                                ? "text-green-700"
                                : "text-blue-700"
                        }`}
                      >
                        {alert.message}
                      </p>
                    </div>
                  </div>
                  {alert.action && (
                    <a
                      href={alert.action.href}
                      className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        alert.type === "error"
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : alert.type === "warning"
                            ? "bg-yellow-600 text-white hover:bg-yellow-700"
                            : alert.type === "success"
                              ? "bg-green-600 text-white hover:bg-green-700"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      {alert.action.text}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Role-specific Stats */}
        {session.user.role === "admin" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total Users
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardData.stats.totalUsers}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Building className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Properties
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardData.stats.totalProperties}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Wrench className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Maintenance
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardData.stats.totalMaintenance}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <UserCheck className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Active Users
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardData.stats.activeUsers}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {session.user.role === "manager" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Building className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Properties
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardData.stats.propertiesManaged}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Tenants</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardData.stats.tenantsManaged}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Occupancy</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardData.stats.occupancyRate}%
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Wrench className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Open Requests
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardData.stats.openMaintenanceRequests}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {session.user.role === "landlord" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Building className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Properties
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardData.stats.propertiesOwned}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Tenants</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardData.stats.totalTenants}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Monthly Rent
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    $
                    {dashboardData.stats.monthlyRentTotal?.toLocaleString() ||
                      "0"}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Occupancy</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardData.stats.occupancyRate}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tenant Stats Section */}
        {session.user.role === "tenant" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div
                  className={`p-3 rounded-lg ${
                    dashboardData.applicationStatus === "approved"
                      ? "bg-green-100"
                      : dashboardData.applicationStatus === "rejected"
                        ? "bg-red-100"
                        : "bg-yellow-100"
                  }`}
                >
                  {dashboardData.applicationStatus === "approved" ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : dashboardData.applicationStatus === "rejected" ? (
                    <XCircle className="w-6 h-6 text-red-600" />
                  ) : (
                    <Clock className="w-6 h-6 text-yellow-600" />
                  )}
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Application Status
                  </p>
                  <p className="text-2xl font-bold text-gray-900 capitalize">
                    {dashboardData.applicationStatus}
                  </p>
                </div>
              </div>
            </div>

            {dashboardData.applicationStatus === "approved" && (
              <>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div
                      className={`p-3 rounded-lg ${
                        dashboardData.initialPaymentMade
                          ? "bg-green-100"
                          : "bg-yellow-100"
                      }`}
                    >
                      {dashboardData.initialPaymentMade ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-6 h-6 text-yellow-600" />
                      )}
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Initial Payment
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {dashboardData.initialPaymentMade ? "Paid" : "Pending"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <DollarSign className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Monthly Rent
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        $
                        {dashboardData.stats?.monthlyRent?.toLocaleString() ||
                          "0"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Wrench className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Open Requests
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {dashboardData.stats?.openMaintenanceRequests || "0"}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Pass data to client component for interactive features */}
        <DashboardClient
          dashboardData={dashboardData}
          userRole={session.user.role}
          userId={session.user.id}
        />
      </div>
    </div>
  );
}

export async function generateMetadata() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      title: "Dashboard - Authentication Required",
      description: "Please sign in to access your dashboard",
    };
  }

  const titles = {
    admin: "System Administration Dashboard",
    manager: "Property Management Dashboard",
    landlord: "Landlord Dashboard",
    tenant: "Tenant Portal",
  };

  const descriptions = {
    admin: "Manage users, properties, and system settings",
    manager: "Oversee properties, tenants, and maintenance requests",
    landlord: "Manage your properties and tenants",
    tenant: "View your rental information and submit requests",
  };

  return {
    title: titles[session.user.role] || "Dashboard",
    description:
      descriptions[session.user.role] || "Property management dashboard",
    openGraph: {
      title: titles[session.user.role] || "Dashboard",
      description:
        descriptions[session.user.role] || "Property management dashboard",
      type: "website",
    },
  };
}
