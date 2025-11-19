// src/components/Navbar.js
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="border-b border-slate-200 bg-white/80 py-3 shadow-sm backdrop-blur">
      <div className="page-shell flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <span className="rounded-lg bg-slate-900 px-2 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white">Nkwazi</span>
          <span className="hidden sm:inline">Property Console</span>
        </Link>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Link
            href="/properties"
            className="rounded-full px-3 py-2 transition hover:bg-slate-100"
          >
            Properties
          </Link>
          <Link
            href="/tenants"
            className="rounded-full px-3 py-2 transition hover:bg-slate-100"
          >
            Tenants
          </Link>
          <Link
            href="/rent"
            className="rounded-full px-3 py-2 transition hover:bg-slate-100"
          >
            Rent
          </Link>
        </div>
      </div>
    </nav>
  );
}