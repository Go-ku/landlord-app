// src/app/reports/ReportsClient.js
'use client';
import { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { 
  RefreshCw, 
  Download, 
  Filter,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Home,
  Users,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  BarChart3
} from 'lucide-react';

export default function ReportsClient({ initialData, userRole, searchParams }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('12months');
  const [activeTab, setActiveTab] = useState('overview');
  
  // Chart colors
  const colors = {
    primary: '#3B82F6',
    secondary: '#10B981',
    accent: '#F59E0B',
    danger: '#EF4444',
    warning: '#F97316'
  };

  // Handle data refresh
  const handleRefresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reports', {
        cache: 'no-store',
      });
      
      if (response.ok) {
        const newData = await response.json();
        setData(newData);
      }
    } catch (error) {
      console.error('Error refreshing reports:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Export reports
  const handleExport = useCallback(async (format = 'csv') => {
    try {
      const response = await fetch(`/api/reports/export?format=${format}&range=${dateRange}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `property-reports-${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting reports:', error);
    }
  }, [dateRange]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency: 'ZMW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Prepare pie chart data for occupancy
  const occupancyData = [
    { name: 'Occupied', value: Math.round(data.overview.totalProperties * data.overview.occupancyRate / 100), color: colors.primary },
    { name: 'Vacant', value: data.overview.totalProperties - Math.round(data.overview.totalProperties * data.overview.occupancyRate / 100), color: colors.secondary }
  ];

  // Prepare maintenance status data
  const maintenanceData = [
    { name: 'Pending', value: data.overview.pendingMaintenance, color: colors.warning },
    { name: 'Completed', value: data.overview.completedMaintenance, color: colors.secondary }
  ];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">Report Controls</h2>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="1month">Last Month</option>
              <option value="3months">Last 3 Months</option>
              <option value="6months">Last 6 Months</option>
              <option value="12months">Last 12 Months</option>
              <option value="ytd">Year to Date</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            
            <button
              onClick={() => handleExport('csv')}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </button>
            
            <button
              onClick={() => handleExport('pdf')}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              <FileText className="w-4 h-4 mr-2" />
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'financial', label: 'Financial', icon: DollarSign },
              { id: 'occupancy', label: 'Occupancy', icon: Home },
              { id: 'maintenance', label: 'Maintenance', icon: Wrench }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900">Portfolio Overview</h3>
              
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100">Total Revenue (YTD)</p>
                      <p className="text-2xl font-bold">{formatCurrency(data.overview.currentYearRevenue)}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-blue-200" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100">Occupancy Rate</p>
                      <p className="text-2xl font-bold">{data.overview.occupancyRate}%</p>
                    </div>
                    <Home className="w-8 h-8 text-green-200" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100">Active Leases</p>
                      <p className="text-2xl font-bold">{data.overview.activeLeases}</p>
                    </div>
                    <Users className="w-8 h-8 text-purple-200" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100">Maintenance Requests</p>
                      <p className="text-2xl font-bold">{data.overview.totalMaintenanceRequests}</p>
                    </div>
                    <Wrench className="w-8 h-8 text-orange-200" />
                  </div>
                </div>
              </div>

              {/* Revenue Trend */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Revenue Trend (Last 12 Months)</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.trends.monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `K${(value / 1000).toFixed(0)}`} />
                    <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke={colors.primary} 
                      strokeWidth={3}
                      dot={{ fill: colors.primary, strokeWidth: 2, r: 4 }}
                      name="Monthly Revenue"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Financial Tab */}
          {activeTab === 'financial' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900">Financial Analysis</h3>
              
              {/* Financial Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">This Month</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.overview.currentMonthRevenue)}</p>
                      <div className="flex items-center mt-2">
                        {data.overview.revenueGrowth >= 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                        )}
                        <span className={`text-sm ${data.overview.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {data.overview.revenueGrowth >= 0 ? '+' : ''}{data.overview.revenueGrowth}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Last Month</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.overview.lastMonthRevenue)}</p>
                      <p className="text-sm text-gray-500 mt-2">Previous period</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Year to Date</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.overview.currentYearRevenue)}</p>
                      <p className="text-sm text-gray-500 mt-2">{data.overview.totalPayments} payments</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Revenue & Payments Chart */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Revenue & Payment Count</h4>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={data.trends.monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" tickFormatter={(value) => `K${(value / 1000).toFixed(0)}`} />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'revenue' ? formatCurrency(value) : value,
                        name === 'revenue' ? 'Revenue' : 'Payments'
                      ]} 
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="revenue" fill={colors.primary} name="Revenue" />
                    <Bar yAxisId="right" dataKey="payments" fill={colors.secondary} name="Payments" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Occupancy Tab */}
          {activeTab === 'occupancy' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900">Occupancy Analysis</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Occupancy Rate Chart */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Property Occupancy</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={occupancyData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {occupancyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Occupancy Metrics */}
                <div className="space-y-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Properties</p>
                        <p className="text-3xl font-bold text-gray-900">{data.overview.totalProperties}</p>
                      </div>
                      <Home className="w-8 h-8 text-blue-500" />
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Occupied Properties</p>
                        <p className="text-3xl font-bold text-green-600">
                          {Math.round(data.overview.totalProperties * data.overview.occupancyRate / 100)}
                        </p>
                      </div>
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Vacant Properties</p>
                        <p className="text-3xl font-bold text-orange-600">
                          {data.overview.totalProperties - Math.round(data.overview.totalProperties * data.overview.occupancyRate / 100)}
                        </p>
                      </div>
                      <AlertTriangle className="w-8 h-8 text-orange-500" />
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Leases Expiring Soon</p>
                        <p className="text-3xl font-bold text-red-600">{data.overview.expiringLeases}</p>
                        <p className="text-xs text-gray-500">Next 30 days</p>
                      </div>
                      <Clock className="w-8 h-8 text-red-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Maintenance Tab */}
          {activeTab === 'maintenance' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900">Maintenance Overview</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Maintenance Status Chart */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Request Status</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={maintenanceData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {maintenanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Maintenance Metrics */}
                <div className="space-y-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Requests</p>
                        <p className="text-3xl font-bold text-gray-900">{data.overview.totalMaintenanceRequests}</p>
                      </div>
                      <Wrench className="w-8 h-8 text-blue-500" />
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Pending Requests</p>
                        <p className="text-3xl font-bold text-orange-600">{data.overview.pendingMaintenance}</p>
                      </div>
                      <Clock className="w-8 h-8 text-orange-500" />
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Completed Requests</p>
                        <p className="text-3xl font-bold text-green-600">{data.overview.completedMaintenance}</p>
                      </div>
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Completion Rate</p>
                        <p className="text-3xl font-bold text-blue-600">
                          {data.overview.totalMaintenanceRequests > 0 
                            ? Math.round((data.overview.completedMaintenance / data.overview.totalMaintenanceRequests) * 100)
                            : 0}%
                        </p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-blue-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center">
          <RefreshCw className="w-4 h-4 animate-spin mr-2" />
          Refreshing reports...
        </div>
      )}
    </div>
  );
}