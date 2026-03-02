"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Wallet,
    ShoppingCart,
    ShoppingBag,
    Warehouse,
    Settings,
    LogOut
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";

const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["ADMIN", "FINANCE", "PURCHASE", "SALES", "WAREHOUSE"] },
    { name: "Keuangan", href: "/finance", icon: Wallet, roles: ["ADMIN", "FINANCE"] },
    { name: "Penerimaan Barang", href: "/purchase", icon: ShoppingCart, roles: ["ADMIN", "PURCHASE"] },
    { name: "Penjualan", href: "/sales", icon: ShoppingBag, roles: ["ADMIN", "SALES"] },
    { name: "Operasional", href: "/operational", icon: Wallet, roles: ["ADMIN", "FINANCE"] },
    { name: "Gudang", href: "/warehouse", icon: Warehouse, roles: ["ADMIN", "WAREHOUSE"] },
    { name: "Settings", href: "/settings", icon: Settings, roles: ["ADMIN"] },
];

export function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role || "USER";

    const isAuthPage = pathname?.startsWith("/auth");
    if (isAuthPage) return null;

    return (
        <div className="flex flex-col w-64 border-r bg-card h-screen sticky top-0 no-print">
            <div className="p-6">
                <h1 className="text-xl font-bold text-primary">Kola Borasi Indonesia</h1>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">ERP System</p>
                {session?.user && (
                    <div className="mt-4 p-2 bg-accent/50 rounded-lg border border-accent">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Logged in as</p>
                        <p className="text-xs font-black text-primary truncate">{session.user.name}</p>
                        <span className="px-1.5 py-0.5 bg-primary text-white text-[8px] font-black rounded uppercase mt-1 inline-block">
                            {userRole}
                        </span>
                    </div>
                )}
            </div>

            <nav className="flex-1 px-4 space-y-1">
                {navigation.map((item) => {
                    if (!item.roles.includes(userRole)) return null;

                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                isActive
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                        >
                            <item.icon className="mr-3 h-5 w-5" />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t">
                <button
                    onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                    className="flex items-center w-full px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                >
                    <LogOut className="mr-3 h-5 w-5" />
                    Logout
                </button>
            </div>
        </div>
    );
}
