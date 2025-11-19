// src/app/layout.jsx
import Providers from './providers'; // Fixed import path
import Navbar from "@/components/Navbar";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Landlord App",
  description: "Manage your rental properties",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased`}>
        <Providers>

          <main className="min-h-screen">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}