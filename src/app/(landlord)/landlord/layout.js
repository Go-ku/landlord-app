import Navigation from '@/components/Navigation';


export default function LandlordLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="flex">
        <main className="flex-1 py-6">
          <div className="container mx-auto px-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}