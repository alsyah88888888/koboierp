"use client";

import { useEffect, useState } from "react";
import { DollarSign, Package, ShoppingCart, Wallet, TrendingUp, Box } from "lucide-react";
import { getDashboardSummaryAction } from "@/app/actions";
import { formatCurrency } from "@/lib/utils";
import { useSession } from "next-auth/react";

export function DashboardStats() {
    const [stats, setStats] = useState<any>(null);
    const [isClient, setIsClient] = useState(false);
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role || "USER";

    useEffect(() => {
        setIsClient(true);
        const loadStats = async () => {
            const data = await getDashboardSummaryAction();
            setStats(data);
        };
        loadStats();
    }, []);

    if (!stats) return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-pulse">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-muted rounded-xl" />
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
            label: "Purchase Volume",
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {items.map((item, i) => (
                <div key={i} className={`p-4 rounded-xl border-2 ${item.border} ${item.bg} flex items-start justify-between shadow-sm transition-all hover:scale-[1.02]`}>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{item.label}</p>
                        <h3 className={`text-xl font-black ${item.color}`}>
                            {isClient ? item.value : "..."}{item.suffix}
                        </h3>
                    </div>
                    <div className={`${item.bg} p-2 rounded-lg border ${item.border}`}>
                        <item.icon className={`h-5 w-5 ${item.color}`} />
                    </div>
                </div>
            ))}
        </div>
    );
}
