'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import NotificationCenter from './NotificationCenter';
import {
  Home,
  Building2,
  Users,
  FileText,
  CreditCard,
  DollarSign,
  Wrench,
  BarChart3,
  Settings,
  UserCog,
  Shield,
  CheckSquare,
  User,
  LogOut,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  const isActive = (path) => pathname.startsWith(path);

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut({ 
        redirect: true,
        callbackUrl: '/' 
      });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  if (!session) return null;

  // Define navigation items with icons based on role
  const getNavigationItems = (role) => {
    const baseItems = [
      { href: '/dashboard', label: 'Dashboard', icon: Home, roles: ['landlord', 'manager', 'tenant', 'admin'] }
    ];

    if (role === 'landlord') {
      return [
        ...baseItems,
        { href: '/properties', label: 'Properties', icon: Building2, roles: ['landlord'] },
        { href: '/tenants', label: 'Tenants', icon: Users, roles: ['landlord'] },
        
        { href: '/invoices', label: 'Invoices', icon: CreditCard, roles: ['landlord'] },
        { href: '/payments', label: 'Payments', icon: DollarSign, roles: ['landlord'] },
        { href: '/maintenance', label: 'Maintenance', icon: Wrench, roles: ['landlord'] },
        { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['landlord'] }
      ];
    } else if (role === 'manager') {
      return [
        ...baseItems,
        { href: '/properties', label: 'Properties', icon: Building2, roles: ['manager'] },
        { href: '/tenants', label: 'Tenants', icon: Users, roles: ['manager'] },
        
        { href: '/invoices', label: 'Invoices', icon: CreditCard, roles: ['manager'] },
        { href: '/payments', label: 'Payments', icon: DollarSign, roles: ['manager'] },
        { href: '/maintenance', label: 'Maintenance', icon: Wrench, roles: ['manager'] },
        { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['manager'] },
        { href: '/users', label: 'Users', icon: UserCog, roles: ['manager'] },
        { href: '/manager/assign-properties', label: 'Assignments', icon: CheckSquare, roles: ['manager'] },
        { href: '/manager/approvals', label: 'Approvals', icon: Shield, roles: ['manager'] }
      ];
    } else if (role === 'admin') {
      return [
        ...baseItems,
        { href: '/admin', label: 'Admin Panel', icon: Shield, roles: ['admin'] },
        { href: '/admin/payments', label: 'Payments', icon: DollarSign, roles: ['admin'] },
        { href: '/admin/invoices', label: 'Invoices', icon: CreditCard, roles: ['admin'] },
        { href: '/admin/reports', label: 'Reports', icon: BarChart3, roles: ['admin'] }
      ];
    } else if (role === 'tenant') {
      return [
        { href: '/tenant', label: 'Dashboard', icon: Home, roles: ['tenant'] },
        { href: '/tenant/lease', label: 'My Lease', icon: FileText, roles: ['tenant'] },
        { href: '/tenant/invoices', label: 'Invoices', icon: CreditCard, roles: ['tenant'] },
        { href: '/tenant/payments', label: 'Payments', icon: DollarSign, roles: ['tenant'] },
        { href: '/tenant/maintenance', label: 'Maintenance', icon: Wrench, roles: ['tenant'] },
        { href: '/tenant/profile', label: 'Profile', icon: User, roles: ['tenant'] }
      ];
    }

    return baseItems;
  };

  const navigationItems = getNavigationItems(session.user.role);

  // Role color configuration
  const getRoleColors = (role) => {
    switch (role) {
      case 'landlord':
        return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' };
      case 'manager':
        return { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' };
      case 'admin':
        return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' };
      default:
        return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' };
    }
  };

  const roleColors = getRoleColors(session.user.role);

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex justify-between h-16">
          {/* Logo and main navigation */}
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="flex items-center group">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-amber-300" />
                </div>
                <span className="font-bold text-xl bg-blue-600 bg-clip-text text-transparent group-hover:from-purple-600 group-hover:to-blue-600 transition-all duration-300">
                  RentEase
                </span>
              </div>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1">
              {navigationItems.map((item) => (
                <NavLink 
                  key={item.href} 
                  href={item.href} 
                  active={isActive(item.href)}
                  icon={item.icon}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>

          {/* Right side - Notifications and Profile */}
          <div className="flex items-center space-x-3">
            {/* Notification Center */}
            <NotificationCenter />

            {/* Role Badge */}
            <div className="hidden md:flex items-center">
              <span className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full border ${roleColors.bg} ${roleColors.text} ${roleColors.border}`}>
                <Shield className="w-3 h-3 mr-1.5" />
                {session.user.role.charAt(0).toUpperCase() + session.user.role.slice(1)}
                {session.user.role === 'admin' && session.user.adminLevel && (
                  <span className="ml-1 opacity-75 text-xs">
                    ({session.user.adminLevel})
                  </span>
                )}
              </span>
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center space-x-3 hover:bg-gray-50 rounded-xl p-2 transition-all duration-200 group border border-transparent hover:border-gray-200"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-sm">
                  {session.user.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-semibold text-gray-900 group-hover:text-gray-700">
                    {session.user.name || 'User'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {session.user.email?.split('@')[0] || 'user'}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
                  {/* User Info Header */}
                  <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                        {session.user.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{session.user.name}</p>
                        <p className="text-xs text-gray-500">{session.user.email}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Menu Items */}
                  <div className="py-1">
                    <ProfileMenuItem 
                      href="/profile" 
                      icon={User}
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      Profile Settings
                    </ProfileMenuItem>
                    
                    {session.user.role !== 'tenant' && (
                      <ProfileMenuItem 
                        href="/settings" 
                        icon={Settings}
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        System Settings
                      </ProfileMenuItem>
                    )}
                  </div>
                  
                  {/* Sign Out */}
                  <div className="border-t border-gray-100">
                    <button 
                      onClick={handleSignOut}
                      className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors group"
                    >
                      <LogOut className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-200 shadow-lg">
          <div className="px-4 py-3 space-y-1">
            {/* Role indicator */}
            <div className="px-3 py-2 mb-3">
              <span className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full ${roleColors.bg} ${roleColors.text}`}>
                <Shield className="w-3 h-3 mr-1.5" />
                {session.user.role.charAt(0).toUpperCase() + session.user.role.slice(1)} Dashboard
                {session.user.role === 'admin' && session.user.adminLevel && (
                  <span className="ml-1 opacity-75">
                    ({session.user.adminLevel})
                  </span>
                )}
              </span>
            </div>

            {/* Navigation items */}
            {navigationItems.map((item) => (
              <MobileNavLink 
                key={item.href} 
                href={item.href} 
                active={isActive(item.href)}
                icon={item.icon}
                onClick={closeMobileMenu}
              >
                {item.label}
              </MobileNavLink>
            ))}

            {/* Mobile profile section */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="px-3 py-2 mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                    {session.user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{session.user.name}</p>
                    <p className="text-xs text-gray-500">{session.user.email}</p>
                  </div>
                </div>
              </div>
              
              <MobileNavLink href="/profile" icon={User} onClick={closeMobileMenu}>
                Profile Settings
              </MobileNavLink>
              
              {session.user.role !== 'tenant' && (
                <MobileNavLink href="/settings" icon={Settings} onClick={closeMobileMenu}>
                  System Settings
                </MobileNavLink>
              )}
              
              <button 
                onClick={handleSignOut}
                className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-2"
              >
                <LogOut className="w-4 h-4 mr-3" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

function NavLink({ href, active, children, icon: Icon }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${
        active
          ? 'bg-blue-50 text-blue-700 border border-blue-200'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent hover:border-gray-200'
      }`}
    >
      <Icon className={`w-4 h-4 mr-2 transition-transform group-hover:scale-110 ${
        active ? 'text-blue-600' : 'text-gray-500'
      }`} />
      {children}
    </Link>
  );
}

function MobileNavLink({ href, active, children, icon: Icon, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <Icon className={`w-4 h-4 mr-3 ${active ? 'text-blue-600' : 'text-gray-500'}`} />
      {children}
    </Link>
  );
}

function ProfileMenuItem({ href, children, icon: Icon, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors group"
    >
      <Icon className="w-4 h-4 mr-3 text-gray-500 group-hover:text-gray-700 group-hover:scale-110 transition-all" />
      {children}
    </Link>
  );
}