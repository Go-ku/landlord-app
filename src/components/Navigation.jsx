'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState, useRef, useEffect, useCallback } from 'react';
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
  X,
  Activity,
  PlusCircle,
  FileCheck,
  Calendar,
  MapPin
} from 'lucide-react';

// Navigation configuration
const NAVIGATION_CONFIG = {
  tenant: [
    { href: '/tenant', label: 'Dashboard', icon: Home, roles: ['tenant'] },
    { href: '/tenant/lease', label: 'My Lease', icon: FileText, roles: ['tenant'] },
    { href: '/tenant/payments', label: 'Payments', icon: DollarSign, roles: ['tenant'] },
    { href: '/tenant/invoices', label: 'Invoices', icon: CreditCard, roles: ['tenant'] },
    { href: '/tenant/maintenance', label: 'Maintenance', icon: Wrench, roles: ['tenant'] },
    { href: '/tenant/profile', label: 'Profile', icon: User, roles: ['tenant'] }
  ],
  landlord: [
    { href: '/dashboard', label: 'Dashboard', icon: Home, roles: ['landlord'] },
    { href: '/properties', label: 'Properties', icon: Building2, roles: ['landlord'] },
    { href: '/tenants', label: 'Tenants', icon: Users, roles: ['landlord'] },
    { href: '/leases', label: 'Leases', icon: FileText, roles: ['landlord'] },
    { href: '/payments', label: 'Payments', icon: DollarSign, roles: ['landlord'] },
    { href: '/invoices', label: 'Invoices', icon: CreditCard, roles: ['landlord'] },
    { href: '/maintenance', label: 'Maintenance', icon: Wrench, roles: ['landlord'] },
    { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['landlord'] }
  ],
  manager: [
    { href: '/dashboard', label: 'Dashboard', icon: Home, roles: ['manager'] },
    { href: '/properties', label: 'Properties', icon: Building2, roles: ['manager'] },
    { href: '/tenants', label: 'Tenants', icon: Users, roles: ['manager'] },
    { href: '/leases', label: 'Leases', icon: FileText, roles: ['manager'] },
    { href: '/payments', label: 'Payments', icon: DollarSign, roles: ['manager'] },
    { href: '/invoices', label: 'Invoices', icon: CreditCard, roles: ['manager'] },
    { href: '/maintenance', label: 'Maintenance', icon: Wrench, roles: ['manager'] },
    { href: '/manager/approvals', label: 'Approvals', icon: CheckSquare, roles: ['manager'] },
    { href: '/users', label: 'Users', icon: UserCog, roles: ['manager'] },
    { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['manager'] }
  ],
  admin: [
    { href: '/dashboard', label: 'Dashboard', icon: Home, roles: ['admin'] },
    { href: '/admin', label: 'Admin Panel', icon: Shield, roles: ['admin'] },
    { href: '/admin/users', label: 'User Management', icon: UserCog, roles: ['admin'] },
    { href: '/admin/properties', label: 'Properties', icon: Building2, roles: ['admin'] },
    { href: '/admin/payments', label: 'Payments', icon: DollarSign, roles: ['admin'] },
    { href: '/admin/reports', label: 'Reports', icon: BarChart3, roles: ['admin'] },
    { href: '/admin/settings', label: 'System Settings', icon: Settings, roles: ['admin'] }
  ]
};

const ROLE_COLORS = {
  tenant: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200',
    solid: 'bg-green-600'
  },
  landlord: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-200',
    solid: 'bg-blue-600'
  },
  manager: {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    border: 'border-purple-200',
    solid: 'bg-purple-600'
  },
  admin: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
    solid: 'bg-red-600'
  }
};

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  
  // State management
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  
  // Refs
  const profileMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // Utility functions
  const isActive = useCallback((path) => {
    if (path === '/dashboard' || path === '/tenant') {
      return pathname === path;
    }
    return pathname.startsWith(path);
  }, [pathname]);

  const getUserInitials = useCallback((name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  }, []);

  const getNavigationItems = useCallback(() => {
    if (!session?.user?.role) return [];
    return NAVIGATION_CONFIG[session.user.role] || [];
  }, [session?.user?.role]);

  const getRoleColors = useCallback(() => {
    if (!session?.user?.role) return ROLE_COLORS.tenant;
    return ROLE_COLORS[session.user.role] || ROLE_COLORS.tenant;
  }, [session?.user?.role]);

  // Event handlers
  const handleSignOut = useCallback(async () => {
    if (isSigningOut) return;
    
    try {
      setIsSigningOut(true);
      await signOut({ 
        redirect: true,
        callbackUrl: '/auth/login'
      });
    } catch (error) {
      console.error('Sign out error:', error);
      setIsSigningOut(false);
    }
  }, [isSigningOut]);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const closeProfileMenu = useCallback(() => {
    setIsProfileMenuOpen(false);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  const toggleProfileMenu = useCallback(() => {
    setIsProfileMenuOpen(prev => !prev);
  }, []);

  // Effects
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false);
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
  }, [pathname]);

  // Don't render if not authenticated
  if (status === 'loading') {
    return <NavigationSkeleton />;
  }

  if (!session?.user) {
    return null;
  }

  const navigationItems = getNavigationItems();
  const roleColors = getRoleColors();
  const userInitials = getUserInitials(session.user.name);

  return (
    <>
      <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex justify-between h-16">
            {/* Logo and main navigation */}
            <div className="flex items-center space-x-8">
              {/* Logo */}
              <Link 
                href={session.user.role === 'tenant' ? '/tenant' : '/dashboard'} 
                className="flex items-center group"
              >
                <div className="flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded-lg ${roleColors.solid} flex items-center justify-center shadow-sm`}>
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-bold text-xl text-gray-800 group-hover:text-blue-600 transition-colors duration-300">
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
                    badge={item.badge}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>

            {/* Right side - Notifications and Profile */}
            <div className="flex items-center space-x-3">
              {/* Notification Center */}
              <div className="hidden sm:block">
                <NotificationCenter />
              </div>

              {/* Role Badge */}
              <div className="hidden md:flex items-center">
                <RoleBadge 
                  role={session.user.role} 
                  adminLevel={session.user.adminLevel}
                  colors={roleColors}
                />
              </div>

              {/* Profile Dropdown */}
              <div className="relative" ref={profileMenuRef}>
                <ProfileButton
                  user={session.user}
                  userInitials={userInitials}
                  isOpen={isProfileMenuOpen}
                  onClick={toggleProfileMenu}
                  roleColors={roleColors}
                />
                
                {isProfileMenuOpen && (
                  <ProfileDropdown
                    user={session.user}
                    userInitials={userInitials}
                    roleColors={roleColors}
                    onClose={closeProfileMenu}
                    onSignOut={handleSignOut}
                    isSigningOut={isSigningOut}
                  />
                )}
              </div>

              {/* Mobile menu button */}
              <button
                onClick={toggleMobileMenu}
                className="lg:hidden p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
                aria-label="Toggle mobile menu"
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
        <MobileMenu
          ref={mobileMenuRef}
          isOpen={isMobileMenuOpen}
          navigationItems={navigationItems}
          user={session.user}
          userInitials={userInitials}
          roleColors={roleColors}
          isActive={isActive}
          onClose={closeMobileMenu}
          onSignOut={handleSignOut}
          isSigningOut={isSigningOut}
        />
      </nav>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={closeMobileMenu}
        />
      )}
    </>
  );
}

// Sub-components
function NavLink({ href, active, children, icon: Icon, badge }) {
  return (
    <Link
      href={href}
      className={`relative inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${
        active
          ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent hover:border-gray-200'
      }`}
    >
      <Icon className={`w-4 h-4 mr-2 transition-transform group-hover:scale-110 ${
        active ? 'text-blue-600' : 'text-gray-500'
      }`} />
      {children}
      {badge && (
        <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
          {badge}
        </span>
      )}
    </Link>
  );
}

function RoleBadge({ role, adminLevel, colors }) {
  return (
    <span className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
      <Shield className="w-3 h-3 mr-1.5" />
      {role.charAt(0).toUpperCase() + role.slice(1)}
      {role === 'admin' && adminLevel && (
        <span className="ml-1 opacity-75 text-xs">
          ({adminLevel})
        </span>
      )}
    </span>
  );
}

function ProfileButton({ user, userInitials, isOpen, onClick, roleColors }) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center space-x-3 hover:bg-gray-50 rounded-xl p-2 transition-all duration-200 group border border-transparent hover:border-gray-200"
      aria-expanded={isOpen}
      aria-haspopup="true"
    >
      <div className={`w-9 h-9 rounded-xl ${roleColors.solid} flex items-center justify-center text-white font-semibold shadow-sm`}>
        {userInitials}
      </div>
      <div className="hidden md:flex flex-col items-start">
        <span className="text-sm font-semibold text-gray-900 group-hover:text-gray-700">
          {user.name || 'User'}
        </span>
        <span className="text-xs text-gray-500">
          {user.email?.split('@')[0] || 'user'}
        </span>
      </div>
      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  );
}

function ProfileDropdown({ user, userInitials, roleColors, onClose, onSignOut, isSigningOut }) {
  return (
    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
      {/* User Info Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-lg ${roleColors.solid} flex items-center justify-center text-white font-semibold`}>
            {userInitials}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>
      </div>
      
      {/* Menu Items */}
      <div className="py-1">
        <ProfileMenuItem 
          href="/profile" 
          icon={User}
          onClick={onClose}
        >
          Profile Settings
        </ProfileMenuItem>
        
        {user.role !== 'tenant' && (
          <ProfileMenuItem 
            href="/settings" 
            icon={Settings}
            onClick={onClose}
          >
            System Settings
          </ProfileMenuItem>
        )}

        <ProfileMenuItem 
          href="/help" 
          icon={FileCheck}
          onClick={onClose}
        >
          Help & Support
        </ProfileMenuItem>
      </div>
      
      {/* Sign Out */}
      <div className="border-t border-gray-100">
        <button 
          onClick={onSignOut}
          disabled={isSigningOut}
          className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LogOut className={`w-4 h-4 mr-3 transition-transform ${isSigningOut ? 'animate-spin' : 'group-hover:scale-110'}`} />
          {isSigningOut ? 'Signing Out...' : 'Sign Out'}
        </button>
      </div>
    </div>
  );
}

const MobileMenu = ({ isOpen, navigationItems, user, userInitials, roleColors, isActive, onClose, onSignOut, isSigningOut }, ref) => {
  if (!isOpen) return null;

  return (
    <div ref={ref} className="lg:hidden bg-white border-t border-gray-200 shadow-lg">
      <div className="px-4 py-3 space-y-1">
        {/* Role indicator */}
        <div className="px-3 py-2 mb-3">
          <RoleBadge 
            role={user.role} 
            adminLevel={user.adminLevel}
            colors={roleColors}
          />
        </div>

        {/* Notification Center - Mobile */}
        <div className="sm:hidden px-3 py-2 mb-3">
          <NotificationCenter />
        </div>

        {/* Navigation items */}
        {navigationItems.map((item) => (
          <MobileNavLink 
            key={item.href} 
            href={item.href} 
            active={isActive(item.href)}
            icon={item.icon}
            badge={item.badge}
            onClick={onClose}
          >
            {item.label}
          </MobileNavLink>
        ))}

        {/* Mobile profile section */}
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="px-3 py-2 mb-3">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-lg ${roleColors.solid} flex items-center justify-center text-white font-semibold`}>
                {userInitials}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            </div>
          </div>
          
          <MobileNavLink href="/profile" icon={User} onClick={onClose}>
            Profile Settings
          </MobileNavLink>
          
          {user.role !== 'tenant' && (
            <MobileNavLink href="/settings" icon={Settings} onClick={onClose}>
              System Settings
            </MobileNavLink>
          )}

          <MobileNavLink href="/help" icon={FileCheck} onClick={onClose}>
            Help & Support
          </MobileNavLink>
          
          <button 
            onClick={onSignOut}
            disabled={isSigningOut}
            className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut className={`w-4 h-4 mr-3 ${isSigningOut ? 'animate-spin' : ''}`} />
            {isSigningOut ? 'Signing Out...' : 'Sign Out'}
          </button>
        </div>
      </div>
    </div>
  );
};

function MobileNavLink({ href, active = false, children, icon: Icon, badge, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`relative flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <Icon className={`w-4 h-4 mr-3 ${active ? 'text-blue-600' : 'text-gray-500'}`} />
      {children}
      {badge && (
        <span className="ml-auto inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
          {badge}
        </span>
      )}
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

function NavigationSkeleton() {
  return (
    <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-gray-200 animate-pulse"></div>
              <div className="w-24 h-6 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="hidden lg:flex items-center space-x-1">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-20 h-8 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="w-24 h-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="w-12 h-10 bg-gray-200 rounded-xl animate-pulse"></div>
          </div>
        </div>
      </div>
    </nav>
  );
}