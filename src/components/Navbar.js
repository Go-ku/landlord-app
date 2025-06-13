// src/components/Navbar.js
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-blue-600 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">Landlord App</Link>
        <div className="flex space-x-4">
          <Link href="/properties" className="hover:underline">Properties</Link>
          <Link href="/tenants" className="hover:underline">Tenants</Link>
          <Link href="/rent" className="hover:underline">Rent</Link>
        </div>
      </div>
    </nav>
  );
}