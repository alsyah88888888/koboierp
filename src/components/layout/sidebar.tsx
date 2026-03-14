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
    LogOut,
    FileText,
    Database
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useSidebar } from "./SidebarContext";
import { X } from "lucide-react";

const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["ADMIN", "FINANCE", "PURCHASE", "SALES", "WAREHOUSE"] },
    { name: "Keuangan", href: "/finance", icon: Wallet, roles: ["ADMIN", "FINANCE"] },
    { name: "Pembelian", href: "/purchase", icon: ShoppingCart, roles: ["ADMIN", "PURCHASE", "SALES"] },
    { name: "Pengajuan Pembelian", href: "/purchase/request", icon: FileText, roles: ["ADMIN", "PURCHASE", "FINANCE"] },
    { name: "Penjualan", href: "/sales", icon: ShoppingBag, roles: ["ADMIN", "SALES", "PURCHASE"] },
    { name: "Operasional", href: "/operational", icon: Wallet, roles: ["ADMIN", "FINANCE", "SALES", "PURCHASE"] },
    { name: "Gudang", href: "/warehouse", icon: Warehouse, roles: ["ADMIN", "WAREHOUSE", "PURCHASE"] },
    { name: "Akuntansi", href: "/accounting", icon: FileText, roles: ["ADMIN", "FINANCE"] },
    { name: "Master Data", href: "/master-data", icon: Database, roles: ["ADMIN", "PURCHASE"] },
    { name: "Settings", href: "/settings", icon: Settings, roles: ["ADMIN"] },
];

export function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role || "USER";
    const { isOpen, setIsOpen } = useSidebar();

    const isAuthPage = pathname?.startsWith("/auth");
    if (isAuthPage) return null;

    return (
        <>
            {/* Backdrop for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <div className={cn(
                "flex flex-col w-64 border-r bg-slate-900 h-screen fixed inset-y-0 left-0 lg:sticky top-0 no-print text-slate-100 shadow-2xl z-50 transition-transform duration-300 ease-in-out",
                isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}>
                <div className="p-8 relative">
                    {/* Mobile Close Button */}
                    <button
                        onClick={() => setIsOpen(false)}
                        className="lg:hidden absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
                    >
                        <X className="h-6 w-6" />
                    </button>

                    <div className="flex items-center gap-3 mb-8 group">
                        <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-white/10 group-hover:scale-110 transition-all duration-500 overflow-hidden">
                            <img src="/logo.png?v=7" alt="Logo" className="h-9 w-auto object-contain" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-white leading-tight tracking-tighter">Kola Borasi</h1>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                ERP Suite
                            </p>
                        </div>
                    </div>

                    {session?.user && (
                        <div className="mb-6 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 backdrop-blur-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-primary/20 transition-colors"></div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 relative z-10">Active Session</p>
                            <p className="text-sm font-black text-white truncate relative z-10">{session.user.name}</p>
                            <div className="flex items-center gap-2 mt-2 relative z-10">
                                <span className="px-2 py-0.5 bg-emerald-500 text-white text-[8px] font-black rounded uppercase">
                                    {userRole}
                                </span>
                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">verified</span>
                            </div>
                        </div>
                    )}
                </div>

                <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
                    {navigation.map((item) => {
                        if (!item.roles.includes(userRole)) return null;

                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className={cn(
                                    "flex items-center px-4 py-3 text-sm font-bold rounded-xl transition-all duration-200 group relative",
                                    isActive
                                        ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]"
                                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                                )}
                            >
                                {!isActive && <div className="absolute left-0 w-1 h-0 bg-primary rounded-r-full transition-all duration-300 group-hover:h-6"></div>}
                                <item.icon className={cn(
                                    "mr-3 h-5 w-5 transition-transform group-hover:scale-110",
                                    isActive ? "text-white" : "text-slate-500 group-hover:text-primary"
                                )} />
                                <span className="tracking-tight">{item.name}</span>
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
        </>
    );
}
