'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiChevronRight } from 'react-icons/fi';

export default function Breadcrumbs() {
  const pathname = usePathname();
  const paths = pathname.split('/').filter(Boolean);

  return (
    <nav className="flex mb-4" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        <li className="inline-flex items-center">
          <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600">
            Home
          </Link>
        </li>
        {paths.map((path, index) => (
          <li key={index}>
            <div className="flex items-center">
              <FiChevronRight className="w-4 h-4 text-gray-400" />
              <Link
                href={`/${paths.slice(0, index + 1).join('/')}`}
                className={`ml-1 text-sm font-medium ${index === paths.length - 1 ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'} md:ml-2`}
              >
                {path.charAt(0).toUpperCase() + path.slice(1)}
              </Link>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}