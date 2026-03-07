"use client";

import { usePathname } from "next/navigation";
import { Bell, Menu, User, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useSidebar } from "./SidebarContext";
import { useState } from "react";

export function TopHeader() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const { toggle } = useSidebar();
    const [showNotifications, setShowNotifications] = useState(false);

    const notifications = [
        { id: 1, title: "Stok Menipis", message: "Barang 'Semen Padang' di bawah batas minimum.", time: "5 menit yang lalu", type: "alert" },
        { id: 2, title: "Pembelian Baru", message: "Pemesanan baru #PO-2024001 perlu verifikasi.", time: "1 jam yang lalu", type: "info" },
        { id: 3, title: "Pembayaran Berhasil", message: "Invoice #INV-992 telah diverifikasi oleh Finance.", time: "3 jam yang lalu", type: "success" },
    ];

    // Map pathname to a readable title
    const getPageTitle = (path: string) => {
        if (path === "/") return "Dashboard Overview";
        const segments = path.split("/").filter(Boolean);
        if (segments.length === 0) return "Dashboard";

        const lastSegment = segments[segments.length - 1];
        return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace(/-/g, " ");
    };

    const title = getPageTitle(pathname || "/");

    return (
        <header className="h-16 border-b bg-white/80 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between no-print shadow-sm">
            <div className="flex items-center gap-3 md:gap-4">
                <button
                    onClick={toggle}
                    className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-xl lg:hidden transition-colors"
                >
                    <Menu className="h-6 w-6" />
                </button>
                <div className="h-8 w-1 bg-primary rounded-full hidden md:block"></div>
                <h2 className="text-lg md:text-xl font-black text-slate-800 tracking-tight truncate max-w-[150px] md:max-w-none">{title}</h2>
            </div>

            <div className="flex items-center gap-3 md:gap-6">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className={`p-2 rounded-xl transition-all relative ${showNotifications ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-slate-400 hover:text-primary hover:bg-primary/5'}`}
                        >
                            <Bell className="h-5 w-5" />
                            {!showNotifications && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>}
                        </button>

                        {showNotifications && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
                                <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-100 rounded-[2rem] shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="p-5 border-b bg-slate-50/50 flex justify-between items-center">
                                        <h3 className="font-black text-slate-800 tracking-tight">NotificationCenter</h3>
                                        <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-1 rounded-full uppercase">3 New</span>
                                    </div>
                                    <div className="max-h-[350px] overflow-y-auto">
                                        {notifications.map((n) => (
                                            <div key={n.id} className="p-4 border-b last:border-0 hover:bg-slate-50 cursor-pointer transition-colors group">
                                                <div className="flex gap-3">
                                                    <div className={`mt-0.5 h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${n.type === 'alert' ? 'bg-rose-100 text-rose-600' :
                                                            n.type === 'info' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
                                                        }`}>
                                                        {n.type === 'alert' ? <AlertTriangle className="h-4 w-4" /> :
                                                            n.type === 'info' ? <Info className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-slate-800 leading-tight group-hover:text-primary transition-colors">{n.title}</p>
                                                        <p className="text-[11px] font-medium text-slate-500 mt-1 leading-relaxed">{n.message}</p>
                                                        <p className="text-[10px] font-bold text-slate-300 mt-2 uppercase tracking-tighter">{n.time}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-4 bg-slate-50/50 border-t flex justify-center">
                                        <button className="text-[10px] font-black text-slate-400 hover:text-primary transition-colors uppercase tracking-widest">Mark all as read</button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="h-8 w-px bg-slate-200 mx-2"></div>

                    <div className="flex items-center gap-2 md:gap-3 pl-2">
                        <div className="text-right hidden lg:block">
                            <p className="text-xs font-black text-slate-800 leading-none">{session?.user?.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{(session?.user as any)?.role}</p>
                        </div>
                        <div className="h-9 w-9 md:h-10 md:w-10 bg-gradient-to-br from-primary to-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20 border-2 border-white overflow-hidden shrink-0">
                            {session?.user?.image ? (
                                <img src={session.user.image} alt="Avatar" className="h-full w-full object-cover" />
                            ) : (
                                <User className="h-5 w-5 md:h-6 md:w-6" />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
