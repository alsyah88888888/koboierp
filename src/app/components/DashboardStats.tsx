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
        <div className="grid gap-4 md:grid-cols-3 animate-pulse">
            {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-slate-100 rounded-[2rem] border border-slate-200" />
            ))}
        </div>
    );

    const items = [
        {
            label: "Total Revenue",
            value: formatCurrency(Math.round(Number(stats?.totalRevenue || 0))),
            icon: DollarSign,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            border: "border-emerald-100",
            subtitle: "Pendapatan kotor bulan ini"
        },
        {
            label: "Asset Value (Stock)",
            value: formatCurrency(Math.round(Number(stats?.assetValue || 0))),
            icon: Box,
            color: "text-blue-600",
            bg: "bg-blue-50",
            border: "border-blue-100",
            subtitle: "Estimasi nilai persediaan saat ini"
        },
        {
            label: "Purchases (This Month)",
            value: isClient ? Number(stats?.purchaseVol || 0).toLocaleString() : "...",
            icon: ShoppingCart,
            color: "text-amber-600",
            bg: "bg-amber-50",
            border: "border-amber-100",
            suffix: " Items",
            subtitle: "Total barang yang dibeli bulan ini"
        }
    ].filter(item => {
        if (userRole === "WAREHOUSE" && item.label === "Total Revenue") {
            return false;
        }
        return true;
    });

    return (
        <div className="grid gap-6 md:grid-cols-3">
            {items.map((item, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-7 relative group transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 overflow-hidden">
                    {/* Decorative Background Glow */}
                    <div className={cn("absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-[0.05] group-hover:opacity-[0.1] blur-3xl transition-all duration-500", item.bg)} />
                    
                    <div className="relative flex flex-col justify-between h-full space-y-6">
                        <div className="flex items-center justify-between">
                            <div className={cn(item.bg, "p-4 rounded-[1.5rem] shadow-sm border transition-transform duration-300 group-hover:scale-110", item.border)}>
                                <item.icon className={cn("h-6 w-6", item.color)} />
                            </div>
                        </div>
                        
                        <div className="space-y-1">
                            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 truncate">{item.label}</p>
                            <h3 className={cn("text-2xl md:text-3xl font-black tracking-tighter leading-none", item.color)}>
                                {isClient ? item.value : "Rp ---"}{isClient && item.suffix}
                            </h3>
                            {item.subtitle && (
                                <p className="text-[10px] font-bold text-slate-400/80 mt-2">{item.subtitle}</p>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
