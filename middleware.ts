// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // If logged-in user hits /, redirect to dashboard
    if (req.nextUrl.pathname === "/" && req.nextauth.token) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      // Only run auth check on protected routes
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        // Public routes — always allow
        if (["/" , "/login", "/signup"].includes(pathname)) return true;
        if (pathname.startsWith("/api/auth")) return true;
        if (pathname.startsWith("/api/ingest")) return true;
        if (pathname.startsWith("/_next")) return true;
        // Everything else needs auth
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.html$).*)"],
};
