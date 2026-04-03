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
        },
        callbacks: {
            async session({ session, token }) {
                if (token && session.user) {
                    (session.user as any).role = token.role;
                    (session.user as any).id = token.sub;
                }
                return session;
            },
            async jwt({ token, user }) {
                if (user) {
                    token.role = (user as any).role;
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

                        return {
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            role: user.role
                        } as any;
                    }
                });
            })()
        ],
        pages: {
            signIn: "/auth/signin",
        },
    };
}
