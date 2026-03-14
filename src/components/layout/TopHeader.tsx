"use client";

import { usePathname } from "next/navigation";
import { Bell, Menu, User, Info, AlertTriangle, CheckCircle2, Megaphone, X, Calendar, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useSidebar } from "./SidebarContext";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getNotificationsAction, deleteNotificationAction, markNotificationAsReadAction } from "@/app/actions";

export function TopHeader() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const { toggle } = useSidebar();
    const [showNotifications, setShowNotifications] = useState(false);

    const [notifications, setNotifications] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedNotification, setSelectedNotification] = useState<any>(null);

    const loadNotifications = async () => {
        try {
            const data = await getNotificationsAction();
            setNotifications(data);
        } catch (error) {
            console.error("Failed to load notifications:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadNotifications();
        // Refresh every 5 minutes
        const interval = setInterval(loadNotifications, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const formatRelativeTime = (date: Date) => {
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);

        if (diffInSeconds < 60) return "Baru saja";
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes} menit yang lalu`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours} jam yang lalu`;
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays} hari yang lalu`;
    };

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
                                <div className="absolute right-0 mt-3 w-[calc(100vw-2rem)] sm:w-80 bg-white border border-slate-100 rounded-[2rem] shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="p-5 border-b bg-slate-50/50 flex justify-between items-center">
                                        <h3 className="font-black text-slate-800 tracking-tight">NotificationCenter</h3>
                                        <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-1 rounded-full uppercase">
                                            {notifications.length > 20 ? "20+" : notifications.length} Info
                                        </span>
                                    </div>
                                    <div className="max-h-[350px] overflow-y-auto">
                                        {notifications.map((n) => (
                                            <div
                                                key={n.id}
                                                className="border-b last:border-0 hover:bg-slate-50 cursor-pointer transition-colors group relative"
                                            >
                                                <div
                                                    onClick={async () => {
                                                        setSelectedNotification(n);
                                                        setShowNotifications(false);
                                                        await markNotificationAsReadAction(n.id);
                                                        loadNotifications();
                                                    }}
                                                    className="p-4 flex gap-3"
                                                >
                                                    <div className={`mt-0.5 h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${n.type === 'alert' ? 'bg-rose-100 text-rose-600' :
                                                        n.type === 'info' ? 'bg-blue-100 text-blue-600' :
                                                            n.type === 'broadcast' ? 'bg-amber-100 text-amber-600' :
                                                                'bg-emerald-100 text-emerald-600'
                                                        }`}>
                                                        {n.type === 'alert' ? <AlertTriangle className="h-4 w-4" /> :
                                                            n.type === 'info' ? <Info className="h-4 w-4" /> :
                                                                n.type === 'broadcast' ? <Megaphone className="h-4 w-4" /> :
                                                                    <CheckCircle2 className="h-4 w-4" />}
                                                    </div>
                                                    <div>
                                                        <p className={cn(
                                                            "text-[10px] uppercase tracking-wider font-black leading-tight group-hover:text-primary transition-colors",
                                                            n.type === 'broadcast' ? "text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md inline-block mb-1" : "text-slate-800"
                                                        )}>{n.title}</p>
                                                        <p className="text-[11px] font-medium text-slate-500 mt-0.5 leading-relaxed truncate max-w-[200px]">{n.message}</p>
                                                        <p className="text-[9px] font-bold text-slate-300 mt-1.5 uppercase tracking-tighter">{formatRelativeTime(n.createdAt)}</p>
                                                    </div>
                                                </div>

                                                {(session?.user as any)?.role === 'ADMIN' && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            if (confirm("Hapus notifikasi ini?")) {
                                                                await deleteNotificationAction(n.id);
                                                                loadNotifications();
                                                            }
                                                        }}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        {notifications.length === 0 && !isLoading && (
                                            <div className="p-12 text-center">
                                                <Bell className="h-10 w-10 text-slate-100 mx-auto mb-3" />
                                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Belum ada notifikasi</p>
                                            </div>
                                        )}
                                        {isLoading && (
                                            <div className="p-12 text-center animate-pulse">
                                                <div className="h-4 w-32 bg-slate-100 rounded-lg mx-auto mb-2" />
                                                <div className="h-3 w-48 bg-slate-50 rounded-lg mx-auto" />
                                            </div>
                                        )}
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
            {/* Notification Detail Modal */}
            {selectedNotification && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedNotification(null)}></div>
                    <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
                        <div className="p-8">
                            <div className="flex justify-between items-start mb-8">
                                <div className={cn(
                                    "h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg",
                                    selectedNotification.type === 'alert' ? 'bg-rose-100 text-rose-600 shadow-rose-200' :
                                        selectedNotification.type === 'info' ? 'bg-blue-100 text-blue-600 shadow-blue-200' :
                                            selectedNotification.type === 'broadcast' ? 'bg-amber-100 text-amber-600 shadow-amber-200' :
                                                'bg-emerald-100 text-emerald-600 shadow-emerald-200'
                                )}>
                                    {selectedNotification.type === 'alert' ? <AlertTriangle className="h-7 w-7" /> :
                                        selectedNotification.type === 'info' ? <Info className="h-7 w-7" /> :
                                            selectedNotification.type === 'broadcast' ? <Megaphone className="h-7 w-7" /> :
                                                <CheckCircle2 className="h-7 w-7" />}
                                </div>
                                <button
                                    onClick={() => setSelectedNotification(null)}
                                    className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <div className={cn(
                                        "text-[10px] font-black uppercase tracking-[0.2em] mb-2 px-3 py-1 rounded-full w-fit",
                                        selectedNotification.type === 'alert' ? 'bg-rose-50 text-rose-700' :
                                            selectedNotification.type === 'info' ? 'bg-blue-50 text-blue-700' :
                                                selectedNotification.type === 'broadcast' ? 'bg-amber-50 text-amber-700' :
                                                    'bg-emerald-50 text-emerald-700'
                                    )}>
                                        {selectedNotification.type === 'broadcast' ? 'PENGUMUMAN ADMIN UTAMA' : selectedNotification.type}
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                                        {selectedNotification.title}
                                    </h3>
                                </div>

                                <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100">
                                    <p className="text-slate-600 leading-relaxed font-medium">
                                        {selectedNotification.message}
                                    </p>
                                </div>

                                <div className="flex items-center gap-3 text-slate-300">
                                    <Calendar className="h-4 w-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">
                                        {new Date(selectedNotification.createdAt).toLocaleDateString('id-ID', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-10">
                                <button
                                    onClick={() => setSelectedNotification(null)}
                                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all hover:shadow-xl hover:shadow-slate-200"
                                >
                                    Tutup Detail
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
