// frontend/src/middleware/admin-middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

interface DecodedToken {
  user: {
    id: string;
    role?: string;
  };
  iat: number;
  exp: number;
}

export function adminMiddleware(request: NextRequest) {
  // Get the pathname
  const { pathname } = request.nextUrl;

  // Check if it's an admin page but not the admin login page
  const isAdminPage = pathname.startsWith('/admin') && pathname !== '/admin-login';

  // If it's not an admin page, continue
  if (!isAdminPage) {
    return NextResponse.next();
  }

  // Get the token from cookies
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    // Redirect to login if no token found
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // Verify and decode the token
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as DecodedToken;

    // Check if the user is an admin
    if (decodedToken?.user?.role !== 'admin') {
      // Redirect to dashboard if not an admin
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Continue if admin
    return NextResponse.next();
  } catch (error) {
    // Redirect to login if token is invalid
    console.error('Admin middleware error:', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }
}