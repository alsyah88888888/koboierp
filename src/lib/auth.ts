/* eslint-disable @typescript-eslint/no-require-imports */
import { AuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";

const db = prisma;
const PERMISSION_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function getAuthOptions(): AuthOptions {
    return {
        adapter: PrismaAdapter(db) as Adapter,
        secret: process.env.NEXTAUTH_SECRET,
        session: {
            strategy: "jwt",
            maxAge: 30 * 60, // 30 minutes
        },
        callbacks: {
            async session({ session, token }) {
                if (token && session.user) {
                    (session.user as any).role = token.role;
                    (session.user as any).id = token.sub;
                    (session.user as any).permissions = token.permissions || [];
                }
                return session;
            },
            async jwt({ token, user }) {
                if (user) {
                    // First login: set initial data from user object
                    token.role = (user as any).role;
                    token.permissions = (user as any).permissions || [];
                    (token as any).permissionsFetchedAt = Date.now();
                } else if (token.sub) {
                    // Throttle DB re-fetches to once every 5 minutes to prevent exhausting Supabase connection pool
                    const lastFetched = Number((token as any).permissionsFetchedAt || 0);
                    if (Date.now() - lastFetched > PERMISSION_REFRESH_INTERVAL_MS) {
                        try {
                            const freshUser = await db.user.findUnique({
                                where: { id: token.sub },
                                select: { role: true, permissions: true }
                            });
                            if (freshUser) {
                                token.role = freshUser.role;
                                let parsedPermissions: string[] = [];
                                try {
                                    parsedPermissions = freshUser.permissions
                                        ? JSON.parse(freshUser.permissions as string)
                                        : [];
                                } catch {
                                    parsedPermissions = [];
                                }
                                token.permissions = parsedPermissions;
                                (token as any).permissionsFetchedAt = Date.now();
                            }
                        } catch {
                            // Keep existing token data if DB fetch fails
                        }
                    }
                }
                return token;
            },
        },
        providers: [
            (() => {
                const Provider = (CredentialsProvider as any).default || CredentialsProvider;
                return Provider({
                    name: "Credentials",
                    credentials: {
                        email: { label: "Email", type: "email" },
                        password: { label: "Password", type: "password" }
                    },
                    async authorize(credentials: any) {
                        const normalizedEmail = credentials?.email?.trim();
                        if (!normalizedEmail || !credentials?.password) {
                            throw new Error("Missing credentials");
                        }

                        const bcrypt = require("bcryptjs");

                        let user: any = null;
                        try {
                            user = await db.user.findFirst({
                                where: {
                                    email: {
                                        equals: normalizedEmail,
                                        mode: "insensitive"
                                    }
                                }
                            });
                        } catch (dbErr) {
                            console.error("[Auth] Database error during login:", dbErr);
                            throw new Error("DB_ERROR");
                        }

                        if (!user) throw new Error("User Salah");

                        const isValid = await (bcrypt as any).compare(credentials.password, user.password || "");
                        if (!isValid) throw new Error("Password Salah");

                        // Non-blocking audit log so slow DB does not block login
                        try {
                            const { logAction } = require("./audit");
                            logAction({
                                userId: user.id,
                                action: "LOGIN",
                                resource: "User",
                                resourceId: user.id,
                                details: { email: user.email }
                            }).catch((err: any) => console.error("[Auth] Audit log error:", err));
                        } catch {
                            // Ignore audit log error during login
                        }

                        let parsedPermissions: string[] = [];
                        try {
                            parsedPermissions = (user as any).permissions ? JSON.parse((user as any).permissions) : [];
                        } catch {
                            parsedPermissions = [];
                        }

                        return {
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            role: user.role,
                            permissions: parsedPermissions
                        } as any;
                    }
                });
            })()
        ],
        pages: {
            signIn: "/login",
            error: "/login",
        },
    };
}
