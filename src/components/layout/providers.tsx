"use client";

import dynamic from "next/dynamic";
import { Toaster } from "react-hot-toast";
import { SidebarProvider } from "./SidebarContext";
import { DialogProvider } from "../ui/DialogProvider";

import { Session } from "next-auth";

const SessionProvider = dynamic(() => import("next-auth/react").then(mod => mod.SessionProvider), { 
    ssr: false,
    loading: () => <>{null}</> 
});

export function Providers({ children, session }: { children: React.ReactNode, session?: Session | null }) {
    return (
        <SessionProvider session={session}>
            <SidebarProvider>
                <DialogProvider>
                    {children}
                    <Toaster position="bottom-right" />
                </DialogProvider>
            </SidebarProvider>
        </SessionProvider>
    );
}
