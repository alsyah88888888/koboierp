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
    Shield
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useSidebar } from "./SidebarContext";

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
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 lg:hidden transition-all duration-500 ease-in-out"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <div className={cn(
                "flex flex-col w-72 bg-[#0F172A] h-screen fixed inset-y-0 left-0 lg:sticky top-0 no-print text-slate-100 shadow-[0_0_50px_rgba(0,0,0,0.5)] z-50 transition-all duration-500 ease-in-out border-r border-white/5",
                isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}>
                {/* Header / Logo Section */}
                <div className="p-8 relative">
                    <button
                        onClick={() => setIsOpen(false)}
                        className="lg:hidden absolute top-6 right-6 p-2 text-slate-400 hover:text-white bg-white/5 rounded-xl transition-all"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <div className="flex items-center gap-4 mb-8 group cursor-pointer">
                        <div className="h-14 w-14 bg-white rounded-[1.25rem] flex items-center justify-center shadow-2xl shadow-primary/20 group-hover:rotate-6 transition-all duration-500 overflow-hidden relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-slate-200" />
                            <img src="/logo.png?v=7" alt="Logo" className="h-10 w-auto object-contain relative z-10" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-white leading-tight tracking-tighter">Kola Borasi</h1>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">ERP Suite</p>
                            </div>
                        </div>
                    </div>

                    {session?.user && (
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                            <div className="relative mb-6 p-4 bg-[#1E293B]/80 rounded-2xl border border-white/5 backdrop-blur-xl overflow-hidden shadow-xl">
                                <div className="absolute top-0 right-0 p-2 opacity-5 text-primary group-hover:scale-125 group-hover:opacity-10 transition-all duration-700">
                                    <Shield className="h-16 w-16" />
                                </div>
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Verified Staff</p>
                                    <Activity className="h-3 w-3 text-emerald-500 animate-pulse" />
                                </div>
                                <p className="text-sm font-black text-white truncate group-hover:text-primary transition-colors leading-tight mb-2 uppercase tracking-tight">{session.user.name}</p>
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-1 bg-primary/20 text-primary text-[9px] font-black rounded-lg uppercase tracking-widest border border-primary/20">
                                        {userRole}
                                    </span>
                                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Secure Link</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation Section */}
                <nav className="flex-1 px-4 pb-4 space-y-1 overflow-y-auto custom-scrollbar scrollbar-hide">
                    <p className="px-4 text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-3 mt-2">Main Management</p>
                    {navigation.map((item) => {
                        if (!item.roles.includes(userRole)) return null;

                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className={cn(
                                    "flex items-center justify-between px-4 py-3.5 text-sm font-bold rounded-2xl transition-all duration-300 group relative overflow-hidden mb-1",
                                    isActive
                                        ? "bg-primary text-white shadow-[0_10px_20px_-5px_rgba(255,107,0,0.3)] scale-[1.02]"
                                        : "text-slate-400 hover:text-white hover:bg-white/5"
                                )}
                            >
                                <div className="flex items-center gap-3 relative z-10 transition-transform duration-300 group-hover:translate-x-1">
                                    <item.icon className={cn(
                                        "h-5 w-5 transition-all duration-500",
                                        isActive ? "text-white rotate-0" : "text-slate-500 group-hover:text-primary group-hover:rotate-12"
                                    )} />
                                    <span className="tracking-tight">{item.name}</span>
                                </div>
                                
                                {isActive ? (
                                    <ChevronRight className="h-4 w-4 text-white/50 relative z-10" />
                                ) : (
                                    <div className="h-1 w-1 bg-slate-700 rounded-full group-hover:w-4 group-hover:bg-primary transition-all duration-500 opacity-0 group-hover:opacity-100" />
                                )}

                                {isActive && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-orange-400 opacity-20 animate-in fade-in duration-500" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Logout / Footer Section */}
                <div className="p-6 mt-auto border-t border-white/5 bg-[#0F172A]/50 backdrop-blur-xl">
                    <button
                        onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                        className="group flex items-center justify-center w-full px-4 py-4 text-xs font-black text-rose-500 hover:text-white bg-rose-500/5 hover:bg-rose-500 rounded-[1.25rem] transition-all duration-500 border border-rose-500/10 hover:border-rose-500 shadow-lg hover:shadow-rose-500/20 uppercase tracking-[0.2em]"
                    >
                        <LogOut className="mr-3 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        <span>Sign Out System</span>
                    </button>
                    
                    <div className="mt-6 text-center">
                        <p className="text-[8px] font-bold text-slate-600 uppercase tracking-[0.4em]">KOBOI v2.4.0 • 2026</p>
                    </div>
                </div>
            </div>
        </>
    );
}
