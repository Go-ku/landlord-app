import { formatCurrency } from 'utils/currency';

export default function DashboardStats({ 
  properties, 
  tenants, 
  rent, 
  occupancy, 
  overdueRentals = 0,
  overdueAmount = 0 
}) {
  const stats = [
    { 
      name: 'Total Properties', 
      value: properties, 
      trend: 'up',
      color: 'text-blue-600'
    },
    { 
      name: 'Active Tenants', 
      value: tenants, 
      trend: 'up',
      color: 'text-green-600'
    },
    { 
      name: 'Monthly Rent Income', 
      value: formatCurrency(rent), 
      trend: 'up',
      color: 'text-purple-600'
    },
    { 
      name: 'Occupancy Rate', 
      value: `${occupancy}%`, 
      trend: occupancy > 80 ? 'up' : 'down',
      color: occupancy > 80 ? 'text-green-600' : 'text-orange-600'
    },
    { 
      name: 'Overdue Rentals', 
      value: overdueRentals, 
      trend: overdueRentals > 0 ? 'down' : 'up',
      color: overdueRentals > 0 ? 'text-red-600' : 'text-green-600',
      warning: overdueRentals > 0
    },
    { 
      name: 'Overdue Amount', 
      value: formatCurrency(overdueAmount), 
      trend: overdueAmount > 0 ? 'down' : 'up',
      color: overdueAmount > 0 ? 'text-red-600' : 'text-green-600',
      warning: overdueAmount > 0
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {stats.map((stat) => (
        <div 
          key={stat.name} 
          className={`bg-white p-4 rounded-lg shadow transition-all hover:shadow-md ${
            stat.warning ? 'border-l-4 border-red-400' : ''
          }`}
        >
          <div className="flex justify-between items-start">
            <h3 className="text-sm font-medium text-gray-500">{stat.name}</h3>
            <div className="flex items-center">
              {stat.warning && (
                <span className="text-red-500 mr-1" title="Attention required">
                  ⚠️
                </span>
              )}
              <span className={`text-sm font-medium ${
                stat.trend === 'up' ? 'text-green-500' : 'text-red-500'
              }`}>
                {stat.trend === 'up' ? '↑' : '↓'}
              </span>
            </div>
          </div>
          <p className={`mt-2 text-2xl font-semibold ${stat.color}`}>
            {stat.value}
          </p>
          
          {/* Additional context for overdue stats */}
          {stat.name === 'Overdue Rentals' && overdueRentals > 0 && (
            <p className="text-xs text-red-500 mt-1">
              {overdueRentals === 1 ? 'tenant needs' : 'tenants need'} follow-up
            </p>
          )}
          {stat.name === 'Overdue Amount' && overdueAmount > 0 && (
            <p className="text-xs text-red-500 mt-1">
              requires collection
            </p>
          )}
          {stat.name === 'Overdue Rentals' && overdueRentals === 0 && (
            <p className="text-xs text-green-500 mt-1">
              all payments current
            </p>
          )}
        </div>
      ))}
    </div>
  );
}