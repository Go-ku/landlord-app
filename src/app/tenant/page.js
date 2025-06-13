// app/tenant/page.js
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Wrench,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  Bell,
  Plus,
  Eye,
  Download,
  User,
  Building,
  Loader2,
  ExternalLink,
  AlertTriangle,
  Info,
  Settings,
  Receipt,
  Zap
} from 'lucide-react';

export default function TenantDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  
  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState('');

  // Redirect if not tenant
  useEffect(() => {
    if (session && session.user.role !== 'tenant') {
      router.push('/dashboard');
    }
  }, [session, router]);

  // Fetch dashboard data
  useEffect(() => {
    if (session?.user?.role === 'tenant') {
      fetchDashboardData();
    }
  }, [session]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/tenants/dashboard');
      const data = await response.json();
      
      if (data.success) {
        setDashboardData(data.data);
        setError('');
      } else {
        setError(data.error || 'Failed to load dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick actions
  const quickActions = [
    {
      title: 'Submit Maintenance Request',
      description: 'Report an issue with your property',
      icon: Wrench,
      href: '/tenant/maintenance/new',
      color: 'bg-blue-500 hover:bg-blue-600',
      textColor: 'text-blue-600'
    },
    {
      title: 'Make Payment',
      description: 'Pay your rent online',
      icon: CreditCard,
      href: '/tenant/payments/new',
      color: 'bg-green-500 hover:bg-green-600',
      textColor: 'text-green-600'
    },
    {
      title: 'View Lease',
      description: 'Review your lease agreement',
      icon: FileText,
      href: '/tenant/lease',
      color: 'bg-purple-500 hover:bg-purple-600',
      textColor: 'text-purple-600'
    },
    {
      title: 'Contact Landlord',
      description: 'Get in touch with your landlord',
      icon: Phone,
      href: '/tenant/contact',
      color: 'bg-orange-500 hover:bg-orange-600',
      textColor: 'text-orange-600'
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (session?.user?.role !== 'tenant') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">This page is only accessible to tenants.</p>
        </div>
      </div>
    );
  }

  const user = dashboardData?.user || {};
  const lease = dashboardData?.lease || {};
  const payments = dashboardData?.payments || [];
  const maintenanceRequests = dashboardData?.maintenanceRequests || [];
  const stats = dashboardData?.stats || {};
  const alerts = dashboardData?.alerts || [];

  // Get upcoming payment
  const upcomingPayment = payments.find(p => p.isUpcoming);
  const overdue = payments.filter(p => p.isOverdue).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {user.name || 'Tenant'}! 👋
              </h1>
              <p className="text-gray-600 mt-1">
                {`Here's what's happening with your rental`}
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-3">
              <Link
                href="/tenant/profile"
                className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Link>
              <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="mb-6 space-y-3">
            {alerts.map((alert, index) => (
              <div key={index} className={`rounded-lg p-4 border ${
                alert.type === 'error' ? 'bg-red-50 border-red-200' :
                alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {alert.type === 'error' ? (
                      <AlertTriangle className="w-5 h-5 text-red-500 mr-3" />
                    ) : alert.type === 'warning' ? (
                      <Clock className="w-5 h-5 text-yellow-500 mr-3" />
                    ) : (
                      <Info className="w-5 h-5 text-blue-500 mr-3" />
                    )}
                    <div>
                      <p className={`font-medium ${
                        alert.type === 'error' ? 'text-red-900' :
                        alert.type === 'warning' ? 'text-yellow-900' :
                        'text-blue-900'
                      }`}>{alert.title}</p>
                      <p className={`text-sm ${
                        alert.type === 'error' ? 'text-red-700' :
                        alert.type === 'warning' ? 'text-yellow-700' :
                        'text-blue-700'
                      }`}>{alert.message}</p>
                    </div>
                  </div>
                  {alert.action && (
                    <Link
                      href={alert.action.href}
                      className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        alert.type === 'error' ? 'bg-red-600 text-white hover:bg-red-700' :
                        alert.type === 'warning' ? 'bg-yellow-600 text-white hover:bg-yellow-700' :
                        'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {alert.action.text}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Monthly Rent</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${lease.monthlyRent?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${overdue > 0 ? 'bg-red-100' : 'bg-blue-100'}`}>
                <Receipt className={`w-6 h-6 ${overdue > 0 ? 'text-red-600' : 'text-blue-600'}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Payment Status</p>
                <p className={`text-2xl font-bold ${overdue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {overdue > 0 ? `${overdue} Overdue` : 'Current'}
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
                <p className="text-sm font-medium text-gray-600">Open Requests</p>
                <p className="text-2xl font-bold text-gray-900">
                  {maintenanceRequests.filter(r => r.isOpen).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Lease Expires</p>
                <p className="text-2xl font-bold text-gray-900">
                  {lease.endDate ? new Date(lease.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Recent Payments */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Recent Payments</h2>
                <Link
                  href="/tenant/payments"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                >
                  View all
                  <ExternalLink className="w-4 h-4 ml-1" />
                </Link>
              </div>

              {upcomingPayment && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Clock className="w-5 h-5 text-blue-600 mr-3" />
                      <div>
                        <p className="font-medium text-blue-900">Upcoming Payment</p>
                        <p className="text-sm text-blue-700">
                          Due {new Date(upcomingPayment.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-900">${upcomingPayment.amount}</p>
                      <Link
                        href={`/tenant/payments/${upcomingPayment._id}`}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Pay now →
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {payments.slice(0, 5).map((payment) => (
                  <div key={payment._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-lg mr-3 ${
                        payment.status === 'completed' ? 'bg-green-100' :
                        payment.status === 'pending' ? 'bg-yellow-100' :
                        payment.status === 'overdue' ? 'bg-red-100' : 'bg-gray-100'
                      }`}>
                        <Receipt className={`w-4 h-4 ${
                          payment.status === 'completed' ? 'text-green-600' :
                          payment.status === 'pending' ? 'text-yellow-600' :
                          payment.status === 'overdue' ? 'text-red-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          ${payment.amount} - {payment.type || 'Rent'}
                        </p>
                        <p className="text-sm text-gray-600">
                          Due: {new Date(payment.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        payment.status === 'completed' || payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                        payment.isOverdue ? 'bg-red-100 text-red-800' :
                        payment.isUpcoming ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {payment.status === 'completed' || payment.status === 'paid' ? 'Paid' :
                         payment.isOverdue ? `Overdue (${payment.daysPastDue} days)` :
                         payment.isUpcoming ? 'Due Soon' : 
                         payment.status === 'pending' ? 'Pending' :
                         payment.status}
                      </span>
                      <Link
                        href={`/tenant/payments/${payment._id}`}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {payments.length === 0 && (
                <div className="text-center py-8">
                  <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No payment history available</p>
                </div>
              )}
            </div>

            {/* Maintenance Requests */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Maintenance Requests</h2>
                <Link
                  href="/tenant/maintenance"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                >
                  View all
                  <ExternalLink className="w-4 h-4 ml-1" />
                </Link>
              </div>

              <div className="space-y-3">
                {maintenanceRequests.slice(0, 5).map((request) => (
                  <div key={request._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-lg mr-3 ${
                        request.priority === 'high' ? 'bg-red-100' :
                        request.priority === 'medium' ? 'bg-yellow-100' : 'bg-green-100'
                      }`}>
                        <Wrench className={`w-4 h-4 ${
                          request.priority === 'high' ? 'text-red-600' :
                          request.priority === 'medium' ? 'text-yellow-600' : 'text-green-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{request.title}</p>
                        <p className="text-sm text-gray-600">
                          {request.category} • {new Date(request.dateReported).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        request.status === 'completed' ? 'bg-green-100 text-green-800' :
                        request.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                        request.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {request.status === 'in_progress' ? 'In Progress' : 
                         request.status === 'pending' ? 'Pending' :
                         request.status === 'completed' ? 'Completed' :
                         request.status === 'cancelled' ? 'Cancelled' :
                         request.status}
                      </span>
                      <Link
                        href={`/tenant/maintenance/${request._id}`}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {maintenanceRequests.length === 0 && (
                <div className="text-center py-8">
                  <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-3">No maintenance requests yet</p>
                  <Link
                    href="/tenant/maintenance/new"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Submit Request
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Property Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Building className="w-5 h-5 mr-2 text-blue-600" />
                Your Property
              </h3>
              
              {user.currentProperty ? (
                <div className="space-y-4">
                  <div className="flex items-start">
                    <MapPin className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">{user.currentProperty.address}</p>
                      <p className="text-sm text-gray-600">{user.currentProperty.type}</p>
                    </div>
                  </div>
                  
                  {lease.startDate && (
                    <div className="flex items-center">
                      <Calendar className="w-5 h-5 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm text-gray-600">Lease Period</p>
                        <p className="font-medium text-gray-900">
                          {new Date(lease.startDate).toLocaleDateString()} - {new Date(lease.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <Link
                    href="/tenant/property"
                    className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View details
                    <ExternalLink className="w-4 h-4 ml-1" />
                  </Link>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Building className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 text-sm">No property assigned</p>
                </div>
              )}
            </div>

            {/* Landlord Contact */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-green-600" />
                Landlord Contact
              </h3>
              
              {lease.landlordId ? (
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-gray-900">{lease.landlordId.name}</p>
                    <p className="text-sm text-gray-600">Property Owner</p>
                  </div>
                  
                  <div className="space-y-2">
                    <a
                      href={`mailto:${lease.landlordId.email}`}
                      className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      {lease.landlordId.email}
                    </a>
                    
                    {lease.landlordId.phone && (
                      <a
                        href={`tel:${lease.landlordId.phone}`}
                        className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        {lease.landlordId.phone}
                      </a>
                    )}
                  </div>
                  
                  <Link
                    href="/tenant/contact"
                    className="inline-flex items-center px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium w-full justify-center"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Contact Landlord
                  </Link>
                </div>
              ) : (
                <div className="text-center py-4">
                  <User className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 text-sm">No landlord assigned</p>
                </div>
              )}
            </div>

            {/* Emergency Contacts */}
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

            {/* Quick Tips */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Info className="w-5 h-5 mr-2 text-blue-600" />
                Quick Tips
              </h3>
              
              <div className="space-y-3 text-sm">
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
                <div className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-700">Review your lease agreement regularly</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}