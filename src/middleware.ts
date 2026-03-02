import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export default withAuth(
    async function middleware(req) {
        const token = await getToken({ req });
        const path = req.nextUrl.pathname;

        // Role-based access rules
        if (path.startsWith("/finance") && token?.role !== "ADMIN" && token?.role !== "FINANCE") {
            return NextResponse.redirect(new URL("/", req.url));
        }
        if (path.startsWith("/accounting") && token?.role !== "ADMIN" && token?.role !== "FINANCE") {
            return NextResponse.redirect(new URL("/", req.url));
        }

        if (path.startsWith("/purchase")) {
            if (path.startsWith("/purchase/request")) {
                if (token?.role !== "ADMIN" && token?.role !== "PURCHASE" && token?.role !== "FINANCE") {
                    return NextResponse.redirect(new URL("/", req.url));
                }
            } else {
                if (token?.role !== "ADMIN" && token?.role !== "PURCHASE" && token?.role !== "SALES") {
                    return NextResponse.redirect(new URL("/", req.url));
                }
            }
        }
        if (path.startsWith("/sales") && token?.role !== "ADMIN" && token?.role !== "SALES" && token?.role !== "PURCHASE") {
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
