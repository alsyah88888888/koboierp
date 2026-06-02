"use client";

import { useEffect, useState } from "react";
import { DollarSign, Package, ShoppingCart, Wallet, TrendingUp, Box } from "lucide-react";
import { callAction } from "@/proxy";

import { formatCurrency, cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

export function DashboardStats({ month, year }: { month?: number; year?: number }) {
    const [stats, setStats] = useState<any>(null);
    const [isClient, setIsClient] = useState(false);
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role || "USER";

    useEffect(() => {
        setIsClient(true);
        const loadStats = async () => {
            try {
                const data = await callAction("getDashboardSummary", month, year);
                setStats(data);
            } catch (err) {
                console.error("Dashboard Stats Error:", err);
                setStats({});
            }
        };

        loadStats();
    }, [month, year]);

    if (!stats) return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-pulse">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-slate-100 rounded-2xl border border-slate-200" />
            ))}
        </div>
    );

    const items = [
        {
            label: "Total Revenue",
            value: formatCurrency(Number(stats?.totalRevenue || 0)),
            icon: DollarSign,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            border: "border-emerald-100"
        },
        {
            label: "Asset Value (Stock)",
            value: formatCurrency(Number(stats?.assetValue || 0)),
            icon: Box,
            color: "text-blue-600",
            bg: "bg-blue-50",
            border: "border-blue-100"
        },
        {
            label: "Purchases (This Month)",
            value: isClient ? Number(stats?.purchaseVol || 0).toLocaleString() : "...",
            icon: ShoppingCart,
            color: "text-amber-600",
            bg: "bg-amber-50",
            border: "border-amber-100",
            suffix: " Items"
        },
        {
            label: "Cash/Bank Balance",
            value: formatCurrency(Number(stats?.cashBalance || 0)),
            icon: Wallet,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
            border: "border-indigo-100"
        }
    ].filter(item => {
        if (userRole === "WAREHOUSE" && (item.label === "Total Revenue" || item.label === "Cash/Bank Balance")) {
            return false;
        }
        return true;
    });

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {items.map((item, i) => (
                <div key={i} className={`erp-card p-6 md:p-7 relative group transition-all hover:scale-[1.03] active:scale-[0.98] border-slate-200/40`}>
                    {/* Decorative Background Glow */}
                    <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-[0.03] group-hover:opacity-[0.08] blur-3xl transition-all ${item.bg}`} />
                    
                    <div className="relative flex flex-col justify-between h-full space-y-6">
                        <div className="flex items-center justify-between">
                            <div className={cn(item.bg, "p-3 rounded-2xl shadow-sm border border-white/50 backdrop-blur-md")}>
                                <item.icon className={`h-5 w-5 ${item.color}`} />
                            </div>
                        </div>
                        
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2 truncate">{item.label}</p>
                            <h3 className={`text-xl md:text-2xl font-black ${item.color} tracking-tighter leading-none`}>
                                {isClient ? item.value : "Rp ---"}{isClient && item.suffix}
                            </h3>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
