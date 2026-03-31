"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import { SidebarProvider } from "./SidebarContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <SidebarProvider>
                {children}
                <Toaster position="bottom-right" />
            </SidebarProvider>
        </SessionProvider>
    );
}
