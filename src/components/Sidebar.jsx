'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FiMenu, FiX, FiHome, FiDollarSign, FiTool, FiFileText, FiUsers, FiPieChart } from 'react-icons/fi';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  const isActive = (path) => pathname.startsWith(path);

  if (!session) return null;

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg z-40"
      >
        <FiMenu size={24} />
      </button>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-200 ease-in-out z-50 w-64 bg-white shadow-lg md:shadow-none md:static md:w-auto`}>
        <div className="flex items-center justify-between p-4 border-b">
          <span className="font-bold">Menu</span>
          <button 
            onClick={() => setIsOpen(false)}
            className="md:hidden text-gray-500 hover:text-gray-700"
          >
            <FiX size={20} />
          </button>
        </div>

        <nav className="p-4">
          {session.user.role === 'landlord' && (
            <ul className="space-y-2">
              <SidebarLink href="/dashboard" icon={<FiHome />} active={isActive('/dashboard')}>
                Dashboard
              </SidebarLink>
              <SidebarLink href="/properties" icon={<FiHome />} active={isActive('/properties')}>
                Properties
              </SidebarLink>
              <SidebarLink href="/tenants" icon={<FiUsers />} active={isActive('/tenants')}>
                Tenants
              </SidebarLink>
              <SidebarLink href="/invoices" icon={<FiDollarSign />} active={isActive('/invoices')}>
                Invoices
              </SidebarLink>
              <SidebarLink href="/payments" icon={<FiDollarSign />} active={isActive('/payments')}>
                Payments
              </SidebarLink>
              <SidebarLink href="/maintenance" icon={<FiTool />} active={isActive('/maintenance')}>
                Maintenance
              </SidebarLink>
              <SidebarLink href="/reports" icon={<FiPieChart />} active={isActive('/reports')}>
                Reports
              </SidebarLink>
            </ul>
          )}

          {session.user.role === 'tenant' && (
            <ul className="space-y-2">
              <SidebarLink href="/tenant" icon={<FiHome />} active={isActive('/tenant')}>
                Dashboard
              </SidebarLink>
              <SidebarLink href="/tenant/payments" icon={<FiDollarSign />} active={isActive('/tenant/payments')}>
                My Payments
              </SidebarLink>
              <SidebarLink href="/tenant/maintenance" icon={<FiTool />} active={isActive('/tenant/maintenance')}>
                Maintenance
              </SidebarLink>
              <SidebarLink href="/tenant/leases" icon={<FiFileText />} active={isActive('/tenant/leases')}>
                My Lease
              </SidebarLink>
            </ul>
          )}
        </nav>
      </div>
    </>
  );
}

function SidebarLink({ href, icon, active, children }) {
  return (
    <li>
      <Link
        href={href}
        className={`flex items-center p-2 rounded-lg ${active ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}
      >
        <span className="mr-3">{icon}</span>
        <span>{children}</span>
      </Link>
    </li>
  );
}