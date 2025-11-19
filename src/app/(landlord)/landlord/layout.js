import Navigation from '@/components/Navigation';


export default function LandlordLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navigation />
      <div className="flex">
        <main className="flex-1 py-8">
          <div className="page-shell space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}