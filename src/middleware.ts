import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const path = req.nextUrl.pathname;

        // Role-based access rules
        if (path.startsWith("/finance") && token?.role !== "ADMIN" && token?.role !== "FINANCE") {
            return NextResponse.redirect(new URL("/", req.url));
        }
        if (path.startsWith("/purchase") && token?.role !== "ADMIN" && token?.role !== "PURCHASE") {
            return NextResponse.redirect(new URL("/", req.url));
        }
        if (path.startsWith("/sales") && token?.role !== "ADMIN" && token?.role !== "SALES") {
            return NextResponse.redirect(new URL("/", req.url));
        }
        if (path.startsWith("/warehouse") && token?.role !== "ADMIN" && token?.role !== "WAREHOUSE") {
            return NextResponse.redirect(new URL("/", req.url));
        }
        if (path.startsWith("/settings") && token?.role !== "ADMIN") {
            return NextResponse.redirect(new URL("/", req.url));
        }
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
    }
);

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|auth/signin).*)"],
};
