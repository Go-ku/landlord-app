import { Inter } from 'next/font/google';
import { Providers } from '@/components/Providers';

const inter = Inter({ subsets: ['latin'] });

export default function AuthLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased`}>
        <Providers>
          <div className="min-h-screen">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}