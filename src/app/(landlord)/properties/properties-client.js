// app/properties/properties-client.js - Mobile-First Client Component
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Home,
  Plus,
  Search,
  Filter,
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
  FileText,
  TrendingUp,
  X,
  SlidersHorizontal,
  Bed,
  Bath,
  Square
} from "lucide-react";

export default function PropertiesClient({ initialData }) {
  const {
    properties: initialProperties,
    statistics,
    userRole,
    userId,
    userName,
    userEmail
  } = initialData;

  // Role-based access control
  const hasSystemWideAccess = userRole === 'manager' || userRole === 'admin';
  const canEditProperties = userRole === 'landlord' || userRole === 'manager' || userRole === 'admin';
  const canAddProperties = userRole === 'landlord' || userRole === 'manager' || userRole === 'admin';
  const canViewAllProperties = userRole === 'manager' || userRole === 'admin';

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Utility functions
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-ZM", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return 'ZMW 0';
    return `ZMW ${amount.toLocaleString()}`;
  };

  const getOccupancyStatus = (property) => {
    const isOccupied = !property.isAvailable || property.activeLeaseCount > 0;
    if (isOccupied) {
      return {
        label: `Occupied${property.activeLeaseCount > 0 ? ` (${property.activeLeaseCount})` : ''}`,
        color: "bg-green-100 text-green-800 border-green-200",
        icon: <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />,
        value: "occupied"
      };
    }
    return {
      label: "Vacant",
      color: "bg-orange-100 text-orange-800 border-orange-200",
      icon: <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />,
      value: "vacant"
    };
  };

  // Get unique property types for filter
  const propertyTypes = useMemo(() => {
    const types = [...new Set(initialProperties.map(p => p.type).filter(Boolean))];
    return types.sort();
  }, [initialProperties]);

  // Filter and search logic
  const filteredProperties = useMemo(() => {
    return initialProperties.filter(property => {
      const address = (property.address || '').toLowerCase();
      const description = (property.description || '').toLowerCase();
      const type = (property.type || '').toLowerCase();
      const landlordName = (property.landlordName || '').toLowerCase();
      
      const searchLower = searchQuery.toLowerCase();
      
      // Search across multiple fields
      const matchesSearch = searchQuery === '' || 
        address.includes(searchLower) ||
        description.includes(searchLower) ||
        type.includes(searchLower) ||
        landlordName.includes(searchLower) ||
        property._id.toLowerCase().includes(searchLower);

      // Status filter
      if (statusFilter !== 'all') {
        const occupancyStatus = getOccupancyStatus(property);
        if (occupancyStatus.value !== statusFilter) {
          return false;
        }
      }

      // Type filter
      if (typeFilter !== 'all' && property.type !== typeFilter) {
        return false;
      }

      return matchesSearch;
    });
  }, [initialProperties, searchQuery, statusFilter, typeFilter]);

  // Clear search and filters
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
  };

  // Mobile-first Stats component
  function PropertiesStats() {
    const {
      totalProperties,
      occupiedProperties,
      vacantProperties,
      occupancyRate,
      totalMonthlyRent,
      averageRent,
      totalActiveLeases,
    } = statistics;

    const statsData = [
      {
        label: hasSystemWideAccess ? 'Total Properties' : 'My Properties',
        value: totalProperties,
        icon: Building,
        color: 'blue'
      },
      {
        label: 'Occupied',
        value: `${occupiedProperties} (${occupancyRate}%)`,
        icon: CheckCircle,
        color: 'green'
      },
      {
        label: 'Vacant',
        value: `${vacantProperties} (${totalActiveLeases} leases)`,
        icon: XCircle,
        color: 'orange'
      },
      {
        label: 'Monthly Revenue',
        value: formatCurrency(totalMonthlyRent),
        icon: DollarSign,
        color: 'green'
      }
    ];

    return (
      <div className="mb-6">
        {/* Role indicator */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4">
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
                {userRole === "manager" && `Manager Dashboard - All Properties View`}
                {userRole === "admin" && `Admin Dashboard - System Overview`}
              </span>
            </div>
            <span className="text-xs text-blue-600 hidden sm:block">
              {userRole === "landlord" && `Your ${totalProperties} propert${totalProperties !== 1 ? "ies" : "y"}`}
              {userRole === "manager" && `${totalProperties} total properties`}
              {userRole === "admin" && `${totalProperties} properties system-wide`}
            </span>
          </div>
        </div>

        {/* Mobile: 2x2 Grid */}
        <div className="grid grid-cols-2 gap-3 sm:hidden">
          {statsData.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={index} className="bg-white rounded-lg shadow p-3">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg mr-2 bg-${stat.color}-100`}>
                    <IconComponent className={`w-4 h-4 text-${stat.color}-600`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-600 truncate">{stat.label}</p>
                    <p className="text-sm font-bold text-gray-900 truncate">{stat.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop: Horizontal layout */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsData.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={index} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg mr-3 bg-${stat.color}-100`}>
                    <IconComponent className={`w-5 h-5 text-${stat.color}-600`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                    <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                    {stat.label === 'Monthly Revenue' && averageRent > 0 && (
                      <p className="text-xs text-gray-500">
                        Avg: {formatCurrency(Math.round(averageRent))}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Mobile-first empty state
  function EmptyState() {
    const hasFilters = searchQuery || statusFilter !== 'all' || typeFilter !== 'all';
    
    if (hasFilters) {
      return (
        <div className="bg-white rounded-lg shadow">
          <div className="text-center py-12 px-4">
            <div className="mx-auto w-16 h-16 sm:w-24 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No properties found</h3>
            <p className="text-gray-500 mb-6 text-sm sm:text-base max-w-sm mx-auto">
              No properties match your current search criteria. Try adjusting your filters.
            </p>
            <button 
              onClick={clearFilters}
              className="inline-flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Clear Filters
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow">
        <div className="text-center py-12 px-4">
          <div className="mx-auto w-16 h-16 sm:w-24 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Home className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {userRole === "landlord" ? "No properties yet" : "No properties available"}
          </h3>
          <p className="text-gray-500 mb-6 text-sm sm:text-base max-w-sm mx-auto">
            {userRole === "landlord"
              ? "Get started by adding your first property to begin managing your real estate portfolio."
              : hasSystemWideAccess
              ? "No properties have been added to the system yet."
              : "You do not have access to property management."}
          </p>
          {canAddProperties && (
            <Link
              href="/properties/add"
              className="inline-flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Add Your First Property
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Property card component for mobile
  function PropertyCard({ property }) {
    const occupancyStatus = getOccupancyStatus(property);

    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {property.address || "No address"}
            </h3>
            <p className="text-xs text-gray-500">
              ID: {property._id.slice(-8)}
            </p>
          </div>
          <div className="flex items-center ml-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${occupancyStatus.color}`}>
              {occupancyStatus.icon}
              <span className="ml-1">{occupancyStatus.label}</span>
            </span>
          </div>
        </div>

        {/* Property Details */}
        <div className="mb-3">
          <div className="flex items-center text-sm text-gray-900 mb-1">
            <Building className="w-3 h-3 mr-2 text-gray-400 flex-shrink-0" />
            <span className="truncate">{property.type || "Not specified"}</span>
          </div>
          
          {/* Features */}
          <div className="flex items-center text-sm text-gray-600 space-x-3">
            {property.bedrooms && (
              <div className="flex items-center">
                <Bed className="w-3 h-3 mr-1" />
                <span>{property.bedrooms} bed</span>
              </div>
            )}
            {property.bathrooms && (
              <div className="flex items-center">
                <Bath className="w-3 h-3 mr-1" />
                <span>{property.bathrooms} bath</span>
              </div>
            )}
            {property.squareFeet && (
              <div className="flex items-center">
                <Square className="w-3 h-3 mr-1" />
                <span>{property.squareFeet.toLocaleString()} sq ft</span>
              </div>
            )}
          </div>
        </div>

        {/* Rent Info */}
        <div className="bg-gray-50 rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">
                {formatCurrency(property.baseRent || property.monthlyRent || 0)}
              </div>
              <div className="text-xs text-gray-600">base rent/month</div>
              {property.currentMonthlyRent > 0 &&
                property.currentMonthlyRent !== (property.baseRent || property.monthlyRent) && (
                  <div className="text-sm text-green-600 font-medium">
                    {formatCurrency(property.currentMonthlyRent)} current
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Owner info for managers/admins */}
        {hasSystemWideAccess && (
          <div className="mb-3">
            <div className="flex items-center text-sm text-gray-600">
              <Users className="w-3 h-3 mr-2 text-gray-400 flex-shrink-0" />
              <span className="truncate">Owner: {property.landlordName}</span>
            </div>
          </div>
        )}

        {/* Lease info */}
        <div className="mb-3">
          <div className="text-xs text-gray-500">
            {property.leases?.length || 0} total lease{property.leases?.length !== 1 ? 's' : ''}
            {property.activeLeaseCount > 0 && ` • ${property.activeLeaseCount} active`}
          </div>
        </div>

        {/* Description */}
        {property.description && (
          <div className="mb-3">
            <p className="text-sm text-gray-600 line-clamp-2">{property.description}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            Added {formatDate(property.createdAt)}
          </div>
          <div className="flex items-center space-x-2">
            <Link
              href={`/properties/${property._id}`}
              className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              <Eye className="w-3 h-3 mr-1" />
              View
            </Link>
            
            {canEditProperties && (
              <Link
                href={`/properties/${property._id}/edit`}
                className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                <Edit className="w-3 h-3 mr-1" />
                Edit
              </Link>
            )}

            {property.activeLeaseCount > 0 && (
              <Link
                href={`/properties/${property._id}/tenants`}
                className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
              >
                <Users className="w-3 h-3 mr-1" />
                Tenants
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Desktop table component
  function PropertiesTable({ properties }) {
    return (
      <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
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
                {hasSystemWideAccess && (
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
                const occupancyStatus = getOccupancyStatus(property);

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
                          {formatCurrency(property.baseRent || property.monthlyRent || 0)}
                        </div>
                        <div className="text-sm text-gray-500">
                          base rent/month
                        </div>
                        {property.currentMonthlyRent > 0 &&
                          property.currentMonthlyRent !==
                            (property.baseRent || property.monthlyRent) && (
                            <div className="text-sm text-green-600 font-medium">
                              {formatCurrency(property.currentMonthlyRent)} current
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
                        {property.leases?.length || 0} total lease
                        {property.leases?.length !== 1 ? "s" : ""}
                      </div>
                    </td>

                    {hasSystemWideAccess && (
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

                        {canEditProperties && (
                          <Link
                            href={`/properties/${property._id}/edit`}
                            className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50 transition-colors"
                            title="Edit property"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                        )}

                        {property.activeLeaseCount > 0 && (
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

  return (
    <>
      {/* Mobile-first Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
              <Home className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-blue-600 flex-shrink-0" />
              <span className="truncate">
                {hasSystemWideAccess ? "All Properties" : "My Properties"}
              </span>
            </h1>
            <p className="text-gray-600 text-sm sm:text-base mt-1 hidden sm:block">
              {userRole === "manager"
                ? "Manage all properties in the system and track occupancy"
                : userRole === "admin"
                ? "System-wide property overview and management"
                : "Manage your property portfolio and track occupancy"}
            </p>
          </div>
          <div className="ml-4">
            {canAddProperties && (
              <Link
                href="/properties/add"
                className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm whitespace-nowrap"
              >
                <Plus className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Add Property</span>
                <span className="sm:hidden">Add</span>
              </Link>
            )}
          </div>
        </div>
        
        {/* Mobile description */}
        <p className="text-gray-600 text-sm sm:hidden">
          {userRole === "manager" ? "Manage all properties" : userRole === "admin" ? "System overview" : "Your property portfolio"}
        </p>
      </div>

      {/* Search and Filter Section */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search properties by address, type, description, or owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-9 sm:pl-10 pr-12 sm:pr-16 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all') && (
            <button
              onClick={clearFilters}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {/* Filters Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 overflow-x-auto">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 whitespace-nowrap"
            >
              <option value="all">All Status</option>
              <option value="occupied">Occupied</option>
              <option value="vacant">Vacant</option>
            </select>

            {/* Type Filter */}
            {propertyTypes.length > 0 && (
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 whitespace-nowrap"
              >
                <option value="all">All Types</option>
                {propertyTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            )}

            {/* Mobile filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="sm:hidden inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 whitespace-nowrap"
            >
              <SlidersHorizontal className="w-4 h-4 mr-1" />
              More
            </button>
          </div>

          {/* Results count */}
          <div className="text-sm text-gray-500 whitespace-nowrap">
            {filteredProperties.length} of {initialProperties.length} properties
          </div>
        </div>

        {/* Active filters display */}
        {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all') && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500">Active filters:</span>
            {searchQuery && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                Search: `${searchQuery}`
                <button
                  onClick={() => setSearchQuery('')}
                  className="ml-1 inline-flex items-center p-0.5 rounded-full hover:bg-blue-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                Status: {statusFilter}
                <button
                  onClick={() => setStatusFilter('all')}
                  className="ml-1 inline-flex items-center p-0.5 rounded-full hover:bg-green-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {typeFilter !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                Type: {typeFilter}
                <button
                  onClick={() => setTypeFilter('all')}
                  className="ml-1 inline-flex items-center p-0.5 rounded-full hover:bg-purple-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      {initialProperties.length > 0 && <PropertiesStats />}
      
      {/* Content */}
      {filteredProperties.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          {/* Mobile: Cards */}
          <div className="space-y-4 lg:hidden">
            {filteredProperties.map((property) => (
              <PropertyCard key={property._id} property={property} />
            ))}
          </div>

          {/* Desktop: Table */}
          <PropertiesTable properties={filteredProperties} />
          
          {/* Footer Info */}
          <div className="mt-6 text-center text-xs sm:text-sm text-gray-500">
            Showing {filteredProperties.length} {filteredProperties.length === 1 ? 'property' : 'properties'}
            {userRole === "landlord" && " that you own"}
            {hasSystemWideAccess && " in the system"}
            <span className="hidden sm:inline"> • Last updated: {new Date().toLocaleString()}</span>
          </div>
        </div>
      )}
    </>
  );
}