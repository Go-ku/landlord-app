// components/landlord/TenantOverview.jsx
'use client';
import { FiAlertTriangle, FiCheckCircle, FiClock, FiDollarSign, FiHome, FiMail, FiPhone } from 'react-icons/fi';
import Link from 'next/link';

export default function TenantOverview({ tenant, lease, payments, property }) {
  // Calculate payment status
  const lastPayment = payments[0];
  const isOverdue = lease && new Date() > new Date(lease.nextPaymentDue) && !lastPayment?.paid;
  const daysOverdue = isOverdue ? 
    Math.floor((new Date() - new Date(lease.nextPaymentDue)) / (1000 * 60 * 60 * 24)) : 0;

  // Calculate payment progress
  const paidPercentage = lease ? 
    Math.min(100, ((lastPayment?.amount || 0) / lease.monthlyRent * 100)) : 0;

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6">
        {/* Tenant Info */}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">{tenant.name}</h2>
              <div className="flex items-center text-gray-600 mt-1">
                <FiMail className="mr-2" />
                <span>{tenant.email}</span>
              </div>
              <div className="flex items-center text-gray-600 mt-1">
                <FiPhone className="mr-2" />
                <span>{tenant.phone || 'No phone number'}</span>
              </div>
            </div>
            
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              isOverdue ? 'bg-red-100 text-red-800' : 
              lastPayment?.paid ? 'bg-green-100 text-green-800' : 
              'bg-blue-100 text-blue-800'
            }`}>
              {isOverdue ? 'Overdue' : lastPayment?.paid ? 'Paid' : 'Pending'}
            </div>
          </div>

          <div className="mt-4">
            <h3 className="font-semibold mb-2">Current Lease</h3>
            {lease ? (
              <div className="space-y-2">
                <div className="flex items-center">
                  <FiHome className="mr-2 text-gray-500" />
                  <Link 
                    href={`/properties/${property._id}`} 
                    className="text-blue-600 hover:underline"
                  >
                    {property.address}
                  </Link>
                </div>
                <div className="text-sm">
                  {new Date(lease.startDate).toLocaleDateString()} - {new Date(lease.endDate).toLocaleDateString()}
                </div>
                <div className="text-sm">
                  ${lease.monthlyRent}/month • {lease.paymentDueDay}th of each month
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No active lease</p>
            )}
          </div>
        </div>

        {/* Payment Status */}
        <div className="flex-1">
          <h3 className="font-semibold mb-3">Payment Status</h3>
          
          {lease ? (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Monthly Rent</span>
                  <span>${lease.monthlyRent}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${paidPercentage}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-gray-500 text-sm">Next Payment</div>
                  <div className="font-medium">
                    {new Date(lease.nextPaymentDue).toLocaleDateString()}
                  </div>
                </div>
                
                <div className={`p-3 rounded-lg ${
                  isOverdue ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
                }`}>
                  <div className="text-sm">
                    {isOverdue ? 'Days Overdue' : 'Status'}
                  </div>
                  <div className="font-medium flex items-center">
                    {isOverdue ? (
                      <>
                        <FiAlertTriangle className="mr-1" /> {Math.floor(daysOverdue)} days
                      </>
                    ) : (
                      <>
                        <FiCheckCircle className="mr-1" /> Current
                      </>
                    )}
                  </div>
                </div>
              </div>

              {lastPayment && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-gray-500 text-sm">Last Payment</div>
                  <div className="font-medium">
                    ${lastPayment.amount} on {new Date(lastPayment.date).toLocaleDateString()}
                  </div>
                  <div className="text-sm">
                    {lastPayment.method} • {lastPayment.status}
                  </div>
                </div>
              )}

              <Link 
                href={`/tenants/${tenant._id}/payments`}
                className="inline-block text-blue-600 hover:text-blue-800 text-sm"
              >
                View all payments →
              </Link>
            </div>
          ) : (
            <p className="text-gray-500">No payment information available</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col space-y-2 w-full md:w-auto">
          <h3 className="font-semibold">Quick Actions</h3>
          <Link
            href={`/tenants/${tenant._id}/send-invoice`}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            <FiDollarSign className="mr-2" /> Send Invoice
          </Link>
          <Link
            href={`/tenants/${tenant._id}/record-payment`}
            className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          >
            <FiCheckCircle className="mr-2" /> Record Payment
          </Link>
          <Link
            href={`/tenants/${tenant._id}/messages`}
            className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
          >
            <FiMail className="mr-2" /> Send Message
          </Link>
          {isOverdue && (
            <Link
              href={`/tenants/${tenant._id}/send-reminder`}
              className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
            >
              <FiClock className="mr-2" /> Send Reminder
            </Link>
          )}
        </div>
      </div>

      {/* Maintenance Alerts */}
      <div className="mt-6 pt-6 border-t">
        <h3 className="font-semibold mb-3">Open Maintenance Requests</h3>
        {tenant.maintenanceRequests?.length > 0 ? (
          <div className="space-y-2">
            {tenant.maintenanceRequests.slice(0, 3).map(request => (
              <div key={request._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">{request.title}</div>
                  <div className="text-sm text-gray-600">
                    {new Date(request.dateReported).toLocaleDateString()}
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  request.status === 'Completed' ? 'bg-green-100 text-green-800' :
                  request.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {request.status}
                </span>
              </div>
            ))}
            {tenant.maintenanceRequests.length > 3 && (
              <Link 
                href={`/tenants/${tenant._id}/maintenance`}
                className="inline-block text-blue-600 hover:text-blue-800 text-sm"
              >
                View all {tenant.maintenanceRequests.length} requests →
              </Link>
            )}
          </div>
        ) : (
          <p className="text-gray-500">No open maintenance requests</p>
        )}
      </div>
    </div>
  );
}