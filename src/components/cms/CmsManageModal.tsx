"use client";

import React, { useState } from "react";
import { 
    X, Plus, Trash2, Edit3, Check, Eye, EyeOff, 
    Truck, Calendar, Activity, Package, AlertCircle, 
    Info, CheckCircle2, ArrowRight, Pin, Layers, Sparkles
} from "lucide-react";
import { CmsItem, CmsStep, parseCmsSteps } from "@/lib/cms-defaults";
import { callAction } from "@/proxy";

interface CmsManageModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: CmsItem[];
    onRefresh: () => Promise<void>;
}

const CATEGORY_OPTIONS = [
    { value: "FLOW_KEGIATAN", label: "Alur Kegiatan (Workflow)", badge: "FLOW" },
    { value: "JADWAL_PENGIRIMAN", label: "Informasi Jadwal Pengiriman", badge: "JADWAL" },
    { value: "PENGUMUMAN", label: "Pengumuman / Bulletin", badge: "PENGUMUMAN" },
    { value: "SOP", label: "SOP Operasional", badge: "SOP" }
];

const COLOR_OPTIONS = [
    { value: "indigo", label: "Indigo", bgClass: "bg-indigo-600" },
    { value: "blue", label: "Blue", bgClass: "bg-blue-600" },
    { value: "emerald", label: "Emerald", bgClass: "bg-emerald-600" },
    { value: "amber", label: "Amber", bgClass: "bg-amber-600" },
    { value: "purple", label: "Purple", bgClass: "bg-purple-600" },
    { value: "rose", label: "Rose", bgClass: "bg-rose-600" }
];

const ICON_OPTIONS = [
    { value: "Truck", label: "Truk", Icon: Truck },
    { value: "Calendar", label: "Kalender", Icon: Calendar },
    { value: "Activity", label: "Alur / Aktivitas", Icon: Activity },
    { value: "Package", label: "Paket / Barang", Icon: Package },
    { value: "AlertCircle", label: "Peringatan", Icon: AlertCircle },
    { value: "Info", label: "Informasi", Icon: Info }
];

export function CmsManageModal({ isOpen, onClose, items, onRefresh }: CmsManageModalProps) {
    const [viewMode, setViewMode] = useState<"LIST" | "FORM">("LIST");
    const [editingItem, setEditingItem] = useState<CmsItem | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);

    // Form states
    const [formTitle, setFormTitle] = useState("");
    const [formCategory, setFormCategory] = useState<string>("FLOW_KEGIATAN");
    const [formBadge, setFormBadge] = useState("");
    const [formSummary, setFormSummary] = useState("");
    const [formContent, setFormContent] = useState("");
    const [formLinkUrl, setFormLinkUrl] = useState("");
    const [formLinkText, setFormLinkText] = useState("");
    const [formColorTheme, setFormColorTheme] = useState("indigo");
    const [formIcon, setFormIcon] = useState("Truck");
    const [formIsPinned, setFormIsPinned] = useState(false);
    const [formIsActive, setFormIsActive] = useState(true);
    const [formPriority, setFormPriority] = useState<number>(0);
    const [formSteps, setFormSteps] = useState<CmsStep[]>([]);

    if (!isOpen) return null;

    const handleOpenCreateForm = () => {
        setEditingItem(null);
        setFormTitle("");
        setFormCategory("FLOW_KEGIATAN");
        setFormBadge("LOGISTIK & DISTRIBUSI");
        setFormSummary("");
        setFormContent("");
        setFormLinkUrl("/warehouse/jadwal-pengiriman");
        setFormLinkText("Buka Modul");
        setFormColorTheme("indigo");
        setFormIcon("Truck");
        setFormIsPinned(false);
        setFormIsActive(true);
        setFormPriority(0);
        setFormSteps([
            { stepNumber: 1, title: "Langkah 1", desc: "Deskripsi langkah pertama", linkUrl: "", linkText: "" }
        ]);
        setViewMode("FORM");
    };

    const handleOpenEditForm = (item: CmsItem) => {
        setEditingItem(item);
        setFormTitle(item.title || "");
        setFormCategory(item.category || "FLOW_KEGIATAN");
        setFormBadge(item.badge || "");
        setFormSummary(item.summary || "");
        setFormContent(item.content || "");
        setFormLinkUrl(item.linkUrl || "");
        setFormLinkText(item.linkText || "");
        setFormColorTheme(item.colorTheme || "indigo");
        setFormIcon(item.icon || "Truck");
        setFormIsPinned(Boolean(item.isPinned));
        setFormIsActive(Boolean(item.isActive));
        setFormPriority(Number(item.priority) || 0);
        setFormSteps(parseCmsSteps(item.steps));
        setViewMode("FORM");
    };

    const handleAddStep = () => {
        setFormSteps(prev => [
            ...prev,
            {
                stepNumber: prev.length + 1,
                title: `Langkah ${prev.length + 1}`,
                desc: "",
                linkUrl: "",
                linkText: ""
            }
        ]);
    };

    const handleRemoveStep = (index: number) => {
        setFormSteps(prev => prev.filter((_, idx) => idx !== index));
    };

    const handleStepChange = (index: number, field: keyof CmsStep, value: any) => {
        setFormSteps(prev => prev.map((step, idx) => {
            if (idx === index) {
                return { ...step, [field]: value };
            }
            return step;
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formTitle.trim()) {
            alert("Judul konten tidak boleh kosong!");
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                title: formTitle,
                category: formCategory,
                badge: formBadge,
                summary: formSummary,
                content: formContent,
                linkUrl: formLinkUrl,
                linkText: formLinkText,
                colorTheme: formColorTheme,
                icon: formIcon,
                isPinned: formIsPinned,
                isActive: formIsActive,
                priority: formPriority,
                steps: formSteps.length > 0 ? JSON.stringify(formSteps) : null
            };

            if (editingItem && !editingItem.id.startsWith("default-")) {
                await callAction("updateCmsContent", editingItem.id, payload);
            } else {
                await callAction("createCmsContent", payload);
            }

            await onRefresh();
            setFeedback("Konten berhasil disimpan ke Dashboard!");
            setTimeout(() => setFeedback(null), 4000);
            setViewMode("LIST");
        } catch (err: any) {
            console.error("Gagal menyimpan CMS:", err);
            alert("Gagal menyimpan: " + (err.message || String(err)));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, title: string) => {
        const confirmDelete = window.confirm(`Apakah Anda yakin ingin menghapus konten "${title}" dari Dashboard?`);
        if (!confirmDelete) return;

        try {
            await callAction("deleteCmsContent", id);
            await onRefresh();
            setFeedback(`Konten "${title}" berhasil dihapus.`);
            setTimeout(() => setFeedback(null), 4000);
        } catch (err: any) {
            console.error("Gagal menghapus CMS:", err);
            alert("Gagal menghapus: " + (err.message || String(err)));
        }
    };

    const handleToggleActive = async (id: string) => {
        try {
            await callAction("toggleCmsContentActive", id);
            await onRefresh();
        } catch (err: any) {
            console.error("Gagal mengubah status aktif:", err);
            alert("Gagal mengubah status: " + (err.message || String(err)));
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
                {/* Modal Header */}
                <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
                            <Layers className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight">
                                    CMS Pengelola Konten & Alur Kegiatan Dashboard
                                </h2>
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 uppercase">
                                    Admin Center
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">
                                Atur informasi jadwal pengiriman, alur kegiatan operasional, dan pengumuman yang muncul di Dashboard.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all cursor-pointer"
                        title="Tutup Modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Feedback Banner */}
                {feedback && (
                    <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-black flex items-center gap-2 px-5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>{feedback}</span>
                    </div>
                )}

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {viewMode === "LIST" ? (
                        <div className="space-y-4">
                            {/* Action Bar */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                <div>
                                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                                        Daftar Konten Aktif & Alur Kegiatan ({items.length})
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Konten dengan status Aktif akan otomatis ditampilkan pada widget Dashboard.
                                    </p>
                                </div>
                                <button
                                    onClick={handleOpenCreateForm}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 cursor-pointer self-start sm:self-center"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Tambah Konten / Alur Baru</span>
                                </button>
                            </div>

                            {/* Item Cards List */}
                            <div className="space-y-3">
                                {items.map((item) => {
                                    const steps = parseCmsSteps(item.steps);
                                    return (
                                        <div
                                            key={item.id}
                                            className={`p-4 rounded-2xl border transition-all ${
                                                item.isActive 
                                                    ? "bg-white border-slate-200 shadow-xs hover:border-indigo-300" 
                                                    : "bg-slate-50 border-slate-200/60 opacity-60"
                                            }`}
                                        >
                                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                                                <div className="space-y-1.5 flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {item.isPinned && (
                                                            <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                                <Pin className="w-2.5 h-2.5" /> Pinned
                                                            </span>
                                                        )}
                                                        <span className="bg-slate-100 text-slate-700 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                                                            {item.category.replace("_", " ")}
                                                        </span>
                                                        {item.badge && (
                                                            <span className="bg-indigo-50 text-indigo-700 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase">
                                                                {item.badge}
                                                            </span>
                                                        )}
                                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                                            item.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                                                        }`}>
                                                            {item.isActive ? "Tampil di Dashboard" : "Non-aktif (Draft)"}
                                                        </span>
                                                    </div>

                                                    <h4 className="text-sm font-black text-slate-900">
                                                        {item.title}
                                                    </h4>
                                                    <p className="text-xs text-slate-500 line-clamp-2">
                                                        {item.summary || item.content}
                                                    </p>

                                                    {/* Steps preview badge */}
                                                    {steps.length > 0 && (
                                                        <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase">
                                                                Langkah Alur ({steps.length}):
                                                            </span>
                                                            {steps.map((st, sIdx) => (
                                                                <span 
                                                                    key={sIdx} 
                                                                    className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200"
                                                                >
                                                                    {st.title}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-1.5 shrink-0 pt-2 md:pt-0">
                                                    <button
                                                        onClick={() => handleToggleActive(item.id)}
                                                        className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                            item.isActive 
                                                                ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100" 
                                                                : "text-slate-500 bg-slate-100 hover:bg-slate-200"
                                                        }`}
                                                        title={item.isActive ? "Sembunyikan dari Dashboard" : "Tampilkan di Dashboard"}
                                                    >
                                                        {item.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenEditForm(item)}
                                                        className="p-2 rounded-xl text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-all cursor-pointer"
                                                        title="Edit Konten"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id, item.title)}
                                                        className="p-2 rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 transition-all cursor-pointer"
                                                        title="Hapus Konten"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        /* CREATE / EDIT FORM */
                        <form onSubmit={handleSave} className="space-y-5">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <h3 className="text-sm font-black text-slate-900 uppercase">
                                    {editingItem ? `Edit Konten: ${editingItem.title}` : "Buat Konten / Alur Baru"}
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setViewMode("LIST")}
                                    className="text-xs font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                                >
                                    Kembali ke Daftar
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Title */}
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-xs font-black uppercase text-slate-700">Judul Konten / Informasi *</label>
                                    <input
                                        type="text"
                                        value={formTitle}
                                        onChange={(e) => setFormTitle(e.target.value)}
                                        placeholder="Contoh: Alur Pengiriman Barang & Loading Dock Hari Ini"
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 outline-none"
                                    />
                                </div>

                                {/* Category */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase text-slate-700">Kategori</label>
                                    <select
                                        value={formCategory}
                                        onChange={(e) => setFormCategory(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 outline-none"
                                    >
                                        {CATEGORY_OPTIONS.map(c => (
                                            <option key={c.value} value={c.value}>{c.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Badge */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase text-slate-700">Badge Label (Teks Singkat)</label>
                                    <input
                                        type="text"
                                        value={formBadge}
                                        onChange={(e) => setFormBadge(e.target.value)}
                                        placeholder="Contoh: LOGISTIK, PENGUMUMAN, SOP"
                                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 outline-none uppercase"
                                    />
                                </div>

                                {/* Color Theme */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase text-slate-700">Warna Tema</label>
                                    <div className="flex items-center gap-2">
                                        {COLOR_OPTIONS.map(c => (
                                            <button
                                                key={c.value}
                                                type="button"
                                                onClick={() => setFormColorTheme(c.value)}
                                                className={`w-7 h-7 rounded-xl ${c.bgClass} transition-all flex items-center justify-center text-white cursor-pointer ${
                                                    formColorTheme === c.value ? "ring-2 ring-offset-2 ring-indigo-600 scale-110 shadow-xs" : "opacity-70 hover:opacity-100"
                                                }`}
                                                title={c.label}
                                            >
                                                {formColorTheme === c.value && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Icon Option */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase text-slate-700">Ikon Konten</label>
                                    <div className="flex items-center gap-2">
                                        {ICON_OPTIONS.map(i => {
                                            const IconComp = i.Icon;
                                            return (
                                                <button
                                                    key={i.value}
                                                    type="button"
                                                    onClick={() => setFormIcon(i.value)}
                                                    className={`p-2 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${
                                                        formIcon === i.value 
                                                            ? "bg-indigo-50 border-indigo-600 text-indigo-700 shadow-xs scale-105" 
                                                            : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                                                    }`}
                                                    title={i.label}
                                                >
                                                    <IconComp className="w-4 h-4" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Summary */}
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-xs font-black uppercase text-slate-700">Ringkasan Singkat</label>
                                    <input
                                        type="text"
                                        value={formSummary}
                                        onChange={(e) => setFormSummary(e.target.value)}
                                        placeholder="Ringkasan 1-2 kalimat untuk pratinjau..."
                                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 outline-none"
                                    />
                                </div>

                                {/* Detail Content */}
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-xs font-black uppercase text-slate-700">Isi Deskripsi / Catatan Lengkap</label>
                                    <textarea
                                        rows={3}
                                        value={formContent}
                                        onChange={(e) => setFormContent(e.target.value)}
                                        placeholder="Tuliskan keterangan lengkap atau arahan operasional..."
                                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 outline-none"
                                    />
                                </div>

                                {/* Direct Action Link */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase text-slate-700">Tautan Tombol Cepat (URL Modul)</label>
                                    <input
                                        type="text"
                                        value={formLinkUrl}
                                        onChange={(e) => setFormLinkUrl(e.target.value)}
                                        placeholder="Contoh: /warehouse/jadwal-pengiriman"
                                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 outline-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase text-slate-700">Label Teks Tombol</label>
                                    <input
                                        type="text"
                                        value={formLinkText}
                                        onChange={(e) => setFormLinkText(e.target.value)}
                                        placeholder="Contoh: Buka Jadwal Pengiriman"
                                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 outline-none"
                                    />
                                </div>

                                {/* Options: Pin & Active */}
                                <div className="flex items-center gap-6 md:col-span-2 pt-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formIsPinned}
                                            onChange={(e) => setFormIsPinned(e.target.checked)}
                                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-xs font-bold text-slate-800">Pin di Banner Atas (Utama)</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formIsActive}
                                            onChange={(e) => setFormIsActive(e.target.checked)}
                                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-xs font-bold text-slate-800">Aktif (Tampilkan di Dashboard)</span>
                                    </label>
                                </div>
                            </div>

                            {/* STEPS FLOW BUILDER */}
                            <div className="pt-4 border-t border-slate-200 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                                            Tahapan / Langkah Alur Kegiatan ({formSteps.length})
                                        </h4>
                                        <p className="text-[11px] text-slate-500">
                                            Opsional: Anda bisa membuat diagram alur langkah 1, 2, 3 berurutan yang bisa diklik staf.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddStep}
                                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>+ Tambah Langkah</span>
                                    </button>
                                </div>

                                <div className="space-y-2.5">
                                    {formSteps.map((step, idx) => (
                                        <div 
                                            key={idx} 
                                            className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-2.5"
                                        >
                                            <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black shrink-0">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                <input
                                                    type="text"
                                                    value={step.title}
                                                    onChange={(e) => handleStepChange(idx, "title", e.target.value)}
                                                    placeholder="Judul Langkah (misal: 1. Input SO)"
                                                    className="bg-white border border-slate-200 focus:border-indigo-600 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none"
                                                />
                                                <input
                                                    type="text"
                                                    value={step.desc}
                                                    onChange={(e) => handleStepChange(idx, "desc", e.target.value)}
                                                    placeholder="Deskripsi ringkas..."
                                                    className="bg-white border border-slate-200 focus:border-indigo-600 rounded-lg px-2.5 py-1.5 text-xs outline-none"
                                                />
                                                <input
                                                    type="text"
                                                    value={step.linkUrl || ""}
                                                    onChange={(e) => handleStepChange(idx, "linkUrl", e.target.value)}
                                                    placeholder="URL Modul (misal: /sales)"
                                                    className="bg-white border border-slate-200 focus:border-indigo-600 rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveStep(idx)}
                                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all self-end sm:self-center cursor-pointer"
                                                title="Hapus Langkah"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Form Footer */}
                            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setViewMode("LIST")}
                                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    {isSaving ? "Menyimpan..." : "Simpan Konten"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
