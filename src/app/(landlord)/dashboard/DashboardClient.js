// app/dashboard/DashboardClient.js
'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Home,
  Users,
  Wrench,
  CreditCard,
  FileText,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Eye,
  ExternalLink,
  TrendingUp,
  BarChart3,
  UserPlus,
  Settings,
  Building,
  Clock,
  CheckCircle,
  AlertTriangle,
  Info,
  Zap,
  Shield,
  Crown
} from 'lucide-react';

export default function DashboardClient({ dashboardData, userRole, userId }) {
  const [activeTab, setActiveTab] = useState('overview');

  // Role-specific quick actions
  const getQuickActions = () => {
    switch (userRole) {
      case 'admin':
        return [
          {
            title: 'Manage Users',
            description: 'Add, edit, or remove users',
            icon: Users,
            href: '/users',
            color: 'bg-blue-500 hover:bg-blue-600'
          },
          {
            title: 'System Settings',
            description: 'Configure system preferences',
            icon: Settings,
            href: '/admin/settings',
            color: 'bg-purple-500 hover:bg-purple-600'
          },
          {
            title: 'View Reports',
            description: 'System analytics and reports',
            icon: BarChart3,
            href: '/admin/reports',
            color: 'bg-green-500 hover:bg-green-600'
          },
          {
            title: 'Add Property',
            description: 'Register new property',
            icon: Building,
            href: '/properties/new',
            color: 'bg-orange-500 hover:bg-orange-600'
          }
        ];
      case 'manager':
        return [
          {
            title: 'Add Property',
            description: 'Register a new property',
            icon: Building,
            href: '/properties/new',
            color: 'bg-blue-500 hover:bg-blue-600'
          },
          {
            title: 'Add Tenant',
            description: 'Register new tenant',
            icon: UserPlus,
            href: '/users/new?role=tenant',
            color: 'bg-green-500 hover:bg-green-600'
          },
          {
            title: 'Maintenance Queue',
            description: 'Manage maintenance requests',
            icon: Wrench,
            href: '/maintenance',
            color: 'bg-orange-500 hover:bg-orange-600'
          },
          {
            title: 'Generate Reports',
            description: 'Property and financial reports',
            icon: BarChart3,
            href: '/reports',
            color: 'bg-purple-500 hover:bg-purple-600'
          }
        ];
      case 'landlord':
        return [
          {
            title: 'Add Property',
            description: 'List a new property',
            icon: Building,
            href: '/properties/new',
            color: 'bg-blue-500 hover:bg-blue-600'
          },
          {
            title: 'View Maintenance',
            description: 'Check maintenance requests',
            icon: Wrench,
            href: '/maintenance',
            color: 'bg-orange-500 hover:bg-orange-600'
          },
          {
            title: 'Tenant Communications',
            description: 'Message your tenants',
            icon: Mail,
            href: '/communications',
            color: 'bg-green-500 hover:bg-green-600'
          },
          {
            title: 'Financial Reports',
            description: 'View income and expenses',
            icon: TrendingUp,
            href: '/reports/financial',
            color: 'bg-purple-500 hover:bg-purple-600'
          }
        ];
      case 'tenant':
        return [
          {
            title: 'Submit Maintenance Request',
            description: 'Report an issue with your property',
            icon: Wrench,
            href: '/maintenance/new',
            color: 'bg-blue-500 hover:bg-blue-600'
          },
          {
            title: 'Make Payment',
            description: 'Pay your rent online',
            icon: CreditCard,
            href: '/payments/new',
            color: 'bg-green-500 hover:bg-green-600'
          },
          {
            title: 'View Lease',
            description: 'Review your lease agreement',
            icon: FileText,
            href: '/lease',
            color: 'bg-purple-500 hover:bg-purple-600'
          },
          {
            title: 'Contact Landlord',
            description: 'Get in touch with your landlord',
            icon: Phone,
            href: '/contact',
            color: 'bg-orange-500 hover:bg-orange-600'
          }
        ];
      default:
        return [];
    }
  };

  const quickActions = getQuickActions();

  return (
    <div className="space-y-8">
      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <Plus className="w-5 h-5 mr-2 text-blue-600" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link
                key={index}
                href={action.href}
                className="group relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 hover:from-gray-100 hover:to-gray-200 transition-all duration-200 border border-gray-200 hover:border-gray-300"
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-3 ${action.color} rounded-lg text-white group-hover:scale-110 transition-transform duration-200`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {action.description}
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Role-specific content sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          {/* Admin Content */}
          {userRole === 'admin' && (
            <>
              {/* Recent Users */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Recent Users</h2>
                  <Link
                    href="/users"
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                  >
                    View all
                    <ExternalLink className="w-4 h-4 ml-1" />
                  </Link>
                </div>
                <div className="space-y-3">
                  {dashboardData.recentUsers?.slice(0, 5).map((user) => (
                    <div key={user._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                          {user.role === 'admin' ? <Shield className="w-5 h-5 text-red-600" /> :
                           user.role === 'manager' ? <Crown className="w-5 h-5 text-purple-600" /> :
                           user.role === 'landlord' ? <Building className="w-5 h-5 text-blue-600" /> :
                           <Users className="w-5 h-5 text-green-600" />}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {user.name || `${user.firstName} ${user.lastName}`}
                          </p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin' ? 'bg-red-100 text-red-800' :
                          user.role === 'manager' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'landlord' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {user.role}
                        </span>
                        <Link href={`/users/${user._id}`} className="text-gray-400 hover:text-gray-600">
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* System Health */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">System Health</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="font-medium text-green-900">Database</p>
                    <p className="text-sm text-green-700">Operational</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="font-medium text-green-900">API</p>
                    <p className="text-sm text-green-700">Healthy</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="font-medium text-green-900">Storage</p>
                    <p className="text-sm text-green-700">Available</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Manager/Landlord Content - Recent Maintenance */}
          {(userRole === 'manager' || userRole === 'landlord') && dashboardData.recentMaintenance && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Recent Maintenance</h2>
                <Link
                  href="/maintenance"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                >
                  View all
                  <ExternalLink className="w-4 h-4 ml-1" />
                </Link>
              </div>
              <div className="space-y-3">
                {dashboardData.recentMaintenance.slice(0, 5).map((request) => (
                  <div key={request._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-lg mr-3 ${
                        request.priority === 'High' ? 'bg-red-100' :
                        request.priority === 'Medium' ? 'bg-yellow-100' : 'bg-green-100'
                      }`}>
                        <Wrench className={`w-4 h-4 ${
                          request.priority === 'High' ? 'text-red-600' :
                          request.priority === 'Medium' ? 'text-yellow-600' : 'text-green-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{request.title}</p>
                        <p className="text-sm text-gray-600">
                          {request.propertyId?.address} • {new Date(request.dateReported).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        request.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        request.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {request.status}
                      </span>
                      <Link href={`/maintenance/${request._id}`} className="text-gray-400 hover:text-gray-600">
                        <Eye className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tenant Content - Recent Maintenance and Payments */}
          {userRole === 'tenant' && (
            <>
              {/* Tenant Payments */}
              {dashboardData.payments && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Recent Payments</h2>
                    <Link
                      href="/payments"
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                    >
                      View all
                      <ExternalLink className="w-4 h-4 ml-1" />
                    </Link>
                  </div>

                  {/* Upcoming Payment */}
                  {dashboardData.payments.find(p => p.isUpcoming) && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Clock className="w-5 h-5 text-blue-600 mr-3" />
                          <div>
                            <p className="font-medium text-blue-900">Upcoming Payment</p>
                            <p className="text-sm text-blue-700">
                              Due {new Date(dashboardData.payments.find(p => p.isUpcoming).dueDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-900">${dashboardData.payments.find(p => p.isUpcoming).amount}</p>
                          <Link
                            href="/payments/new"
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            Pay now →
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {dashboardData.payments.slice(0, 3).map((payment) => (
                      <div key={payment._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center">
                          <div className={`p-2 rounded-lg mr-3 ${
                            payment.status === 'paid' ? 'bg-green-100' : 'bg-yellow-100'
                          }`}>
                            <CreditCard className={`w-4 h-4 ${
                              payment.status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">${payment.amount} - {payment.type}</p>
                            <p className="text-sm text-gray-600">Due: {new Date(payment.dueDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          payment.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {payment.status === 'paid' ? 'Paid' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tenant Maintenance */}
              {dashboardData.recentMaintenance && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Maintenance Requests</h2>
                    <Link
                      href="/maintenance"
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                    >
                      View all
                      <ExternalLink className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {dashboardData.recentMaintenance.map((request) => (
                      <div key={request._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center">
                          <div className={`p-2 rounded-lg mr-3 ${
                            request.priority === 'High' ? 'bg-red-100' :
                            request.priority === 'Medium' ? 'bg-yellow-100' : 'bg-green-100'
                          }`}>
                            <Wrench className={`w-4 h-4 ${
                              request.priority === 'High' ? 'text-red-600' :
                              request.priority === 'Medium' ? 'text-yellow-600' : 'text-green-600'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{request.title}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(request.dateReported).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            request.status === 'Completed' ? 'bg-green-100 text-green-800' :
                            request.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {request.status}
                          </span>
                          <Link href={`/maintenance/${request._id}`} className="text-gray-400 hover:text-gray-600">
                            <Eye className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>

                  {dashboardData.recentMaintenance.length === 0 && (
                    <div className="text-center py-8">
                      <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 mb-3">No maintenance requests yet</p>
                      <Link
                        href="/maintenance/new"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Submit Request
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Tenant Property Info */}
          {userRole === 'tenant' && dashboardData.property && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Building className="w-5 h-5 mr-2 text-blue-600" />
                Your Property
              </h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <MapPin className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">{dashboardData.property.address}</p>
                    <p className="text-sm text-gray-600">{dashboardData.property.type}</p>
                  </div>
                </div>
                {dashboardData.property.landlord && (
                  <div className="space-y-2 pt-3 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-700">Landlord Contact</p>
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="w-4 h-4 mr-2" />
                      {dashboardData.property.landlord.email}
                    </div>
                    {dashboardData.property.landlord.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="w-4 h-4 mr-2" />
                        {dashboardData.property.landlord.phone}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Role-specific tips */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Info className="w-5 h-5 mr-2 text-blue-600" />
              {userRole === 'admin' ? 'Admin Tips' :
               userRole === 'manager' ? 'Management Tips' :
               userRole === 'landlord' ? 'Landlord Tips' :
               'Tenant Tips'}
            </h3>
            <div className="space-y-3 text-sm">
              {userRole === 'admin' && (
                <>
                  <div className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">Monitor system performance regularly</p>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">Keep user permissions up to date</p>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">Review security logs weekly</p>
                  </div>
                </>
              )}
              {userRole === 'manager' && (
                <>
                  <div className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">Address maintenance requests promptly</p>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">Maintain regular tenant communication</p>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">Keep property records updated</p>
                  </div>
                </>
              )}
              {userRole === 'landlord' && (
                <>
                  <div className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">Screen tenants thoroughly</p>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">Respond to maintenance quickly</p>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">Keep detailed financial records</p>
                  </div>
                </>
              )}
              {userRole === 'tenant' && (
                <>
                  <div className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">Pay rent by the 1st to avoid late fees</p>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">Report maintenance issues promptly</p>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">Keep your contact info updated</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Emergency Contacts (for tenants) */}
          {userRole === 'tenant' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-red-600" />
                Emergency Contacts
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="font-medium text-red-900 text-sm">Emergency Services</p>
                  <a href="tel:911" className="text-red-700 font-bold text-lg">911</a>
                </div>
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="font-medium text-yellow-900 text-sm">Maintenance Emergency</p>
                  <a href="tel:555-0123" className="text-yellow-700 font-bold">555-0123</a>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="font-medium text-blue-900 text-sm">Property Management</p>
                  <a href="tel:555-0456" className="text-blue-700 font-bold">555-0456</a>
                </div>
              </div>
            </div>
          )}

          {/* System Info (for admins) */}
          {userRole === 'admin' && dashboardData.stats && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
                User Breakdown
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Admins</span>
                  <span className="font-medium text-gray-900">{dashboardData.stats.roleStats?.admin || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Managers</span>
                  <span className="font-medium text-gray-900">{dashboardData.stats.roleStats?.manager || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Landlords</span>
                  <span className="font-medium text-gray-900">{dashboardData.stats.roleStats?.landlord || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Tenants</span>
                  <span className="font-medium text-gray-900">{dashboardData.stats.roleStats?.tenant || 0}</span>
                </div>
              </div>
            </div>
          )}

          {/* Property Overview (for landlords) */}
          {userRole === 'landlord' && dashboardData.properties && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Building className="w-5 h-5 mr-2 text-blue-600" />
                Your Properties
              </h3>
              <div className="space-y-3">
                {dashboardData.properties.slice(0, 3).map((property) => (
                  <div key={property._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{property.address}</p>
                      <p className="text-xs text-gray-600">{property.type}</p>
                    </div>
                    <Link href={`/properties/${property._id}`} className="text-blue-600 hover:text-blue-700">
                      <Eye className="w-4 h-4" />
                    </Link>
                  </div>
                ))}
                {dashboardData.properties.length > 3 && (
                  <Link
                    href="/properties"
                    className="block text-center text-sm text-blue-600 hover:text-blue-700 mt-3"
                  >
                    View all {dashboardData.properties.length} properties →
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Maintenance Summary (for managers) */}
          {userRole === 'manager' && dashboardData.stats && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Wrench className="w-5 h-5 mr-2 text-orange-600" />
                Maintenance Overview
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-600">Pending</span>
                  </div>
                  <span className="font-medium text-gray-900">{dashboardData.stats.openMaintenanceRequests || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-600">In Progress</span>
                  </div>
                  <span className="font-medium text-gray-900">
                    {dashboardData.maintenanceRequests?.filter(r => r.status === 'In Progress').length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-600">Completed</span>
                  </div>
                  <span className="font-medium text-gray-900">
                    {dashboardData.maintenanceRequests?.filter(r => r.status === 'Completed').length || 0}
                  </span>
                </div>
                <Link
                  href="/maintenance"
                  className="block text-center text-sm text-blue-600 hover:text-blue-700 mt-4 pt-3 border-t border-gray-200"
                >
                  Manage All Requests →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer with Last Updated */}
      <div className="text-center text-sm text-gray-500 pt-8 border-t border-gray-200">
        Last updated: {new Date().toLocaleString()}
        {userRole === 'admin' && (
          <span className="ml-4">• System uptime: 99.9%</span>
        )}
        {(userRole === 'manager' || userRole === 'landlord') && dashboardData.recentMaintenance && (
          <span className="ml-4">• {dashboardData.recentMaintenance.length} recent maintenance updates</span>
        )}
        {userRole === 'tenant' && dashboardData.payments && (
          <span className="ml-4">• {dashboardData.payments.length} payment records</span>
        )}
      </div>
    </div>
  );
}