"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
    Truck, Warehouse, Package, ShoppingBag, ShoppingCart, 
    Calendar, Clock, CheckCircle2, AlertCircle, ArrowRight, 
    ExternalLink, Layers, ShieldCheck, UserCheck, CreditCard, 
    Store, MapPin, ChevronRight, Activity, Sparkles, Filter, 
    FileText, RefreshCw, Box
} from "lucide-react";
import { OFFICIAL_FLEET, getFleetByDriverOrPlate } from "@/lib/fleet";

interface DailyOperationsCommandCenterProps {
    dailyReport: any;
    todayShipping?: any[];
    role?: string;
    traceabilityData?: any;
    cmsItems?: any[];
}

export function DailyOperationsCommandCenter({
    dailyReport,
    todayShipping = [],
    role,
    traceabilityData,
    cmsItems = []
}: DailyOperationsCommandCenterProps) {
    const { sales = [], purchases = [], operational = [], requests = [] } = dailyReport || {};

    const [activeTab, setActiveTab] = useState<"LOADING_DOCK" | "SUPPLIER_LPB" | "SALES" | "OPERASIONAL">("LOADING_DOCK");
    const [currentTime, setCurrentTime] = useState<string>("");

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " WIB");
        };
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    // Format current date in Indonesian
    const todayFormatted = new Date().toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });

    // Counts for today's operational metrics
    const shippingDeliveries = todayShipping.length > 0 ? todayShipping : sales;
    const loadingDockCount = shippingDeliveries.length;
    const purchasesCount = purchases.length;
    const operationalCount = operational.length;
    const pendingOrdersCount = traceabilityData?.soSummary?.open || 0;
    const partialOrdersCount = traceabilityData?.soSummary?.partial || 0;

    return (
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/40 space-y-6 p-5 sm:p-7">
            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 1. KOP RESMI PERUSAHAAN & LOGISTIK GUDANG                        */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 shadow-md border border-slate-800">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    {/* Brand & Loading Dock Info */}
                    <div className="flex items-center gap-4 sm:gap-5">
                        <div className="h-16 w-16 sm:h-20 sm:w-20 bg-white rounded-2xl flex items-center justify-center p-2.5 shadow-2xl shrink-0 border border-white/20">
                            <img 
                                src="/image/logokoboi.png" 
                                alt="Logo PT. Kola Borasi Indonesia" 
                                className="h-full w-auto object-contain"
                                onError={(e) => {
                                    (e.target as any).src = "/logo.png";
                                }}
                            />
                        </div>

                        <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 bg-amber-500 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                                    <Truck className="w-3 h-3" /> Logistik Gudang
                                </span>
                                <span className="bg-indigo-500/30 text-indigo-200 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase border border-indigo-400/30">
                                    Pusat Operasional Harian
                                </span>
                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                    <span>Live Monitoring</span>
                                </span>
                            </div>

                            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase leading-snug">
                                PT. Kola Borasi Indonesia
                            </h1>

                            <p className="text-xs sm:text-sm font-bold text-indigo-200 flex items-center gap-1.5 flex-wrap">
                                <span>Pemuatan Barang ke Kendaraan (Loading Dock)</span>
                                <span className="text-slate-400">•</span>
                                <span className="text-slate-300 font-semibold">{todayFormatted}</span>
                                {currentTime && (
                                    <>
                                        <span className="text-slate-400">•</span>
                                        <span className="text-amber-300 font-mono text-xs">{currentTime}</span>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Quick Action Navigation Buttons */}
                    <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center border-t lg:border-t-0 pt-3 lg:pt-0 border-white/10">
                        <Link
                            href="/warehouse/jadwal-pengiriman"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
                        >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Jadwal Pengiriman</span>
                        </Link>

                        <Link
                            href="/warehouse"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-white/10"
                        >
                            <Warehouse className="w-3.5 h-3.5 text-blue-400" />
                            <span>Gudang (LPB)</span>
                        </Link>

                        <Link
                            href="/cms"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
                        >
                            <Layers className="w-3.5 h-3.5 text-indigo-200" />
                            <span>Modul CMS & SOP</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 2. VISUAL FLOW KEGIATAN HARI INI (LIVE PIPELINE OPERASIONAL)     */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-600" />
                        <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
                            Flow Kegiatan Operasional Berjalan Hari Ini
                        </h2>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400">
                        Alur Terintegrasi: Penjualan → Supplier → Gudang → Kirim
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {/* Step 1: Penjualan / Sales Order */}
                    <div 
                        onClick={() => setActiveTab("SALES")}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            activeTab === "SALES"
                                ? "bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20 shadow-sm"
                                : "bg-slate-50/60 hover:bg-blue-50/40 border-slate-200/80"
                        }`}
                    >
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                                    1
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                                    Penjualan
                                </span>
                            </div>
                            <h3 className="text-xs font-black text-slate-900">
                                Order Buyer Masuk
                            </h3>
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                                Permintaan order dari buyer siap dijadwalkan pengiriman.
                            </p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-black text-blue-700">
                            <span>{pendingOrdersCount + partialOrdersCount} SO Aktif</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                    </div>

                    {/* Step 2: Muat Barang di Supplier (Pengadaan LPB) */}
                    <div 
                        onClick={() => setActiveTab("SUPPLIER_LPB")}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            activeTab === "SUPPLIER_LPB"
                                ? "bg-purple-50/80 border-purple-400 ring-2 ring-purple-500/20 shadow-sm"
                                : "bg-slate-50/60 hover:bg-purple-50/40 border-slate-200/80"
                        }`}
                    >
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center">
                                    2
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                                    Supplier
                                </span>
                            </div>
                            <h3 className="text-xs font-black text-slate-900">
                                Muat di Supplier (LPB)
                            </h3>
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                                Pengambilan barang supplier & penerimaan masuk gudang.
                            </p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-black text-purple-700">
                            <span>{purchasesCount} LPB Masuk Hari Ini</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                    </div>

                    {/* Step 3: Pemuatan Barang ke Kendaraan (Loading Dock) */}
                    <div 
                        onClick={() => setActiveTab("LOADING_DOCK")}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            activeTab === "LOADING_DOCK"
                                ? "bg-amber-50/80 border-amber-400 ring-2 ring-amber-500/20 shadow-sm"
                                : "bg-slate-50/60 hover:bg-amber-50/40 border-slate-200/80"
                        }`}
                    >
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                                    3
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                                    Loading Dock
                                </span>
                            </div>
                            <h3 className="text-xs font-black text-slate-900">
                                Pemuatan Kendaraan
                            </h3>
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                                Pengecekan fisik barang, penugasan sopir, & plat armada.
                            </p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-black text-amber-700">
                            <span>{loadingDockCount} Pengiriman Hari Ini</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                    </div>

                    {/* Step 4: Pengiriman Berangkat (Surat Jalan) */}
                    <div 
                        onClick={() => setActiveTab("LOADING_DOCK")}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            activeTab === "LOADING_DOCK"
                                ? "bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-500/20 shadow-sm"
                                : "bg-slate-50/60 hover:bg-indigo-50/40 border-slate-200/80"
                        }`}
                    >
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                                    4
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                                    Surat Jalan
                                </span>
                            </div>
                            <h3 className="text-xs font-black text-slate-900">
                                Armada Berangkat
                            </h3>
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                                Surat Jalan cetak A4 resmi & monitoring perjalanan buyer.
                            </p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-black text-indigo-700">
                            <span>{sales.length} SJ Keluar</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                    </div>

                    {/* Step 5: Keuangan & Biaya Operasional */}
                    <div 
                        onClick={() => setActiveTab("OPERASIONAL")}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            activeTab === "OPERASIONAL"
                                ? "bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20 shadow-sm"
                                : "bg-slate-50/60 hover:bg-emerald-50/40 border-slate-200/80"
                        }`}
                    >
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                                    5
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                                    Fin & Ops
                                </span>
                            </div>
                            <h3 className="text-xs font-black text-slate-900">
                                Biaya & Tagihan
                            </h3>
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                                Pengajuan operasional armada, BBM, tol, & invoice buyer.
                            </p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-black text-emerald-700">
                            <span>{operationalCount} Trx Operasional</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 3. SUB-TABS & DETAIL AKTIVITAS HARI INI                         */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div className="space-y-4 pt-2">
                {/* Navigation Pills */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 flex-wrap">
                    <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-100 rounded-xl">
                        <button
                            onClick={() => setActiveTab("LOADING_DOCK")}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                                activeTab === "LOADING_DOCK"
                                    ? "bg-amber-500 text-slate-950 shadow-xs"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Pemuatan Kendaraan ({loadingDockCount})</span>
                        </button>

                        <button
                            onClick={() => setActiveTab("SUPPLIER_LPB")}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                                activeTab === "SUPPLIER_LPB"
                                    ? "bg-purple-600 text-white shadow-xs"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            <Warehouse className="w-3.5 h-3.5" />
                            <span>Muat di Supplier / LPB ({purchasesCount})</span>
                        </button>

                        <button
                            onClick={() => setActiveTab("SALES")}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                                activeTab === "SALES"
                                    ? "bg-blue-600 text-white shadow-xs"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Penjualan / SO ({pendingOrdersCount + partialOrdersCount})</span>
                        </button>

                        <button
                            onClick={() => setActiveTab("OPERASIONAL")}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                                activeTab === "OPERASIONAL"
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Operasional & PR ({operationalCount + requests.length})</span>
                        </button>
                    </div>

                    <Link
                        href="/warehouse/jadwal-pengiriman"
                        className="text-xs font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                    >
                        <span>Kelola Jadwal & Muatan Lengkap</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>

                {/* ───────────────────────────────────────────────────────────── */}
                {/* TAB 1: PEMUATAN KENDARAAN (LOADING DOCK)                      */}
                {/* ───────────────────────────────────────────────────────────── */}
                {activeTab === "LOADING_DOCK" && (
                    <div className="space-y-4">
                        {shippingDeliveries.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                {shippingDeliveries.map((item: any, idx: number) => {
                                    const driverName = (item.driver || item.vehicleNumber || "DRIVER").toUpperCase();
                                    const fleet = getFleetByDriverOrPlate(driverName) || getFleetByDriverOrPlate(item.vehiclePlate || "");
                                    const itemsList = item.items || [];
                                    const totalQty = itemsList.reduce((acc: number, it: any) => acc + (Number(it.quantity) || 0), 0);

                                    return (
                                        <div 
                                            key={item.id || idx}
                                            className="p-4 rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/30 to-white hover:shadow-md transition-all space-y-3"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-900 text-white">
                                                    {item.deliveryNumber || `SJ-${idx + 1}`}
                                                </span>
                                                <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                                                    Dimuat Hari Ini
                                                </span>
                                            </div>

                                            <div>
                                                <h4 className="text-sm font-black text-slate-900 truncate">
                                                    {item.buyerName || "Buyer Umum"}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs font-black text-slate-700 flex items-center gap-1">
                                                        <Truck className="w-3 h-3 text-amber-600" />
                                                        {driverName}
                                                    </span>
                                                    {fleet?.plate && (
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                                            {fleet.plate}
                                                        </span>
                                                    )}
                                                </div>
                                                {fleet?.etoll && (
                                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                        E-TOLL: {fleet.etoll}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Items being loaded */}
                                            {itemsList.length > 0 && (
                                                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                                        Muatan ({itemsList.length} item • {totalQty} unit):
                                                    </p>
                                                    {itemsList.slice(0, 2).map((it: any, iIdx: number) => (
                                                        <p key={iIdx} className="text-xs font-semibold text-slate-700 truncate">
                                                            • {it.productName || it.product?.name || "Produk"} ({it.quantity} {it.uom || "UNIT"})
                                                        </p>
                                                    ))}
                                                    {itemsList.length > 2 && (
                                                        <p className="text-[10px] font-bold text-slate-400">
                                                            + {itemsList.length - 2} item lainnya
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            <div className="pt-1 flex items-center justify-between">
                                                <Link
                                                    href={`/delivery`}
                                                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                                >
                                                    <span>Buka Surat Jalan</span>
                                                    <ExternalLink className="w-3 h-3" />
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                            Armada Resmi Standby Siap Pemuatan Barang (Loading Dock)
                                        </h4>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Belum ada pencatatan surat jalan keluar hari ini. 5 armada resmi siap tugas:
                                        </p>
                                    </div>

                                    <Link
                                        href="/warehouse/jadwal-pengiriman"
                                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 self-start sm:self-center"
                                    >
                                        + Buat Penugasan Muatan
                                    </Link>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                                    {OFFICIAL_FLEET.map((f, fIdx) => (
                                        <div key={fIdx} className="p-3 bg-white rounded-xl border border-slate-200 text-center space-y-1">
                                            <p className="text-xs font-black text-slate-900">🚚 {f.driver}</p>
                                            <p className="text-[11px] font-bold text-slate-600">{f.plate}</p>
                                            <p className="text-[9px] text-slate-400 font-mono truncate" title={f.etoll}>
                                                Tol: {f.etoll.slice(-8)}
                                            </p>
                                            <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-black rounded uppercase">
                                                Standby
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ───────────────────────────────────────────────────────────── */}
                {/* TAB 2: MUAT BARANG DI SUPPLIER & PENERIMAAN (LPB)              */}
                {/* ───────────────────────────────────────────────────────────── */}
                {activeTab === "SUPPLIER_LPB" && (
                    <div className="space-y-4">
                        {purchases.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                {purchases.map((p: any, idx: number) => {
                                    const itemsList = p.items || [];
                                    const totalQty = itemsList.reduce((acc: number, it: any) => acc + (Number(it.quantity) || 0), 0);

                                    return (
                                        <div 
                                            key={p.id || idx}
                                            className="p-4 rounded-2xl border border-purple-200/80 bg-gradient-to-b from-purple-50/30 to-white space-y-3"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-purple-900 text-white">
                                                    {p.receiptNumber || `LPB-${idx + 1}`}
                                                </span>
                                                <span className="text-[10px] font-black text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                                                    Masuk Hari Ini
                                                </span>
                                            </div>

                                            <div>
                                                <h4 className="text-sm font-black text-slate-900 truncate">
                                                    {p.receivedFrom || p.supplierName || "Supplier Mitra"}
                                                </h4>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    Penerima: {p.createdBy?.name || "Staff Gudang"}
                                                </p>
                                            </div>

                                            {itemsList.length > 0 && (
                                                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                                        Barang Diterima ({itemsList.length} item • {totalQty} unit):
                                                    </p>
                                                    {itemsList.slice(0, 2).map((it: any, iIdx: number) => (
                                                        <p key={iIdx} className="text-xs font-semibold text-slate-700 truncate">
                                                            • {it.product?.name || "Bahan Baku"} ({it.quantity} {it.uom || "KG"})
                                                        </p>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="pt-1 flex items-center justify-between">
                                                <Link
                                                    href={`/purchase`}
                                                    className="text-[11px] font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1"
                                                >
                                                    <span>Lihat Detail LPB</span>
                                                    <ExternalLink className="w-3 h-3" />
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 space-y-2">
                                <Warehouse className="w-8 h-8 mx-auto text-purple-400" />
                                <h4 className="text-xs font-black text-slate-800 uppercase">
                                    Belum Ada Penerimaan Barang Masuk (LPB) dari Supplier Hari Ini
                                </h4>
                                <p className="text-xs text-slate-500 max-w-md mx-auto">
                                    Catat penerimaan fisik barang dari supplier ke gudang melalui modul pembelian.
                                </p>
                                <Link
                                    href="/purchase"
                                    className="inline-block mt-2 px-4 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-bold"
                                >
                                    Buka Modul Pembelian (LPB)
                                </Link>
                            </div>
                        )}
                    </div>
                )}

                {/* ───────────────────────────────────────────────────────────── */}
                {/* TAB 3: PENJUALAN (SALES ORDER)                                 */}
                {/* ───────────────────────────────────────────────────────────── */}
                {activeTab === "SALES" && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-600">
                                Ringkasan Status Sales Order Berjalan
                            </h4>
                            <Link
                                href="/sales"
                                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                                <span>Buka Modul Penjualan</span>
                                <ExternalLink className="w-3 h-3" />
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200">
                                <p className="text-[10px] font-black uppercase text-blue-700">SO Open (Belum Kirim)</p>
                                <p className="text-2xl font-black text-blue-900 mt-1">{pendingOrdersCount}</p>
                                <p className="text-[11px] text-blue-600 mt-1">Siap dialokasikan ke armada truk</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200">
                                <p className="text-[10px] font-black uppercase text-indigo-700">SO Partial (Sebagian)</p>
                                <p className="text-2xl font-black text-indigo-900 mt-1">{partialOrdersCount}</p>
                                <p className="text-[11px] text-indigo-600 mt-1">Masih dalam proses pengiriman bertahap</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200">
                                <p className="text-[10px] font-black uppercase text-emerald-700">SO Closed (Selesai)</p>
                                <p className="text-2xl font-black text-emerald-900 mt-1">{traceabilityData?.soSummary?.closed || 0}</p>
                                <p className="text-[11px] text-emerald-600 mt-1">Seluruh kuantiti telah terpenuhi</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ───────────────────────────────────────────────────────────── */}
                {/* TAB 4: OPERASIONAL & BIAYA                                     */}
                {/* ───────────────────────────────────────────────────────────── */}
                {activeTab === "OPERASIONAL" && (
                    <div className="space-y-4">
                        {operational.length > 0 || requests.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                {operational.map((op: any, idx: number) => (
                                    <div key={idx} className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/30 flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-black text-slate-900">{op.description || "Pengeluaran Operasional"}</p>
                                            <p className="text-[10px] text-slate-500 mt-0.5">Oleh: {op.createdBy?.name || "Finance"}</p>
                                        </div>
                                        <span className="text-xs font-black text-emerald-700 font-mono">
                                            Rp {(Number(op.amount) || 0).toLocaleString("id-ID")}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 text-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50">
                                <p className="text-xs font-bold text-slate-500">Belum ada pengeluaran operasional yang dicatat hari ini.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default DailyOperationsCommandCenter;
