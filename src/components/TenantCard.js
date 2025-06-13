// src/components/TenantCard.js
import Link from "next/link";

export default function TenantCard({ tenant }) {
  return (
    <div className="border rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow">
      <h3 className="text-xl font-semibold">{tenant.name}</h3>
      <p className="text-gray-600">{tenant.email}</p>
      <p className="text-gray-600">{tenant.phone}</p>
      <div className="mt-2 flex justify-between items-center">
        <span className="text-gray-700">Property: {tenant.propertyAddress}</span>
        <Link 
          href={`/tenants/${tenant.id}`} 
          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
        >
          View
        </Link>
      </div>
    </div>
  );
}