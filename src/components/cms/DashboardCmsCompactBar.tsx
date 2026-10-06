"use client";

import React from "react";
import Link from "next/link";
import { 
    Layers, Truck, ArrowRight, Sparkles, Pin, 
    Calendar, CheckCircle2, ChevronRight, Activity 
} from "lucide-react";
import { CmsItem } from "@/lib/cms-defaults";

interface DashboardCmsCompactBarProps {
    items: CmsItem[];
    role?: string;
}

export function DashboardCmsCompactBar({ items = [], role }: DashboardCmsCompactBarProps) {
    const activeItems = items.filter(item => item.isActive !== false);
    const pinnedItem = activeItems.find(item => item.isPinned) || activeItems[0];
    const totalFlows = activeItems.filter(i => i.category === "FLOW_KEGIATAN").length;
    const totalSchedules = activeItems.filter(i => i.category === "JADWAL_PENGIRIMAN").length;

    return (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-3.5 sm:p-4 shadow-lg shadow-indigo-950/10">
            {/* Subtle glow background */}
            <div className="absolute top-0 right-1/4 w-96 h-full bg-indigo-500/10 blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
                {/* Left: Indicator & Flow Highlight */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0 text-indigo-300">
                        <Layers className="w-5 h-5 animate-pulse" />
                    </div>

                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 bg-indigo-500 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                                <Sparkles className="w-2.5 h-2.5" /> Modul CMS
                            </span>
                            {pinnedItem?.badge && (
                                <span className="bg-white/10 text-indigo-200 text-[9px] font-black px-2 py-0.5 rounded uppercase">
                                    {pinnedItem.badge}
                                </span>
                            )}
                            <span className="text-[10px] text-slate-400 hidden sm:inline">
                                • {totalFlows} Alur Proses Aktif
                            </span>
                        </div>

                        <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs sm:text-sm font-black text-white truncate max-w-xl">
                                {pinnedItem?.title || "Pusat Alur Kegiatan & Jadwal Pengiriman Operasional"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right: Quick Action Shortcuts & Direct Link to /cms */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-white/10">
                    <Link
                        href="/warehouse/jadwal-pengiriman"
                        className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white rounded-xl text-[11px] font-bold transition-all"
                    >
                        <Truck className="w-3.5 h-3.5 text-amber-400" />
                        <span>Jadwal Armada</span>
                    </Link>

                    <Link
                        href="/cms"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-600/30 active:scale-95"
                    >
                        <span>Buka Modul CMS</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
