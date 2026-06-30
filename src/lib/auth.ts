/* eslint-disable @typescript-eslint/no-require-imports */
import { AuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";

const db = prisma;

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
                } else if (token.sub) {
                    // Subsequent requests: always re-fetch permissions from DB
                    // so admin changes take effect without requiring re-login
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
                        }
                    } catch {
                        // Keep existing token data if DB fetch fails
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
                        if (!credentials?.email || !credentials?.password) {
                            throw new Error("Missing credentials");
                        }
 
                        const bcrypt = require("bcryptjs");
 
                        const user = await db.user.findUnique({
                            where: { email: credentials.email }
                        });
 
                        if (!user) throw new Error("User Salah");
 
                        const isValid = await (bcrypt as any).compare(credentials.password, user.password || "");
                        if (!isValid) throw new Error("Password Salah");
 
                        const { logAction } = require("./audit");
                        await logAction({
                            userId: user.id,
                            action: "LOGIN",
                            resource: "User",
                            resourceId: user.id,
                            details: { email: user.email }
                        });
 
                        let parsedPermissions: string[] = [];
                        try {
                            parsedPermissions = (user as any).permissions ? JSON.parse((user as any).permissions) : [];
                        } catch (e) {
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
        },
    };
}
