// src/components/PropertyCard.js
import Link from "next/link";

export default function PropertyCard({ property }) {
  return (
    <div className="border rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow">
      <h3 className="text-xl font-semibold">{property.address}</h3>
      <p className="text-gray-600">{property.type}</p>
      <div className="mt-2 flex justify-between items-center">
        <span className="text-lg font-bold">${property.rent}/month</span>
        <Link 
          href={`/properties/${property.id}`} 
          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
        >
          View
        </Link>
      </div>
    </div>
  );
}