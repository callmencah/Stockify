import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Admin-only routes
    if (path.startsWith("/users") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Settings only admin or manager
    if (
      path.startsWith("/settings") &&
      token?.role !== "ADMIN" &&
      token?.role !== "MANAGER"
    ) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/items/:path*",
    "/inventory/:path*",
    "/purchase-orders/:path*",
    "/sales-orders/:path*",
    "/stock-opname/:path*",
    "/reports/:path*",
    "/locations/:path*",
    "/suppliers/:path*",
    "/customers/:path*",
    "/users/:path*",
    "/settings/:path*",
  ],
};
