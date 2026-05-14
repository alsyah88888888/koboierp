"use client";

import { useEffect, useCallback, useRef } from "react";
import { signOut, useSession } from "next-auth/react";

const IDLE_TIMEOUT = 2 * 60 * 60 * 1000; // 2 Jam (2 Hours)

export function IdleLogout() {
    const { data: session } = useSession();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleLogout = useCallback(() => {
        if (session) {
            console.log("Session idle timeout reached. Logging out...");
            signOut({ callbackUrl: "/auth/signin?reason=idle" });
        }
    }, [session]);

    const resetTimeout = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        if (session) {
            timeoutRef.current = setTimeout(handleLogout, IDLE_TIMEOUT);
        }
    }, [handleLogout, session]);

    useEffect(() => {
        if (!session) return;

        const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
        
        // Initial set
        resetTimeout();

        // Listen for activity
        events.forEach(event => {
            window.addEventListener(event, resetTimeout);
        });

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            events.forEach(event => {
                window.removeEventListener(event, resetTimeout);
            });
        };
    }, [session, resetTimeout]);

    return null;
}
