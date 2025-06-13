import Link from 'next/link';
import { format } from 'date-fns';

const priorityColors = {
  High: 'red',
  Medium: 'orange',
  Low: 'blue'
};

const statusColors = {
  Pending: 'gray',
  'In Progress': 'blue',
  Completed: 'green'
};

export default function MaintenanceStatus({ requests }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Maintenance Requests</h2>
        <Link href="/maintenance" className="text-sm text-blue-600 hover:underline">
          View All
        </Link>
      </div>
      
      <div className="space-y-4">
        {requests?.length > 0 ? (
          requests.map((request) => (
            <div key={request._id} className="border-b pb-3 last:border-0">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{request.title}</p>
                  <p className="text-sm text-gray-500 line-clamp-1">{request.description}</p>
                </div>
                <div className="flex space-x-2">
                  <span className={`text-xs px-2 py-1 rounded-full bg-${priorityColors[request.priority]}-100 text-${priorityColors[request.priority]}-800`}>
                    {request.priority}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full bg-${statusColors[request.status]}-100 text-${statusColors[request.status]}-800`}>
                    {request.status}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-400">
                  {format(new Date(request.dateReported), 'MMM dd, yyyy')}
                </p>
                {request.propertyId?.address && (
                  <p className="text-xs text-gray-500 truncate max-w-[120px]">
                    {request.propertyId.address}
                  </p>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-center py-4">No maintenance requests found</p>
        )}
      </div>
    </div>
  );
}