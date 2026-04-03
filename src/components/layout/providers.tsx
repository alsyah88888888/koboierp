"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import { SidebarProvider } from "./SidebarContext";

import { Session } from "next-auth";

export function Providers({ children, session }: { children: React.ReactNode, session?: Session | null }) {
    return (
        <SessionProvider session={session}>
            <SidebarProvider>
                {children}
                <Toaster position="bottom-right" />
            </SidebarProvider>
        </SessionProvider>
    );
}
