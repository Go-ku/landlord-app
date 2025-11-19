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
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    solid: 'bg-emerald-600'
  },
  landlord: {
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-200',
    solid: 'bg-slate-900'
  },
  manager: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    solid: 'bg-indigo-600'
  },
  admin: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    solid: 'bg-amber-600'
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
      <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur">
        <div className="page-shell">
          <div className="flex h-16 items-center justify-between">
            {/* Logo and main navigation */}
            <div className="flex items-center space-x-8">
              {/* Logo */}
              <Link
                href={session.user.role === 'tenant' ? '/tenant' : '/dashboard'}
                className="flex items-center group"
              >
                <div className="flex items-center space-x-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${roleColors.solid} text-white shadow-sm`}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Console</span>
                    <span className="text-lg font-semibold text-slate-900">Nkwazi</span>
                  </div>
                </div>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden items-center space-x-1 lg:flex">
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
                className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 lg:hidden"
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
      className={`relative inline-flex items-center rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 group ${
        active
          ? 'bg-slate-900 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon className={`mr-2 h-4 w-4 transition-transform group-hover:scale-110 ${
        active ? 'text-white' : 'text-slate-500'
      }`} />
      {children}
      {badge && (
        <span className="ml-2 inline-flex items-center justify-center rounded-full bg-amber-500 px-2 py-1 text-xs font-bold leading-none text-white">
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
      className="group flex items-center space-x-3 rounded-xl border border-transparent p-2 transition-all duration-200 hover:border-slate-200 hover:bg-white"
      aria-expanded={isOpen}
      aria-haspopup="true"
    >
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${roleColors.solid} font-semibold text-white shadow-sm`}>
        {userInitials}
      </div>
      <div className="hidden md:flex flex-col items-start">
        <span className="text-sm font-semibold text-slate-900 group-hover:text-slate-700">
          {user.name || 'User'}
        </span>
        <span className="text-xs text-slate-500">
          {user.email?.split('@')[0] || 'user'}
        </span>
      </div>
      <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  );
}

function ProfileDropdown({ user, userInitials, roleColors, onClose, onSignOut, isSigningOut }) {
  return (
    <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
      {/* User Info Header */}
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center space-x-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${roleColors.solid} text-white font-semibold`}>
            {userInitials}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{user.name}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
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
          className="group flex w-full items-center px-4 py-3 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogOut className={`mr-3 h-4 w-4 transition-transform ${isSigningOut ? 'animate-spin' : 'group-hover:scale-110'}`} />
          {isSigningOut ? 'Signing Out...' : 'Sign Out'}
        </button>
      </div>
    </div>
  );
}

const MobileMenu = ({ isOpen, navigationItems, user, userInitials, roleColors, isActive, onClose, onSignOut, isSigningOut }, ref) => {
  if (!isOpen) return null;

  return (
    <div ref={ref} className="bg-white border-t border-slate-200 shadow-lg lg:hidden">
      <div className="space-y-1 px-4 py-3">
        {/* Role indicator */}
        <div className="mb-3 px-3 py-2">
          <RoleBadge
            role={user.role}
            adminLevel={user.adminLevel}
            colors={roleColors}
          />
        </div>

        {/* Notification Center - Mobile */}
        <div className="mb-3 px-3 py-2 sm:hidden">
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
        <div className="mt-4 border-t border-slate-200 pt-4">
          <div className="px-3 py-2 mb-3">
            <div className="flex items-center space-x-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${roleColors.solid} text-white font-semibold`}>
                {userInitials}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
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
          className="mt-2 flex w-full items-center rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogOut className={`mr-3 h-4 w-4 ${isSigningOut ? 'animate-spin' : ''}`} />
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
      className={`relative flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? 'bg-slate-900 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon className={`mr-3 h-4 w-4 ${active ? 'text-white' : 'text-slate-500'}`} />
      {children}
      {badge && (
        <span className="ml-auto inline-flex items-center justify-center rounded-full bg-amber-500 px-2 py-1 text-xs font-bold leading-none text-white">
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
      className="group flex items-center px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
    >
      <Icon className="mr-3 h-4 w-4 text-slate-500 transition-all group-hover:scale-110 group-hover:text-slate-700" />
      {children}
    </Link>
  );
}

function NavigationSkeleton() {
  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur">
      <div className="page-shell">
        <div className="flex h-16 justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-200"></div>
              <div className="h-6 w-24 animate-pulse rounded bg-slate-200"></div>
            </div>
            <div className="hidden items-center space-x-1 lg:flex">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-8 w-20 animate-pulse rounded bg-slate-200"></div>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 animate-pulse rounded bg-slate-200"></div>
            <div className="h-8 w-24 animate-pulse rounded bg-slate-200"></div>
            <div className="h-10 w-12 animate-pulse rounded-xl bg-slate-200"></div>
          </div>
        </div>
      </div>
    </nav>
  );
}