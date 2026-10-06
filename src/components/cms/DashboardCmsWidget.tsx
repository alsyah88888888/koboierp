"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
    Truck, Calendar, Activity, Package, AlertCircle, 
    Info, ChevronRight, Settings, ExternalLink, Pin, 
    Layers, ArrowRight, CheckCircle2, Sparkles, Filter
} from "lucide-react";
import { CmsItem, CmsStep, parseCmsSteps } from "@/lib/cms-defaults";
import { CmsManageModal } from "./CmsManageModal";
import { callAction } from "@/proxy";

interface DashboardCmsWidgetProps {
    initialItems: CmsItem[];
    role?: string;
}

const ICON_MAP: Record<string, any> = {
    Truck,
    Calendar,
    Activity,
    Package,
    AlertCircle,
    Info,
    CheckCircle2,
    Layers
};

const THEME_STYLES: Record<string, {
    bgLight: string;
    border: string;
    badgeBg: string;
    badgeText: string;
    iconBg: string;
    iconText: string;
    stepCircle: string;
    glow: string;
}> = {
    indigo: {
        bgLight: "bg-indigo-50/50",
        border: "border-indigo-200/80",
        badgeBg: "bg-indigo-100",
        badgeText: "text-indigo-800",
        iconBg: "bg-indigo-600",
        iconText: "text-white",
        stepCircle: "bg-indigo-600 text-white",
        glow: "from-indigo-500/10 to-indigo-50/30"
    },
    blue: {
        bgLight: "bg-blue-50/50",
        border: "border-blue-200/80",
        badgeBg: "bg-blue-100",
        badgeText: "text-blue-800",
        iconBg: "bg-blue-600",
        iconText: "text-white",
        stepCircle: "bg-blue-600 text-white",
        glow: "from-blue-500/10 to-blue-50/30"
    },
    emerald: {
        bgLight: "bg-emerald-50/50",
        border: "border-emerald-200/80",
        badgeBg: "bg-emerald-100",
        badgeText: "text-emerald-800",
        iconBg: "bg-emerald-600",
        iconText: "text-white",
        stepCircle: "bg-emerald-600 text-white",
        glow: "from-emerald-500/10 to-emerald-50/30"
    },
    amber: {
        bgLight: "bg-amber-50/50",
        border: "border-amber-200/80",
        badgeBg: "bg-amber-100",
        badgeText: "text-amber-800",
        iconBg: "bg-amber-600",
        iconText: "text-white",
        stepCircle: "bg-amber-600 text-white",
        glow: "from-amber-500/10 to-amber-50/30"
    },
    purple: {
        bgLight: "bg-purple-50/50",
        border: "border-purple-200/80",
        badgeBg: "bg-purple-100",
        badgeText: "text-purple-800",
        iconBg: "bg-purple-600",
        iconText: "text-white",
        stepCircle: "bg-purple-600 text-white",
        glow: "from-purple-500/10 to-purple-50/30"
    },
    rose: {
        bgLight: "bg-rose-50/50",
        border: "border-rose-200/80",
        badgeBg: "bg-rose-100",
        badgeText: "text-rose-800",
        iconBg: "bg-rose-600",
        iconText: "text-white",
        stepCircle: "bg-rose-600 text-white",
        glow: "from-rose-500/10 to-rose-50/30"
    }
};

export function DashboardCmsWidget({ initialItems = [], role }: DashboardCmsWidgetProps) {
    const [items, setItems] = useState<CmsItem[]>(initialItems);
    const [activeTab, setActiveTab] = useState<string>("ALL");
    const [showManageModal, setShowManageModal] = useState<boolean>(false);
    const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

    const isAdmin = role === "ADMIN" || role === "MANAGER" || !role;

    const refreshItems = async () => {
        try {
            const data = await callAction("getCmsContents");
            if (Array.isArray(data)) {
                setItems(data);
            }
        } catch (err) {
            console.error("Gagal refresh CMS:", err);
        }
    };

    // Filter items
    const filteredItems = items.filter(item => {
        if (!item.isActive) return false;
        if (activeTab === "ALL") return true;
        return item.category === activeTab;
    });

    const pinnedItem = items.find(i => i.isPinned && i.isActive);

    return (
        <section className="space-y-4">
            {/* Widget Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-3">
                    <div className="h-6 w-2.5 bg-gradient-to-b from-indigo-500 to-indigo-700 rounded-full" />
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                                Alur Kegiatan & Informasi Operasional
                            </h2>
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Live Flow
                            </span>
                        </div>
                        <p className="text-xs text-slate-500">
                            Panduan alur proses kegiatan, jadwal pengiriman logistik, dan SOP terpadu perusahaan.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                    {/* CMS Manage Button (Admin Only) */}
                    {isAdmin && (
                        <button
                            onClick={() => setShowManageModal(true)}
                            className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                            title="Kelola Konten & Alur di CMS"
                        >
                            <Settings className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Kelola CMS</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Pinned Hero Highlight Banner (If any) */}
            {pinnedItem && (
                <div className="relative overflow-hidden rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white p-5 sm:p-7 shadow-xl shadow-indigo-950/20">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
                    
                    <div className="relative z-10 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <span className="inline-flex items-center gap-1 bg-amber-500 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                                    <Pin className="w-3 h-3" /> Utama
                                </span>
                                {pinnedItem.badge && (
                                    <span className="bg-indigo-500/30 text-indigo-200 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase border border-indigo-400/30">
                                        {pinnedItem.badge}
                                    </span>
                                )}
                            </div>

                            {pinnedItem.linkUrl && (
                                <Link
                                    href={pinnedItem.linkUrl}
                                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white hover:bg-indigo-50 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 shrink-0"
                                >
                                    <span>{pinnedItem.linkText || "Buka Halaman"}</span>
                                    <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
                                </Link>
                            )}
                        </div>

                        <div>
                            <h3 className="text-base sm:text-xl font-black text-white tracking-tight">
                                {pinnedItem.title}
                            </h3>
                            {pinnedItem.summary && (
                                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
                                    {pinnedItem.summary}
                                </p>
                            )}
                        </div>

                        {/* Interactive Steps Preview on Hero Banner */}
                        {(() => {
                            const steps = parseCmsSteps(pinnedItem.steps);
                            if (steps.length === 0) return null;
                            return (
                                <div className="pt-2">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                                        {steps.map((st, sIdx) => (
                                            <div 
                                                key={sIdx}
                                                className="bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl p-3 transition-all backdrop-blur-xs flex flex-col justify-between"
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <span className="w-5 h-5 rounded-full bg-indigo-500 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                                                            {sIdx + 1}
                                                        </span>
                                                        <h4 className="text-xs font-black text-white truncate">
                                                            {st.title}
                                                        </h4>
                                                    </div>
                                                    <p className="text-[11px] text-slate-300 line-clamp-2 leading-snug">
                                                        {st.desc}
                                                    </p>
                                                </div>

                                                {st.linkUrl && (
                                                    <Link
                                                        href={st.linkUrl}
                                                        className="text-[10px] font-bold text-indigo-300 hover:text-white flex items-center gap-1 mt-2 transition-colors"
                                                    >
                                                        <span>{st.linkText || "Akses"}</span>
                                                        <ChevronRight className="w-3 h-3" />
                                                    </Link>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                <button
                    onClick={() => setActiveTab("ALL")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        activeTab === "ALL" 
                            ? "bg-white text-slate-900 shadow-xs" 
                            : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                    Semua ({items.filter(i => i.isActive).length})
                </button>
                <button
                    onClick={() => setActiveTab("FLOW_KEGIATAN")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        activeTab === "FLOW_KEGIATAN" 
                            ? "bg-white text-indigo-700 shadow-xs" 
                            : "text-slate-600 hover:text-indigo-600"
                    }`}
                >
                    Alur Kegiatan ({items.filter(i => i.isActive && i.category === "FLOW_KEGIATAN").length})
                </button>
                <button
                    onClick={() => setActiveTab("JADWAL_PENGIRIMAN")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        activeTab === "JADWAL_PENGIRIMAN" 
                            ? "bg-white text-blue-700 shadow-xs" 
                            : "text-slate-600 hover:text-blue-600"
                    }`}
                >
                    Jadwal Pengiriman ({items.filter(i => i.isActive && i.category === "JADWAL_PENGIRIMAN").length})
                </button>
                <button
                    onClick={() => setActiveTab("SOP")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        activeTab === "SOP" 
                            ? "bg-white text-amber-700 shadow-xs" 
                            : "text-slate-600 hover:text-amber-600"
                    }`}
                >
                    SOP Operasional ({items.filter(i => i.isActive && i.category === "SOP").length})
                </button>
                <button
                    onClick={() => setActiveTab("PENGUMUMAN")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        activeTab === "PENGUMUMAN" 
                            ? "bg-white text-emerald-700 shadow-xs" 
                            : "text-slate-600 hover:text-emerald-600"
                    }`}
                >
                    Pengumuman ({items.filter(i => i.isActive && i.category === "PENGUMUMAN").length})
                </button>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredItems.map(item => {
                    const theme = THEME_STYLES[item.colorTheme || "indigo"] || THEME_STYLES.indigo;
                    const IconComp = ICON_MAP[item.icon || "Truck"] || Truck;
                    const steps = parseCmsSteps(item.steps);
                    const isExpanded = expandedCardId === item.id;

                    return (
                        <div
                            key={item.id}
                            className={`rounded-3xl border bg-white p-5 transition-all shadow-xs hover:shadow-md flex flex-col justify-between ${theme.border}`}
                        >
                            <div className="space-y-3.5">
                                {/* Card Header */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${theme.iconBg} ${theme.iconText}`}>
                                            <IconComp className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${theme.badgeBg} ${theme.badgeText}`}>
                                                    {item.badge || item.category.replace("_", " ")}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase">
                                                    {item.category.replace("_", " ")}
                                                </span>
                                            </div>
                                            <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                                                {item.title}
                                            </h3>
                                        </div>
                                    </div>
                                </div>

                                {/* Summary */}
                                {item.summary && (
                                    <p className="text-xs text-slate-600 leading-relaxed">
                                        {item.summary}
                                    </p>
                                )}

                                {/* Interactive Steps / Workflow Timeline */}
                                {steps.length > 0 && (
                                    <div className="pt-2">
                                        <div className="space-y-2 border-l-2 border-slate-200 ml-3 pl-3.5">
                                            {steps.map((st, idx) => (
                                                <div key={idx} className="relative group">
                                                    {/* Step Circle bullet */}
                                                    <div className={`absolute -left-[21px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-2xs flex items-center justify-center text-[8px] font-black ${theme.stepCircle}`}>
                                                        {idx + 1}
                                                    </div>

                                                    <div className="text-left">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-xs font-black text-slate-800">
                                                                {st.title}
                                                            </h4>
                                                            {st.linkUrl && (
                                                                <Link
                                                                    href={st.linkUrl}
                                                                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                                                                >
                                                                    <span>{st.linkText || "Akses"}</span>
                                                                    <ChevronRight className="w-3 h-3" />
                                                                </Link>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-slate-500 leading-normal mt-0.5">
                                                            {st.desc}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Card Footer: Action Button */}
                            {item.linkUrl && (
                                <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-400">
                                        Modul Terkait
                                    </span>
                                    <Link
                                        href={item.linkUrl}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer active:scale-95"
                                    >
                                        <span>{item.linkText || "Buka Halaman"}</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* CMS Management Modal */}
            <CmsManageModal
                isOpen={showManageModal}
                onClose={() => setShowManageModal(false)}
                items={items}
                onRefresh={refreshItems}
            />
        </section>
    );
}
