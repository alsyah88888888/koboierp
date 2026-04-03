/* eslint-disable @typescript-eslint/no-require-imports */
import { AuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";

export function getAuthOptions(): AuthOptions {
    const prisma = require("@/lib/prisma").default();
    return {
        adapter: PrismaAdapter(prisma) as Adapter,
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
            CredentialsProvider({
                name: "Credentials",
                credentials: {
                    email: { label: "Email", type: "email" },
                    password: { label: "Password", type: "password" }
                },
                async authorize(credentials) {
                    if (!credentials?.email || !credentials?.password) return null;

                    const prisma = require("@/lib/prisma").default();
                    const bcrypt = require("bcryptjs");

                    const user = await prisma.user.findUnique({
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
            })
        ],
        pages: {
            signIn: "/auth/signin",
        },
    };
}
