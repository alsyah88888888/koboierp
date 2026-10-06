"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { 
    Layers, Truck, Calendar, Activity, Package, AlertCircle, 
    Info, ChevronRight, Settings, ExternalLink, Pin, ArrowRight, 
    CheckCircle2, Sparkles, Filter, Plus, Edit3, Trash2, Eye, 
    ArrowLeft, Search, RefreshCw, LayoutGrid, List, Check,
    Save, FileText, Share2, Shield, EyeOff, HelpCircle
} from "lucide-react";
import { CmsItem, CmsStep, parseCmsSteps } from "@/lib/cms-defaults";
import { callAction } from "@/proxy";

interface CmsModuleDashboardProps {
    initialItems: CmsItem[];
    currentUser: any;
}

const CATEGORIES = [
    { value: "ALL", label: "Semua Kategori", icon: Layers },
    { value: "FLOW_KEGIATAN", label: "Flow Kegiatan (Alur Proses)", icon: Activity },
    { value: "JADWAL_PENGIRIMAN", label: "Jadwal Pengiriman", icon: Truck },
    { value: "PENGUMUMAN", label: "Pengumuman Tim", icon: Info },
    { value: "SOP", label: "Standar Operasional (SOP)", icon: CheckCircle2 }
];

const THEME_STYLES: Record<string, {
    border: string;
    badgeBg: string;
    badgeText: string;
    stepBg: string;
    glow: string;
    accent: string;
}> = {
    indigo: {
        border: "border-indigo-200 hover:border-indigo-400",
        badgeBg: "bg-indigo-100 text-indigo-800",
        badgeText: "text-indigo-700",
        stepBg: "bg-indigo-600 text-white",
        glow: "from-indigo-500/10 to-indigo-50/20",
        accent: "text-indigo-600"
    },
    blue: {
        border: "border-blue-200 hover:border-blue-400",
        badgeBg: "bg-blue-100 text-blue-800",
        badgeText: "text-blue-700",
        stepBg: "bg-blue-600 text-white",
        glow: "from-blue-500/10 to-blue-50/20",
        accent: "text-blue-600"
    },
    emerald: {
        border: "border-emerald-200 hover:border-emerald-400",
        badgeBg: "bg-emerald-100 text-emerald-800",
        badgeText: "text-emerald-700",
        stepBg: "bg-emerald-600 text-white",
        glow: "from-emerald-500/10 to-emerald-50/20",
        accent: "text-emerald-600"
    },
    amber: {
        border: "border-amber-200 hover:border-amber-400",
        badgeBg: "bg-amber-100 text-amber-800",
        badgeText: "text-amber-700",
        stepBg: "bg-amber-600 text-white",
        glow: "from-amber-500/10 to-amber-50/20",
        accent: "text-amber-600"
    },
    purple: {
        border: "border-purple-200 hover:border-purple-400",
        badgeBg: "bg-purple-100 text-purple-800",
        badgeText: "text-purple-700",
        stepBg: "bg-purple-600 text-white",
        glow: "from-purple-500/10 to-purple-50/20",
        accent: "text-purple-600"
    },
    rose: {
        border: "border-rose-200 hover:border-rose-400",
        badgeBg: "bg-rose-100 text-rose-800",
        badgeText: "text-rose-700",
        stepBg: "bg-rose-600 text-white",
        glow: "from-rose-500/10 to-rose-50/20",
        accent: "text-rose-600"
    }
};

export function CmsModuleDashboard({ initialItems = [], currentUser }: CmsModuleDashboardProps) {
    const userRole = (currentUser?.role || "USER").toUpperCase();
    const isAdmin = userRole === "ADMIN";

    const [items, setItems] = useState<CmsItem[]>(initialItems);
    const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [viewMode, setViewMode] = useState<"FLOW_VIEW" | "TABLE_VIEW" | "EDITOR">("FLOW_VIEW");
    const [selectedFlowItem, setSelectedFlowItem] = useState<CmsItem | null>(null);

    // Form / Editor States
    const [editingItem, setEditingItem] = useState<CmsItem | null>(null);
    const [formTitle, setFormTitle] = useState("");
    const [formCategory, setFormCategory] = useState<"FLOW_KEGIATAN" | "JADWAL_PENGIRIMAN" | "PENGUMUMAN" | "SOP">("FLOW_KEGIATAN");
    const [formSummary, setFormSummary] = useState("");
    const [formContent, setFormContent] = useState("");
    const [formLinkUrl, setFormLinkUrl] = useState("");
    const [formLinkText, setFormLinkText] = useState("");
    const [formBadge, setFormBadge] = useState("");
    const [formColorTheme, setFormColorTheme] = useState("indigo");
    const [formIcon, setFormIcon] = useState("Truck");
    const [formPriority, setFormPriority] = useState(0);
    const [formIsPinned, setFormIsPinned] = useState(false);
    const [formIsActive, setFormIsActive] = useState(true);
    const [formTargetRole, setFormTargetRole] = useState("ALL");
    const [formSteps, setFormSteps] = useState<CmsStep[]>([]);

    // Loading & Feedback
    const [isPending, startTransition] = useTransition();
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

    // Set first flow item as default selected flow on initial render
    React.useEffect(() => {
        if (!selectedFlowItem && items.length > 0) {
            const flow = items.find(i => i.category === "FLOW_KEGIATAN" && i.isActive) || items[0];
            setSelectedFlowItem(flow);
        }
    }, [items, selectedFlowItem]);

    const showFeedback = (type: "success" | "error", message: string) => {
        setFeedback({ type, message });
        setTimeout(() => setFeedback(null), 4000);
    };

    const refreshContents = async () => {
        try {
            const res = await callAction("getAllCmsContentsForAdmin");
            if (Array.isArray(res)) {
                setItems(res);
            }
        } catch (err: any) {
            console.error("Gagal refresh CMS contents:", err);
        }
    };

    const handleOpenCreateForm = () => {
        setEditingItem(null);
        setFormTitle("");
        setFormCategory("FLOW_KEGIATAN");
        setFormSummary("");
        setFormContent("");
        setFormLinkUrl("/warehouse/jadwal-pengiriman");
        setFormLinkText("Buka Modul");
        setFormBadge("OPERASIONAL");
        setFormColorTheme("indigo");
        setFormIcon("Truck");
        setFormPriority(0);
        setFormIsPinned(false);
        setFormIsActive(true);
        setFormTargetRole("ALL");
        setFormSteps([
            { title: "Langkah 1", desc: "Instruksi langkah pertama proses.", linkUrl: "", linkText: "" },
            { title: "Langkah 2", desc: "Instruksi langkah kedua proses.", linkUrl: "", linkText: "" }
        ]);
        setViewMode("EDITOR");
    };

    const handleOpenEditForm = (item: CmsItem) => {
        setEditingItem(item);
        setFormTitle(item.title);
        setFormCategory(item.category);
        setFormSummary(item.summary || "");
        setFormContent(item.content || "");
        setFormLinkUrl(item.linkUrl || "");
        setFormLinkText(item.linkText || "");
        setFormBadge(item.badge || "");
        setFormColorTheme(item.colorTheme || "indigo");
        setFormIcon(item.icon || "Truck");
        setFormPriority(item.priority || 0);
        setFormIsPinned(!!item.isPinned);
        setFormIsActive(item.isActive !== false);
        setFormTargetRole(item.targetRole || "ALL");
        setFormSteps(parseCmsSteps(item.steps));
        setViewMode("EDITOR");
    };

    const handleSaveForm = () => {
        if (!formTitle.trim()) {
            showFeedback("error", "Judul konten wajib diisi!");
            return;
        }

        startTransition(async () => {
            try {
                const payload = {
                    title: formTitle,
                    category: formCategory,
                    summary: formSummary,
                    content: formContent,
                    linkUrl: formLinkUrl || null,
                    linkText: formLinkText || null,
                    badge: formBadge || null,
                    colorTheme: formColorTheme,
                    icon: formIcon,
                    priority: Number(formPriority) || 0,
                    isPinned: formIsPinned,
                    isActive: formIsActive,
                    targetRole: formTargetRole,
                    steps: formSteps.length > 0 ? JSON.stringify(formSteps) : null
                };

                let res;
                if (editingItem) {
                    res = await callAction("updateCmsContent", editingItem.id, payload);
                } else {
                    res = await callAction("createCmsContent", payload);
                }

                if (res && res.success) {
                    showFeedback("success", editingItem ? "Alur/Konten berhasil diperbarui!" : "Alur/Konten baru berhasil dibuat!");
                    await refreshContents();
                    setViewMode("FLOW_VIEW");
                } else {
                    showFeedback("error", res?.error || "Gagal menyimpan konten CMS.");
                }
            } catch (err: any) {
                showFeedback("error", err?.message || "Terjadi kesalahan sistem saat menyimpan.");
            }
        });
    };

    const handleToggleActive = (item: CmsItem) => {
        startTransition(async () => {
            try {
                const res = await callAction("toggleCmsContentActive", item.id);
                if (res && res.success) {
                    showFeedback("success", `Status tayang di Dashboard berhasil diubah!`);
                    await refreshContents();
                } else {
                    showFeedback("error", res?.error || "Gagal mengubah status aktif.");
                }
            } catch (err: any) {
                showFeedback("error", err?.message || "Terjadi kesalahan.");
            }
        });
    };

    const handleDelete = (item: CmsItem) => {
        if (!confirm(`Hapus konten "${item.title}" secara permanen?`)) return;

        startTransition(async () => {
            try {
                const res = await callAction("deleteCmsContent", item.id);
                if (res && res.success) {
                    showFeedback("success", "Konten berhasil dihapus.");
                    await refreshContents();
                    if (selectedFlowItem?.id === item.id) {
                        setSelectedFlowItem(null);
                    }
                } else {
                    showFeedback("error", res?.error || "Gagal menghapus konten.");
                }
            } catch (err: any) {
                showFeedback("error", err?.message || "Gagal menghapus konten.");
            }
        });
    };

    // Step Builder Helpers
    const handleAddStep = () => {
        setFormSteps([...formSteps, { title: `Langkah ${formSteps.length + 1}`, desc: "", linkUrl: "", linkText: "" }]);
    };

    const handleUpdateStep = (index: number, field: keyof CmsStep, val: string) => {
        const next = [...formSteps];
        next[index] = { ...next[index], [field]: val };
        setFormSteps(next);
    };

    const handleRemoveStep = (index: number) => {
        setFormSteps(formSteps.filter((_, i) => i !== index));
    };

    // Filter Items
    const filteredItems = items.filter(item => {
        const matchCategory = selectedCategory === "ALL" || item.category === selectedCategory;
        const matchSearch = !searchQuery || 
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.summary && item.summary.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (item.badge && item.badge.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchCategory && matchSearch;
    });

    const activeCount = items.filter(i => i.isActive).length;
    const flowsCount = items.filter(i => i.category === "FLOW_KEGIATAN").length;
    const schedulesCount = items.filter(i => i.category === "JADWAL_PENGIRIMAN").length;

    return (
        <div className="space-y-6 pb-20 animate-fade-up">
            {/* Top Feedback Notification */}
            {feedback && (
                <div className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold shadow-lg transition-all ${
                    feedback.type === "success" 
                        ? "bg-emerald-600 text-white shadow-emerald-600/20" 
                        : "bg-rose-600 text-white shadow-rose-600/20"
                }`}>
                    <div className="flex items-center gap-2">
                        {feedback.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        <span>{feedback.message}</span>
                    </div>
                    <button onClick={() => setFeedback(null)} className="text-white/80 hover:text-white">✕</button>
                </div>
            )}

            {/* Header Module Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 text-white p-6 sm:p-8 shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2.5">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                                <Layers className="w-3.5 h-3.5" /> Modul Resmi ERP
                            </span>
                            <span className="text-xs text-slate-400 font-semibold">
                                Content Management & Operational Workflows
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
                            CMS Konten & Alur Operasional
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                            Pusat kendali panduan alur proses bisnis, informasi jadwal pengiriman armada, pengumuman tim, serta SOP terpadu yang ditampilkan kepada pengguna.
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-3">
                        <Link
                            href="/warehouse/jadwal-pengiriman"
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-sm"
                        >
                            <Truck className="w-4 h-4 text-amber-400" />
                            <span>Jadwal Harian Driver</span>
                        </Link>

                        {isAdmin && (
                            <button
                                onClick={handleOpenCreateForm}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/30 active:scale-95 cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                                <span>+ Buat Alur / Konten Baru</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Quick Stats Metric Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-white/10">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Konten</p>
                        <p className="text-xl font-black text-white mt-0.5">{items.length}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-indigo-300">Alur Proses Aktif</p>
                        <p className="text-xl font-black text-indigo-200 mt-0.5">{flowsCount}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-amber-300">Jadwal Pengiriman</p>
                        <p className="text-xl font-black text-amber-200 mt-0.5">{schedulesCount}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Tayang di Dashboard</p>
                        <p className="text-xl font-black text-emerald-300 mt-0.5">{activeCount}</p>
                    </div>
                </div>
            </div>

            {/* View Mode Tabs & Filter Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                {/* Mode Selector */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
                    <button
                        onClick={() => setViewMode("FLOW_VIEW")}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                            viewMode === "FLOW_VIEW" 
                                ? "bg-white text-indigo-700 shadow-xs" 
                                : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        <Activity className="w-3.5 h-3.5" />
                        <span>Visual Alur Proses</span>
                    </button>
                    <button
                        onClick={() => setViewMode("TABLE_VIEW")}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                            viewMode === "TABLE_VIEW" 
                                ? "bg-white text-indigo-700 shadow-xs" 
                                : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        <List className="w-3.5 h-3.5" />
                        <span>Daftar Kelola ({items.length})</span>
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => {
                                if (viewMode !== "EDITOR") handleOpenCreateForm();
                            }}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                                viewMode === "EDITOR" 
                                    ? "bg-indigo-600 text-white shadow-xs" 
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{editingItem ? "Edit Konten" : "Editor Konten"}</span>
                        </button>
                    )}
                </div>

                {/* Search & Category Filter */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 sm:w-60">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Cari alur / SOP..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                        />
                    </div>

                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden"
                    >
                        {CATEGORIES.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                    </select>

                    <button
                        onClick={refreshContents}
                        disabled={isPending}
                        className="p-2 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition-colors"
                        title="Segarkan Data"
                    >
                        <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin text-indigo-600" : ""}`} />
                    </button>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* VIEW 1: VISUAL ALUR PROSES (INTERACTIVE FLOWCHART VIEWER)       */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {viewMode === "FLOW_VIEW" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Flow List Selector */}
                    <div className="lg:col-span-1 space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
                                Pilih Alur Proses Kegiatan
                            </h2>
                            <span className="text-[11px] font-bold text-slate-400">
                                {filteredItems.length} Alur Tersedia
                            </span>
                        </div>

                        <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
                            {filteredItems.map(item => {
                                const isSelected = selectedFlowItem?.id === item.id;
                                const theme = THEME_STYLES[item.colorTheme || "indigo"] || THEME_STYLES.indigo;
                                const steps = parseCmsSteps(item.steps);

                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => setSelectedFlowItem(item)}
                                        className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                                            isSelected 
                                                ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-indigo-950/20 translate-x-1" 
                                                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-2xs"
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                {item.badge && (
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                                                        isSelected ? "bg-white/20 text-white" : theme.badgeBg
                                                    }`}>
                                                        {item.badge}
                                                    </span>
                                                )}
                                                {item.isPinned && (
                                                    <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-amber-400">
                                                        <Pin className="w-2.5 h-2.5" /> Pin
                                                    </span>
                                                )}
                                            </div>

                                            <span className={`text-[10px] font-bold ${
                                                item.isActive 
                                                    ? isSelected ? "text-emerald-400" : "text-emerald-600" 
                                                    : isSelected ? "text-slate-500" : "text-slate-400"
                                            }`}>
                                                {item.isActive ? "● Dashboard" : "○ Draft"}
                                            </span>
                                        </div>

                                        <h3 className={`text-sm font-black mt-2 leading-snug line-clamp-2 ${
                                            isSelected ? "text-white" : "text-slate-900"
                                        }`}>
                                            {item.title}
                                        </h3>

                                        {item.summary && (
                                            <p className={`text-xs mt-1 line-clamp-2 leading-relaxed ${
                                                isSelected ? "text-slate-300" : "text-slate-500"
                                            }`}>
                                                {item.summary}
                                            </p>
                                        )}

                                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-current/10 text-[10px] font-black">
                                            <span className={isSelected ? "text-indigo-300" : "text-indigo-600"}>
                                                {steps.length} Tahapan Alur
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <span>Buka Diagram</span>
                                                <ChevronRight className="w-3 h-3" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Column: Interactive Step Flowchart & Detailed SOP */}
                    <div className="lg:col-span-2">
                        {selectedFlowItem ? (
                            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-6">
                                {/* Flow Header Card */}
                                <div className="space-y-3 border-b border-slate-100 pb-6">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                {selectedFlowItem.category.replace("_", " ")}
                                            </span>
                                            {selectedFlowItem.badge && (
                                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700">
                                                    {selectedFlowItem.badge}
                                                </span>
                                            )}
                                            {selectedFlowItem.isPinned && (
                                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800">
                                                    <Pin className="w-3 h-3" /> Pinned Highlight
                                                </span>
                                            )}
                                        </div>

                                        {/* Admin Action Buttons */}
                                        {isAdmin && (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleToggleActive(selectedFlowItem)}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                                                        selectedFlowItem.isActive
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                                            : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                                                    }`}
                                                    title="Tampilkan / Sembunyikan dari Dashboard"
                                                >
                                                    {selectedFlowItem.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                                    <span>{selectedFlowItem.isActive ? "Tayang di Dashboard" : "Draft (Tersembunyi)"}</span>
                                                </button>

                                                <button
                                                    onClick={() => handleOpenEditForm(selectedFlowItem)}
                                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                                                    title="Edit Alur Ini"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                                            {selectedFlowItem.title}
                                        </h2>
                                        {selectedFlowItem.summary && (
                                            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                                                {selectedFlowItem.summary}
                                            </p>
                                        )}
                                    </div>

                                    {/* Direct Module Link if configured */}
                                    {selectedFlowItem.linkUrl && (
                                        <div className="pt-2">
                                            <Link
                                                href={selectedFlowItem.linkUrl}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
                                            >
                                                <span>{selectedFlowItem.linkText || "Buka Halaman Modul Terkait"}</span>
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </Link>
                                        </div>
                                    )}
                                </div>

                                {/* Flowchart Visual Step Sequence */}
                                {(() => {
                                    const steps = parseCmsSteps(selectedFlowItem.steps);
                                    if (steps.length === 0) {
                                        return (
                                            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                                <p className="text-xs font-bold text-slate-500">
                                                    Belum ada tahapan diagram alur yang dikonfigurasi.
                                                </p>
                                                {isAdmin && (
                                                    <button
                                                        onClick={() => handleOpenEditForm(selectedFlowItem)}
                                                        className="mt-3 px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                                                    >
                                                        + Tambah Tahapan Alur di Editor
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                                    <Activity className="w-4 h-4 text-indigo-600" />
                                                    Diagram Tahapan Alur Proses ({steps.length} Langkah)
                                                </h3>
                                                <span className="text-[11px] text-slate-400 font-semibold">
                                                    Ikuti proses berurutan dari kiri ke kanan
                                                </span>
                                            </div>

                                            {/* Horizontal / Grid Flowchart with Connectors */}
                                            <div className="space-y-3">
                                                {steps.map((step, idx) => (
                                                    <div 
                                                        key={idx}
                                                        className="relative flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-xs transition-all group"
                                                    >
                                                        {/* Number Badge */}
                                                        <div className="w-8 h-8 rounded-2xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/30 group-hover:scale-110 transition-transform">
                                                            {idx + 1}
                                                        </div>

                                                        {/* Step Content */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                                <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                                    {step.title}
                                                                </h4>

                                                                {step.linkUrl && (
                                                                    <Link
                                                                        href={step.linkUrl}
                                                                        className="inline-flex items-center gap-1 text-[11px] font-black text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors"
                                                                    >
                                                                        <span>{step.linkText || "Buka Modul"}</span>
                                                                        <ChevronRight className="w-3 h-3" />
                                                                    </Link>
                                                                )}
                                                            </div>

                                                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                                                {step.desc}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Full Content / SOP Document */}
                                {selectedFlowItem.content && (
                                    <div className="border-t border-slate-100 pt-6 space-y-3">
                                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-slate-600" />
                                            Panduan Lengkap & Petunjuk Teknis SOP
                                        </h3>
                                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                                            {selectedFlowItem.content}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
                                <Activity className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                                <p className="font-bold">Pilih alur proses kegiatan di sebelah kiri untuk melihat diagram interaktif.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* VIEW 2: DAFTAR KELOLA & TABEL KONTEN (TABLE MANAGEMENT VIEW)     */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {viewMode === "TABLE_VIEW" && (
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                                Manajemen Seluruh Konten & Alur Operasional
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Aktifkan atau nonaktifkan konten yang tampil di dashboard, kelola prioritas, dan edit alur.
                            </p>
                        </div>

                        {isAdmin && (
                            <button
                                onClick={handleOpenCreateForm}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                            >
                                + Tambah Konten
                            </button>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-black">
                                <tr>
                                    <th className="px-5 py-3.5">Judul & Kategori</th>
                                    <th className="px-4 py-3.5">Badge</th>
                                    <th className="px-4 py-3.5">Tahapan Alur</th>
                                    <th className="px-4 py-3.5">Target Role</th>
                                    <th className="px-4 py-3.5 text-center">Status Dashboard</th>
                                    <th className="px-4 py-3.5 text-center">Pin Utama</th>
                                    <th className="px-5 py-3.5 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredItems.map(item => {
                                    const steps = parseCmsSteps(item.steps);
                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="font-black text-slate-900 text-sm max-w-sm truncate">
                                                    {item.title}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] font-bold text-indigo-600 uppercase">
                                                        {item.category.replace("_", " ")}
                                                    </span>
                                                    {item.summary && (
                                                        <span className="text-[11px] text-slate-400 truncate max-w-xs">
                                                            • {item.summary}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-4 py-4">
                                                {item.badge ? (
                                                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-[10px] font-black uppercase">
                                                        {item.badge}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </td>

                                            <td className="px-4 py-4">
                                                <span className="font-bold text-slate-700">
                                                    {steps.length} Langkah
                                                </span>
                                            </td>

                                            <td className="px-4 py-4">
                                                <span className="text-[11px] font-semibold text-slate-600">
                                                    {item.targetRole || "ALL"}
                                                </span>
                                            </td>

                                            <td className="px-4 py-4 text-center">
                                                {isAdmin ? (
                                                    <button
                                                        onClick={() => handleToggleActive(item)}
                                                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                                            item.isActive 
                                                                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" 
                                                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                                        }`}
                                                    >
                                                        {item.isActive ? "Aktif" : "Nonaktif"}
                                                    </button>
                                                ) : (
                                                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                                                        item.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                                                    }`}>
                                                        {item.isActive ? "Aktif" : "Nonaktif"}
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-4 py-4 text-center">
                                                {item.isPinned ? (
                                                    <span className="inline-flex items-center gap-1 text-amber-600 font-black text-[10px] bg-amber-50 px-2 py-0.5 rounded-full">
                                                        <Pin className="w-3 h-3" /> Pinned
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </td>

                                            <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedFlowItem(item);
                                                            setViewMode("FLOW_VIEW");
                                                        }}
                                                        className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                                                        title="Lihat Diagram"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>

                                                    {isAdmin && (
                                                        <>
                                                            <button
                                                                onClick={() => handleOpenEditForm(item)}
                                                                className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors"
                                                                title="Edit Konten"
                                                            >
                                                                <Edit3 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(item)}
                                                                className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                                                                title="Hapus Konten"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* VIEW 3: IN-PAGE CONTENT & STEP BUILDER EDITOR                   */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {viewMode === "EDITOR" && isAdmin && (
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setViewMode("FLOW_VIEW")}
                                className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                                    {editingItem ? "Edit Konten & Alur Operasional" : "Buat Konten & Alur Baru"}
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Konfigurasi judul, kategori, tahapan flowchart alur proses, dan target publikasi ke dashboard.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setViewMode("FLOW_VIEW")}
                                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSaveForm}
                                disabled={isPending}
                                className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                <span>{isPending ? "Menyimpan..." : "Simpan Perubahan"}</span>
                            </button>
                        </div>
                    </div>

                    {/* Main Form Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Title */}
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                                Judul Alur / Konten <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formTitle}
                                onChange={(e) => setFormTitle(e.target.value)}
                                placeholder="Contoh: Alur Muatan & Jadwal Pengiriman Truk (Loading Dock)"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>

                        {/* Category */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                                Kategori
                            </label>
                            <select
                                value={formCategory}
                                onChange={(e) => setFormCategory(e.target.value as any)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-hidden"
                            >
                                <option value="FLOW_KEGIATAN">FLOW_KEGIATAN (Alur Proses Bisnis)</option>
                                <option value="JADWAL_PENGIRIMAN">JADWAL_PENGIRIMAN (Informasi Jadwal Pengiriman)</option>
                                <option value="PENGUMUMAN">PENGUMUMAN (Pengumuman Operasional)</option>
                                <option value="SOP">SOP (Standar Operasional Prosedur)</option>
                            </select>
                        </div>

                        {/* Badge Label */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                                Label Badge
                            </label>
                            <input
                                type="text"
                                value={formBadge}
                                onChange={(e) => setFormBadge(e.target.value)}
                                placeholder="Contoh: LOGISTIK, OPERASIONAL, GUDANG"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-hidden"
                            />
                        </div>

                        {/* Summary */}
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                                Ringkasan Singkat (Muncul di Kartu & Banner)
                            </label>
                            <input
                                type="text"
                                value={formSummary}
                                onChange={(e) => setFormSummary(e.target.value)}
                                placeholder="Jelaskan secara ringkas maksud dan tujuan alur ini..."
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden"
                            />
                        </div>

                        {/* Theme Color & Target Role */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                                Tema Warna Kartu
                            </label>
                            <select
                                value={formColorTheme}
                                onChange={(e) => setFormColorTheme(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-hidden"
                            >
                                <option value="indigo">Indigo (Default Operasional)</option>
                                <option value="blue">Blue (Sales & Distribusi)</option>
                                <option value="emerald">Emerald (Selesai & Standar)</option>
                                <option value="amber">Amber (Logistik & Driver)</option>
                                <option value="purple">Purple (Pengadaan / Purchasing)</option>
                                <option value="rose">Rose (Peringatan / Retur)</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                                Target Role Divisi
                            </label>
                            <select
                                value={formTargetRole}
                                onChange={(e) => setFormTargetRole(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-hidden"
                            >
                                <option value="ALL">Semua Pengguna (ALL)</option>
                                <option value="WAREHOUSE">Warehouse / Gudang</option>
                                <option value="SALES">Sales / Penjualan</option>
                                <option value="PURCHASE">Purchase / Pengadaan</option>
                                <option value="FINANCE">Finance / Keuangan</option>
                            </select>
                        </div>

                        {/* Direct Link Options */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                                URL Tombol Pintasan Cepat
                            </label>
                            <input
                                type="text"
                                value={formLinkUrl}
                                onChange={(e) => setFormLinkUrl(e.target.value)}
                                placeholder="Contoh: /warehouse/jadwal-pengiriman atau /delivery"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                                Teks Tombol Pintasan Cepat
                            </label>
                            <input
                                type="text"
                                value={formLinkText}
                                onChange={(e) => setFormLinkText(e.target.value)}
                                placeholder="Contoh: Buka Jadwal Pengiriman"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-hidden"
                            />
                        </div>

                        {/* Visibility & Pin Toggles */}
                        <div className="flex items-center gap-6 md:col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formIsActive}
                                    onChange={(e) => setFormIsActive(e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                                />
                                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                                    Tampilkan di Dashboard (Aktif)
                                </span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formIsPinned}
                                    onChange={(e) => setFormIsPinned(e.target.checked)}
                                    className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                                />
                                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                                    Jadikan Sorotan Utama (Pin ke Header)
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Step Builder (Flowchart Steps) */}
                    <div className="border-t border-slate-100 pt-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-indigo-600" />
                                    Builder Tahapan Alur Proses (Flow Steps)
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Tambahkan tahapan kegiatan agar membentuk diagram alur step-by-step yang mudah dipahami.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleAddStep}
                                className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                            >
                                + Tambah Langkah
                            </button>
                        </div>

                        <div className="space-y-3">
                            {formSteps.map((step, sIdx) => (
                                <div 
                                    key={sIdx}
                                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                                                {sIdx + 1}
                                            </span>
                                            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                                                Tahap {sIdx + 1}
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleRemoveStep(sIdx)}
                                            className="text-xs text-rose-600 hover:text-rose-800 font-bold"
                                        >
                                            Hapus Langkah
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-500">Judul Langkah</label>
                                            <input
                                                type="text"
                                                value={step.title}
                                                onChange={(e) => handleUpdateStep(sIdx, "title", e.target.value)}
                                                placeholder="Contoh: Check List Order Masuk"
                                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-500">Tautan Modul (Opsional)</label>
                                            <input
                                                type="text"
                                                value={step.linkUrl || ""}
                                                onChange={(e) => handleUpdateStep(sIdx, "linkUrl", e.target.value)}
                                                placeholder="/sales atau /delivery"
                                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                                            />
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label className="text-[10px] font-black uppercase text-slate-500">Petunjuk Pelaksanaan</label>
                                            <textarea
                                                rows={2}
                                                value={step.desc}
                                                onChange={(e) => handleUpdateStep(sIdx, "desc", e.target.value)}
                                                placeholder="Instruksi kerja singkat untuk tahap ini..."
                                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Detailed Content / SOP Textarea */}
                    <div className="border-t border-slate-100 pt-6 space-y-2">
                        <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                            Uraian Lengkap SOP / Petunjuk Teknis (Opsional)
                        </label>
                        <textarea
                            rows={6}
                            value={formContent}
                            onChange={(e) => setFormContent(e.target.value)}
                            placeholder="Tuliskan petunjuk operasional lengkap, poin penting, atau nomor kontak darurat..."
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-sans focus:outline-hidden"
                        />
                    </div>

                    {/* Submit Bar */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setViewMode("FLOW_VIEW")}
                            className="px-5 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveForm}
                            disabled={isPending}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50"
                        >
                            {isPending ? "Menyimpan..." : "Simpan Konten"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
