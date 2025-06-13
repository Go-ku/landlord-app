import Navigation from '@/components/Navigation';
import Sidebar from '@/components/Sidebar';

export default function TenantLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 py-6 pl-4 md:pl-64">
          <div className="container mx-auto px-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}