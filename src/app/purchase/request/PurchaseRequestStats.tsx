"use client";

import { useEffect, useState } from "react";
import { Clock, CheckCircle2, ShieldCheck, Calculator } from "lucide-react";
import { getPurchaseRequestSummaryAction } from "@/actions/purchase";
import { formatCurrency } from "@/lib/utils";

export function PurchaseRequestStats() {
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        const loadStats = async () => {
            const data = await getPurchaseRequestSummaryAction();
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
            label: "Menunggu Admin",
            value: stats.pending,
            icon: Clock,
            color: "text-amber-600",
            bg: "bg-amber-50",
            border: "border-amber-100",
            suffix: " PR"
        },
        {
            label: "Menunggu Finance",
            value: stats.approved,
            icon: ShieldCheck,
            color: "text-blue-600",
            bg: "bg-blue-50",
            border: "border-blue-100",
            suffix: " PR"
        },
        {
            label: "Terverifikasi",
            value: stats.verified,
            icon: CheckCircle2,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            border: "border-emerald-100",
            suffix: " PR"
        },
        {
            label: "Total Estimasi PR",
            value: formatCurrency(stats.totalEstimation),
            icon: Calculator,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
            border: "border-indigo-100"
        }
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {items.map((item, i) => (
                <div key={i} className={`p-4 rounded-xl border-2 ${item.border} ${item.bg} flex items-start justify-between shadow-sm transition-all hover:scale-[1.02]`}>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{item.label}</p>
                        <h3 className={`text-xl font-black ${item.color}`}>
                            {item.value}{item.suffix}
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
