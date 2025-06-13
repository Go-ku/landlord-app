import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Middleware - Path:', pathname);
      console.log('Middleware - Token:', token ? {
        id: token.id,
        email: token.email,
        role: token.role
      } : 'No token');
    }

    // Role-based route protection
    const roleBasedRoutes = {
      '/properties': ['landlord', 'manager', 'admin'],
      '/admin': ['admin'],
      '/tenant': ['tenant'],
      '/dashboard': ['landlord', 'manager', 'tenant', 'admin']
    };

    // Check if the current path requires role-based access
    for (const [route, allowedRoles] of Object.entries(roleBasedRoutes)) {
      if (pathname.startsWith(route)) {
        if (!token?.role || !allowedRoles.includes(token.role)) {
          console.warn(`Access denied: User with role '${token?.role}' tried to access '${pathname}'`);
          
          // Redirect based on user role
          if (token?.role === 'tenant') {
            return NextResponse.redirect(new URL('/tenant/dashboard', req.url));
          } else if (token?.role === 'landlord') {
            return NextResponse.redirect(new URL('/properties', req.url));
          } else if (token?.role === 'manager') {
            return NextResponse.redirect(new URL('/properties', req.url));
          } else if (token?.role === 'admin') {
            return NextResponse.redirect(new URL('/admin/dashboard', req.url));
          } else {
            return NextResponse.redirect(new URL('/auth/signin', req.url));
          }
        }
        break;
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Public routes that don't require authentication
        const publicRoutes = [
          '/',
          '/auth/signin',
          '/auth/signup',
          '/auth/error',
          '/api/auth',
          '/about',
          '/contact'
        ];

        // Allow public routes
        if (publicRoutes.some(route => pathname.startsWith(route))) {
          return true;
        }

        // For all other routes, require authentication
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)",
  ],
};