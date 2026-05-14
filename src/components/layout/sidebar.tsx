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
    Database,
    X,
    ChevronRight,
    Activity,
    Shield,
    Search
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useSidebar } from "./SidebarContext";

const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["ADMIN", "FINANCE", "PURCHASE", "SALES", "WAREHOUSE"] },
    { name: "Keuangan", href: "/finance", icon: Wallet, roles: ["ADMIN", "FINANCE"] },
    { name: "Pembelian", href: "/purchase", icon: ShoppingCart, roles: ["ADMIN", "PURCHASE", "SALES"] },
    { name: "Pengajuan", href: "/purchase/request", icon: FileText, roles: ["ADMIN", "PURCHASE", "FINANCE"] },
    { name: "Penjualan", href: "/sales", icon: ShoppingBag, roles: ["ADMIN", "SALES", "PURCHASE"] },
    { name: "Tracking Item", href: "/tracking", icon: Search, roles: ["ADMIN", "FINANCE", "PURCHASE", "SALES", "WAREHOUSE"] },
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
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 lg:hidden transition-all duration-500 ease-in-out"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <div className={cn(
                "flex flex-col w-72 bg-[#0f172a] h-screen fixed inset-y-0 left-0 lg:sticky top-0 no-print text-slate-100 shadow-2xl z-50 transition-all duration-500 ease-in-out border-r border-white/5",
                isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}>
                {/* Header / Logo Section */}
                <div className="p-8 relative pb-2">
                    <button
                        onClick={() => setIsOpen(false)}
                        className="lg:hidden absolute top-6 right-6 p-2 text-slate-400 hover:text-white bg-white/5 rounded-xl transition-all"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <div className="flex items-center gap-4 mb-10 group cursor-pointer">
                        <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/40 group-hover:rotate-6 transition-all duration-500 overflow-hidden relative border border-white/10">
                            <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-slate-100" />
                            <img 
                                src="/image/logokoboi.png" 
                                alt="Kobaie Logo" 
                                className="h-8 w-auto object-contain relative z-10"
                                onError={(e) => {
                                    (e.target as any).src = "/logo.png";
                                }}
                            />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-white leading-tight tracking-tight uppercase">Kobaie ERP</h1>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                </span>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em]">Enterprise System</p>
                            </div>
                        </div>
                    </div>

                    {session?.user && (
                        <div className="relative group mb-8">
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-[2rem] blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                            <div className="relative p-5 bg-white/5 rounded-[1.5rem] border border-white/5 backdrop-blur-xl overflow-hidden transition-all duration-300 group-hover:bg-white/[0.08]">
                                <div className="absolute top-0 right-0 p-3 opacity-[0.03] text-primary group-hover:scale-110 group-hover:opacity-[0.07] transition-all duration-700">
                                    <Shield className="h-14 w-14" />
                                </div>
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-white/10 flex items-center justify-center text-xs font-black text-slate-400 shadow-inner">
                                            {session.user.name?.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-black text-white truncate leading-none uppercase tracking-tight mb-1">{session.user.name}</p>
                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{userRole}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[8px] font-black rounded-md uppercase tracking-widest border border-emerald-500/20">Online</span>
                                        <Activity className="h-3 w-3 text-slate-600" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation Section */}
                <nav className="flex-1 px-5 pb-6 space-y-1 overflow-y-auto custom-scrollbar">
                    <p className="px-4 text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4 mt-2">Management</p>
                    {navigation.map((item) => {
                        if (!item.roles.includes(userRole)) return null;

                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className={cn(
                                    "flex items-center justify-between px-5 py-4 text-xs font-bold rounded-2xl transition-all duration-300 group relative overflow-hidden mb-1.5",
                                    isActive
                                        ? "bg-primary text-white shadow-xl shadow-primary/10"
                                        : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.03]"
                                )}
                            >
                                <div className="flex items-center gap-4 relative z-10 transition-transform duration-300 group-hover:translate-x-1">
                                    <div className={cn(
                                        "p-2 rounded-xl transition-all duration-500",
                                        isActive ? "bg-white/20 text-white" : "bg-white/5 text-slate-600 group-hover:text-primary group-hover:bg-primary/10"
                                    )}>
                                        <item.icon className="h-4 w-4" />
                                    </div>
                                    <span className="tracking-wide uppercase text-[10px] tracking-[0.05em]">{item.name}</span>
                                </div>
                                
                                {isActive && (
                                    <ChevronRight className="h-3 w-3 text-white/40 relative z-10" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Logout / Footer Section */}
                <div className="p-6 mt-auto border-t border-white/5 bg-black/20 backdrop-blur-xl">
                    <button
                        onClick={async () => {
                            try {
                                await signOut({ redirect: true, callbackUrl: "/auth/signin" });
                            } catch (e) {
                                console.error("SignOut failed:", e);
                                window.location.href = "/auth/signin";
                            }
                        }}
                        className="group flex items-center justify-center w-full px-4 py-4 text-[10px] font-black text-rose-500 hover:text-white bg-rose-500/5 hover:bg-rose-500 rounded-2xl transition-all duration-500 border border-rose-500/10 hover:border-rose-500 shadow-xl hover:shadow-rose-500/20 uppercase tracking-[0.2em]"
                    >
                        <LogOut className="mr-3 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        <span>Logout System</span>
                    </button>
                    
                    <div className="mt-6 text-center">
                        <p className="text-[8px] font-bold text-slate-700 uppercase tracking-[0.4em]">KOBOIE ERP • v3.0.0</p>
                    </div>
                </div>
            </div>
        </>
    );
}
