"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Warehouse as WarehouseIcon, Layers, Trash2, FileText, Search, Activity, Box, ArrowUpRight, ArrowDownLeft, Download, Eye, Edit2 } from "lucide-react";
import { StockInputModal } from "./StockInputModal";
import { StockAdjustmentModal } from "./StockAdjustmentModal";
import { StockCardModal } from "./StockCardModal";
import { CheckerBoard } from "./CheckerBoard";
import { DashboardStats } from "../components/DashboardStats";
import { cn, formatCurrency } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { callAction } from "@/proxy";

import { format } from "date-fns";
import { exportToExcel } from "@/lib/excel";
import { ReportPreviewModal } from "@/components/ReportPreviewModal";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Link from "next/link";

export function WarehouseDashboard({ initialProducts, warehouses, unverifiedReceipts, movements }: {
    initialProducts: any[],
    warehouses: any[],
    unverifiedReceipts: any[],
    movements: any[]
}) {
    const { data: session } = useSession() as any;
    const isAdmin = session?.user?.role === "ADMIN";
    const [showInputModal, setShowInputModal] = useState(false);
    const [activeTab, setActiveTab] = useState<"inventory" | "checker">("inventory");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStockForAdjustment, setSelectedStockForAdjustment] = useState<{product: any, stock: any} | null>(null);
    const [showStockCard, setShowStockCard] = useState(false);
    const [selectedProductIdForCard, setSelectedProductIdForCard] = useState<string | undefined>(undefined);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [previewTitle, setPreviewTitle] = useState("");

    const filteredProducts = useMemo(() => {
        return initialProducts.filter(p =>
            p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [initialProducts, searchTerm]);

    const findSalesPersonForStock = (productId: string, warehouseId: string, vendorName: string) => {
        const matchingReceipt = unverifiedReceipts.find(r => 
            (r.receivedFrom || "UMUM").trim().toLowerCase() === (vendorName || "UMUM").trim().toLowerCase() && 
            r.warehouseId === warehouseId && 
            r.items?.some((item: any) => item.productId === productId)
        );
        return matchingReceipt?.salesPerson || "-";
    };

    const handleDeleteProduct = async (id: string) => {
        if (!confirm("Hapus produk ini? Semua data stok terkait juga akan dihapus.")) return;
        try {
            await callAction("deleteProduct", id);
            alert("Produk berhasil dihapus");

            window.location.reload();
        } catch (e: any) {
            alert(e.message || "Gagal menghapus produk");
        }
    };

    const handleExport = () => {
        if (activeTab === "inventory") {
            const data = filteredProducts.flatMap(p =>
                p.stocks.map((s: any) => ({
                    'SKU': p.sku,
                    'Nama Barang': p.name,
                    'Vendor / PT': s.vendorName || "UMUM",
                    'Gudang': warehouses.find(w => w.id === s.warehouseId)?.name || 'Unknown',
                    'Sales Person': findSalesPersonForStock(p.id, s.warehouseId, s.vendorName),
                    'Satuan': p.uom,
                    'Total Stok': s.quantity,
                    'HPP per Unit': Number(p.purchasePrice) || 0,
                    'Total Nilai HPP': (s.quantity || 0) * (Number(p.purchasePrice) || 0),
                    'Threshold': p.lowStockThreshold,
                    'Status': s.quantity <= p.lowStockThreshold ? 'LOW' : 'NORMAL'
                }))
            );
            exportToExcel(data, 'Laporan_Stok_Gudang', 'Inventory');
        } else {
            // Detailed LPB Export: Exports each receipt item, its quantity, and UOM/Unit, including HPP
            const data: any[] = [];
            unverifiedReceipts.forEach(r => {
                const items = r.items || [];
                items.forEach((item: any) => {
                    data.push({
                        'Tanggal': format(new Date(r.createdAt), "yyyy-MM-dd HH:mm"),
                        'No. LPB': r.receiptNumber,
                        'Supplier': r.receivedFrom,
                        'Gudang': r.warehouse?.name || "-",
                        'Sales Person': r.salesPerson || "-",
                        'SKU': item.product?.sku || "-",
                        'Nama Barang': item.product?.name || "-",
                        'Qty': item.quantity || 0,
                        'Satuan': item.uom || item.product?.uom || "-",
                        'HPP per Unit': Number(item.purchasePrice) || 0,
                        'Total Nilai HPP': (item.quantity || 0) * (Number(item.purchasePrice) || 0),
                        'Status': r.isVerified ? 'VERIFIED' : 'PENDING',
                        'Penerima': r.createdBy?.name || '-'
                    });
                });
            });
            exportToExcel(data, 'Laporan_Penerimaan_Barang_Detail_Gudang', 'Penerimaan');
        }
    };

    const handlePreview = () => {
        if (activeTab === "inventory") {
            const data = filteredProducts.flatMap(p =>
                p.stocks.map((s: any) => ({
                    'SKU': p.sku,
                    'Nama Barang': p.name,
                    'Vendor / PT': s.vendorName || "UMUM",
                    'Gudang': warehouses.find(w => w.id === s.warehouseId)?.name || 'Unknown',
                    'Sales Person': findSalesPersonForStock(p.id, s.warehouseId, s.vendorName),
                    'Satuan': p.uom,
                    'Total Stok': s.quantity,
                    'HPP per Unit': Number(p.purchasePrice) || 0,
                    'Total Nilai HPP': (s.quantity || 0) * (Number(p.purchasePrice) || 0),
                    'Threshold': p.lowStockThreshold,
                    'Status': s.quantity <= p.lowStockThreshold ? 'LOW' : 'NORMAL'
                }))
            );
            setPreviewData(data);
            setPreviewTitle("Laporan Master Stok Gudang (Berdasarkan Vendor)");
        } else {
            // Detailed Preview for receipts, including HPP
            const data: any[] = [];
            unverifiedReceipts.forEach(r => {
                const items = r.items || [];
                items.forEach((item: any) => {
                    data.push({
                        'Tanggal': format(new Date(r.createdAt), "yyyy-MM-dd HH:mm"),
                        'No. LPB': r.receiptNumber,
                        'Supplier': r.receivedFrom,
                        'Gudang': r.warehouse?.name || "-",
                        'Sales Person': r.salesPerson || "-",
                        'SKU': item.product?.sku || "-",
                        'Nama Barang': item.product?.name || "-",
                        'Qty': item.quantity || 0,
                        'Satuan': item.uom || item.product?.uom || "-",
                        'HPP per Unit': Number(item.purchasePrice) || 0,
                        'Total Nilai HPP': (item.quantity || 0) * (Number(item.purchasePrice) || 0),
                        'Status': r.isVerified ? 'VERIFIED' : 'PENDING'
                    });
                });
            });
            setPreviewData(data);
            setPreviewTitle("Laporan Detail Penerimaan Barang (Gudang)");
        }
        setShowPreview(true);
    };

    return (
        <div className="space-y-8 pb-10">
            {/* Header Section */}
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-slate-900 uppercase">
                        Warehouse
                    </h2>
                    <p className="text-slate-500 font-bold text-[10px] md:text-sm tracking-tight uppercase tracking-widest opacity-70">Inventory & Stock Distribution</p>
                </div>

                <button
                    onClick={() => setShowInputModal(true)}
                    className="w-full sm:w-auto bg-slate-900 text-white px-8 py-3 rounded-full flex items-center justify-center gap-3 hover:bg-slate-800 transition-all font-black shadow-xl shadow-slate-200 active:scale-95 border-2 border-slate-900 group"
                >
                    <Plus className="h-4 w-4 text-primary group-hover:rotate-90 transition-transform" />
                    <span className="uppercase tracking-widest text-xs">Stock Entry</span>
                </button>
            </div>

            {/* Main Action Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <button
                    onClick={() => setActiveTab("inventory")}
                    className={cn(
                        "p-6 rounded-[2rem] border-2 transition-all group relative overflow-hidden flex flex-col items-center gap-3 text-center",
                        activeTab === "inventory"
                            ? "bg-primary border-primary text-white shadow-2xl shadow-primary/30 -translate-y-1"
                            : "bg-white border-slate-100 text-slate-400 hover:border-primary/20 hover:text-primary shadow-sm"
                    )}
                >
                    <Box className={cn("h-7 w-7 transition-transform group-hover:scale-110", activeTab === "inventory" ? "text-white" : "text-primary")} />
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">Section</p>
                        <p className="text-lg font-black tracking-tight">Inventory</p>
                    </div>
                    {activeTab === "inventory" && <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-white/10 rounded-full" />}
                </button>

                <button
                    onClick={() => setActiveTab("checker")}
                    className={cn(
                        "p-6 rounded-[2rem] border-2 transition-all group relative overflow-hidden flex flex-col items-center gap-3 text-center",
                        activeTab === "checker"
                            ? "bg-primary border-primary text-white shadow-2xl shadow-primary/30 -translate-y-1"
                            : "bg-white border-slate-100 text-slate-400 hover:border-primary/20 hover:text-primary shadow-sm"
                    )}
                >
                    <Layers className={cn("h-7 w-7 transition-transform group-hover:scale-110", activeTab === "checker" ? "text-white" : "text-primary")} />
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">Section</p>
                        <p className="text-lg font-black tracking-tight">Checker</p>
                    </div>
                </button>

                <Link
                    href="/warehouse/print-database"
                    target="_blank"
                    className="p-6 bg-white border-2 border-slate-100 rounded-[2rem] text-slate-400 hover:border-indigo-500/20 hover:text-indigo-500 transition-all group flex flex-col items-center gap-3 text-center shadow-sm hover:-translate-y-1"
                >
                    <FileText className="h-7 w-7 text-indigo-500 transition-transform group-hover:scale-110" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">Report</p>
                        <p className="text-lg font-black tracking-tight text-slate-800 group-hover:text-indigo-500 transition-colors">Cetak DB</p>
                    </div>
                </Link>

                <button
                    onClick={() => {
                        setSelectedProductIdForCard(undefined);
                        setShowStockCard(true);
                    }}
                    className="p-6 bg-white border-2 border-slate-100 rounded-[2rem] text-slate-400 hover:border-indigo-500/20 hover:text-indigo-500 transition-all group flex flex-col items-center gap-3 text-center shadow-sm hover:-translate-y-1"
                >
                    <FileText className="h-7 w-7 text-indigo-500 transition-transform group-hover:scale-110" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">Report</p>
                        <p className="text-lg font-black tracking-tight text-slate-800 group-hover:text-indigo-500 transition-colors">Kartu Stok</p>
                    </div>
                </button>

                <button
                    onClick={handleExport}
                    className="p-6 bg-white border-2 border-slate-100 rounded-[2rem] text-slate-400 hover:border-emerald-500/20 hover:text-emerald-500 transition-all group flex flex-col items-center gap-3 text-center shadow-sm hover:-translate-y-1"
                >
                    <Download className="h-7 w-7 text-emerald-500 transition-transform group-hover:scale-110" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">Action</p>
                        <p className="text-lg font-black tracking-tight text-slate-800 group-hover:text-emerald-500 transition-colors">Export Excel</p>
                    </div>
                </button>
            </div>

            <DashboardStats />
            
            {activeTab === "checker" ? (
                <ErrorBoundary fallbackTitle="Checker Module Error">
                    <CheckerBoard unverifiedReceipts={unverifiedReceipts} />
                </ErrorBoundary>
            ) : (
                <>
                    <div className="grid gap-6 md:grid-cols-4">
                        <div className="md:col-span-3 space-y-6">
                            {/* Warehouse Occupancy Indicators */}
                            <div className="grid gap-4 md:grid-cols-3">
                                {warehouses.map((w) => {
                                    const totalStock = initialProducts.reduce((acc: number, p: any) => acc + p.stocks.filter((s: any) => s.warehouseId === w.id).reduce((sacc: number, s: any) => sacc + s.quantity, 0), 0);
                                    const capacity = 5000; // Placeholder capacity
                                    const percentage = Math.min(Math.round((totalStock / capacity) * 100), 100);

                                    return (
                                        <div key={w.id} className="p-5 rounded-2xl border-2 border-slate-100 bg-white shadow-sm hover:shadow-md transition-all group">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-2 bg-primary/5 rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                                                    <WarehouseIcon className="h-5 w-5" />
                                                </div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kapasitas</span>
                                            </div>
                                            <h4 className="font-black text-slate-800 truncate mb-1">{w.name}</h4>
                                            <p className="text-[10px] text-slate-500 font-bold mb-4 uppercase">{w.location}</p>

                                            <div className="space-y-2">
                                                <div className="flex justify-between items-end">
                                                    <span className="text-lg font-black text-slate-900">{isClient ? totalStock.toLocaleString() : "..."}</span>
                                                    <span className="text-[10px] font-black text-slate-400">{percentage}% Full</span>
                                                </div>
                                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full transition-all duration-1000",
                                                            percentage > 90 ? "bg-red-500" : percentage > 70 ? "bg-amber-500" : "bg-emerald-500"
                                                        )}
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Inventory List with Search */}
                            <div className="bg-white border-2 border-slate-200 rounded-2xl md:rounded-3xl shadow-sm overflow-hidden md:min-h-[600px]">
                                <div className="p-4 md:p-6 border-b-2 border-slate-50 flex flex-col md:flex-row gap-4 justify-between bg-slate-50/50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <Box className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Master Stock</h3>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest opacity-70">Real-time inventory overview</p>
                                        </div>
                                    </div>
                                    <div className="relative w-full md:w-80">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <input
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            placeholder="Search SKU or Product..."
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary transition-all font-medium placeholder:text-slate-400 shadow-sm"
                                        />
                                    </div>
                                </div>
                                {/* DESKTOP TABLE VIEW */}
                                <div className="hidden lg:block overflow-auto max-h-[calc(100vh-450px)] min-h-[400px] custom-scrollbar border-b-2 border-slate-50">
                                    <table className="w-full text-sm text-left min-w-[1200px] table-fixed relative">
                                        <thead className="bg-slate-50 text-slate-500 border-b-2 border-slate-100 sticky top-0 z-20 shadow-sm">
                                            <tr>
                                                <th className="px-6 py-4 uppercase text-[10px] font-black tracking-widest w-64">Barang / SKU</th>
                                                <th className="px-6 py-4 uppercase text-[10px] font-black tracking-widest text-left w-40">Gudang</th>
                                                <th className="px-6 py-4 uppercase text-[10px] font-black tracking-widest text-left w-48">Vendor / Pemasok</th>
                                                <th className="px-6 py-4 uppercase text-[10px] font-black tracking-widest text-center w-28">Sales</th>
                                                <th className="px-6 py-4 uppercase text-[10px] font-black tracking-widest text-right w-36">Qty Tersedia</th>
                                                <th className="px-6 py-4 uppercase text-[10px] font-black tracking-widest text-right w-36">HPP per Unit</th>
                                                <th className="px-6 py-4 uppercase text-[10px] font-black tracking-widest text-right w-36">Total Nilai HPP</th>
                                                <th className="px-6 py-4 uppercase text-[10px] font-black tracking-widest text-right w-28">Status</th>
                                                {isAdmin && <th className="px-6 py-4 uppercase text-[10px] font-black tracking-widest text-center w-20">Aksi</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {filteredProducts.flatMap((p: any) => {
                                                const rows = [];
                                                if (p.stocks && p.stocks.length > 0) {
                                                    p.stocks.forEach((s: any) => {
                                                        const whName = warehouses.find(w => w.id === s.warehouseId)?.name || "Unknown";
                                                        const isLow = s.quantity <= p.lowStockThreshold;
                                                        const salesPerson = findSalesPersonForStock(p.id, s.warehouseId, s.vendorName);
                                                        rows.push(
                                                            <tr key={`${p.id}-${s.id}`} className="hover:bg-slate-50/50 transition-colors group">
                                                                <td className="px-6 py-4">
                                                                    <div className="font-bold text-slate-800 truncate" title={p.name}>{p.name}</div>
                                                                    <div className="text-[10px] font-mono text-slate-400 uppercase group-hover:text-primary transition-colors truncate" title={p.sku}>{p.sku}</div>
                                                                </td>
                                                                <td className="px-6 py-4 text-left font-bold text-slate-600 text-xs text-nowrap">
                                                                    {whName}
                                                                </td>
                                                                <td className="px-6 py-4 text-left">
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 max-w-full">
                                                                        <WarehouseIcon className="h-3 w-3 text-slate-400 shrink-0" />
                                                                        <span className="truncate" title={s.vendorName || "UMUM"}>{s.vendorName || "UMUM"}</span>
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-center">
                                                                    {salesPerson !== "-" ? (
                                                                        <span className={cn(
                                                                            "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border",
                                                                            salesPerson === "BC" 
                                                                                ? "bg-indigo-50 text-indigo-700 border-indigo-100" 
                                                                                : "bg-amber-50 text-amber-700 border-amber-100"
                                                                        )}>
                                                                            {salesPerson}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-slate-400 text-xs">-</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <div className="text-lg font-black text-slate-800">{isClient ? (s.quantity || 0).toLocaleString() : "..."} <span className="text-[10px] text-slate-400 font-bold uppercase">{p.uom}</span></div>
                                                                </td>
                                                                <td className="px-6 py-4 text-right font-bold text-slate-600 text-xs">
                                                                    {formatCurrency(Number(p.purchasePrice || 0))}
                                                                </td>
                                                                <td className="px-6 py-4 text-right font-black text-slate-800 text-xs">
                                                                    {formatCurrency(Number(p.purchasePrice || 0) * (s.quantity || 0))}
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <span className={cn(
                                                                        "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm",
                                                                        isLow ? "bg-amber-100 text-amber-700 shadow-amber-100" : "bg-emerald-100 text-emerald-700 shadow-emerald-100"
                                                                    )}>
                                                                        {isLow ? "Low Stock" : "In Stock"}
                                                                    </span>
                                                                </td>
                                                                {isAdmin && (
                                                                    <td className="px-6 py-4 text-center">
                                                                        <div className="flex items-center justify-center gap-2">
                                                                            <button
                                                                                onClick={() => setSelectedStockForAdjustment({ product: p, stock: s })}
                                                                                className="p-2 text-slate-300 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                                                                title="Penyesuaian Stok"
                                                                            >
                                                                                <Edit2 className="h-4 w-4" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => {
                                                                                    setSelectedProductIdForCard(p.id);
                                                                                    setShowStockCard(true);
                                                                                }}
                                                                                className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                                                title="Kartu Stok"
                                                                            >
                                                                                <FileText className="h-4 w-4" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDeleteProduct(p.id)}
                                                                                className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                                                title="Hapus Produk"
                                                                            >
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        );
                                                    });
                                                } else {
                                                    rows.push(
                                                        <tr key={`${p.id}-empty`} className="hover:bg-slate-50/50 transition-colors group">
                                                            <td className="px-6 py-4">
                                                                <div className="font-bold text-slate-800 truncate" title={p.name}>{p.name}</div>
                                                                <div className="text-[10px] font-mono text-slate-400 uppercase group-hover:text-primary transition-colors truncate" title={p.sku}>{p.sku}</div>
                                                            </td>
                                                            <td className="px-6 py-4 text-left text-slate-400 italic text-xs">No Stock Data</td>
                                                            <td className="px-6 py-4 text-left">-</td>
                                                            <td className="px-6 py-4 text-center">-</td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="text-lg font-black text-slate-400">0 <span className="text-[10px] text-slate-300 font-bold uppercase">{p.uom}</span></div>
                                                            </td>
                                                            <td className="px-6 py-4 text-right font-bold text-slate-400 text-xs">
                                                                {formatCurrency(Number(p.purchasePrice || 0))}
                                                            </td>
                                                            <td className="px-6 py-4 text-right font-black text-slate-400 text-xs">
                                                                Rp 0
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter bg-slate-100 text-slate-400">Empty</span>
                                                            </td>
                                                            {isAdmin && (
                                                                <td className="px-6 py-4 text-center">
                                                                    <button
                                                                        onClick={() => handleDeleteProduct(p.id)}
                                                                        className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    );
                                                }
                                                return rows;
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* MOBILE & TABLET CARD VIEW */}
                                <div className="lg:hidden divide-y divide-slate-100 overflow-y-auto max-h-[70vh] custom-scrollbar">
                                    {filteredProducts.flatMap((p: any) => {
                                        if (p.stocks && p.stocks.length > 0) {
                                            return p.stocks.map((s: any) => {
                                                const whName = warehouses.find(w => w.id === s.warehouseId)?.name || "Unknown";
                                                const isLow = s.quantity <= p.lowStockThreshold;
                                                const salesPerson = findSalesPersonForStock(p.id, s.warehouseId, s.vendorName);
                                                return (
                                                    <div key={`${p.id}-${s.id}`} className="p-4 space-y-3 hover:bg-slate-50 transition-colors">
                                                        <div className="flex justify-between items-start gap-3">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-black text-slate-900 text-sm truncate">{p.name}</div>
                                                                <div className="text-[10px] font-mono text-primary font-black uppercase tracking-wider">{p.sku}</div>
                                                            </div>
                                                            <span className={cn(
                                                                "shrink-0 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter shadow-sm",
                                                                isLow ? "bg-amber-100 text-amber-700 shadow-amber-100" : "bg-emerald-100 text-emerald-700 shadow-emerald-100"
                                                            )}>
                                                                {isLow ? "Low Stock" : "Ready"}
                                                            </span>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                                                            <div>
                                                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Vendor</div>
                                                                <div className="text-[11px] font-bold text-slate-700 truncate">{s.vendorName || "UMUM"}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 text-right">Gudang</div>
                                                                <div className="text-[11px] font-bold text-slate-700 truncate text-right">{whName}</div>
                                                            </div>
                                                            <div className="border-t border-slate-100 pt-2 col-span-2 flex justify-between items-center text-xs">
                                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Sales Person</span>
                                                                {salesPerson !== "-" ? (
                                                                    <span className={cn(
                                                                        "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border",
                                                                        salesPerson === "BC" 
                                                                            ? "bg-indigo-50 text-indigo-700 border-indigo-100" 
                                                                            : "bg-amber-50 text-amber-700 border-amber-100"
                                                                    )}>
                                                                        {salesPerson}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-slate-400 font-bold">-</span>
                                                                )}
                                                            </div>
                                                            <div className="border-t border-slate-100 pt-2 col-span-2 flex justify-between text-[11px]">
                                                                <div>
                                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">HPP per Unit</span>
                                                                    <span className="font-bold text-slate-700">{formatCurrency(Number(p.purchasePrice || 0))}</span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Total Nilai HPP</span>
                                                                    <span className="font-bold text-slate-900">{formatCurrency(Number(p.purchasePrice || 0) * (s.quantity || 0))}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-end justify-between pt-1">
                                                            <div>
                                                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Qty Available</div>
                                                                <div className="text-xl font-black text-slate-900 leading-none">
                                                                    {isClient ? (s.quantity || 0).toLocaleString() : "..."} <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">{p.uom}</span>
                                                                </div>
                                                            </div>
                                                            {isAdmin && (
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            onClick={() => setSelectedStockForAdjustment({ product: p, stock: s })}
                                                                            className="p-2 text-slate-400 hover:text-primary bg-slate-100 rounded-xl transition-all active:scale-90"
                                                                        >
                                                                            <Edit2 className="h-3.5 w-3.5" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                setSelectedProductIdForCard(p.id);
                                                                                setShowStockCard(true);
                                                                            }}
                                                                            className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-100 rounded-xl transition-all active:scale-90"
                                                                        >
                                                                            <FileText className="h-3.5 w-3.5" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteProduct(p.id)}
                                                                            className="p-2 text-slate-400 hover:text-red-600 bg-slate-100 rounded-xl transition-all active:scale-90"
                                                                        >
                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                        </button>
                                                                    </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        } else {
                                            return (
                                                <div key={`${p.id}-empty`} className="p-4 space-y-3 opacity-60">
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-sm">{p.name}</div>
                                                        <div className="text-[10px] font-mono text-slate-400 uppercase">{p.sku}</div>
                                                    </div>
                                                     <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-dashed border-slate-200 text-xs">
                                                         <div>
                                                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Empty Stock</span>
                                                             <span className="text-[10px] text-slate-400">HPP: {formatCurrency(Number(p.purchasePrice || 0))}</span>
                                                         </div>
                                                         <div className="text-sm font-black text-slate-400">0 {p.uom}</div>
                                                     </div>
                                                </div>
                                            );
                                        }
                                    })}
                                </div>

                                {filteredProducts.length === 0 && (
                                    <div className="px-6 py-20 text-center text-slate-400 italic font-medium">
                                        Tidak ada produk ditemukan dengan kata kunci "{searchTerm}"
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recent Movements Section */}
                        <div className="md:col-span-1 space-y-6">
                            <div className="rounded-2xl border-2 border-slate-100 bg-white shadow-sm overflow-hidden h-fit">
                                <div className="p-5 border-b-2 border-slate-50 flex items-center gap-3 bg-slate-900 text-white">
                                    <Activity className="h-5 w-5 text-primary" />
                                    <h3 className="font-black text-sm uppercase tracking-widest">Recent Activity</h3>
                                </div>
                                <div className="p-5 space-y-6">
                                    {movements.length === 0 ? (
                                        <p className="text-center py-10 text-slate-400 italic text-xs">Belum ada pergerakan stok.</p>
                                    ) : (
                                        movements.map((m: any) => (
                                            <div key={m.id} className="relative pl-6 pb-6 border-l-2 border-slate-100 last:pb-0 last:border-l-0">
                                                <div className={cn(
                                                    "absolute -left-1.5 top-0 w-3 h-3 rounded-full border-2 border-white shadow-sm",
                                                    m.quantity > 0 ? "bg-emerald-500" : "bg-red-500"
                                                )} />
                                                <div className="space-y-1">
                                                    <div className="flex justify-between items-start">
                                                        <p className="text-[10px] font-black text-slate-800 line-clamp-1 uppercase leading-tight">{m.product?.name || "Product Deleted"}</p>
                                                        <div className={cn(
                                                            "flex items-center text-[10px] font-black",
                                                            m.quantity > 0 ? "text-emerald-600" : "text-red-600"
                                                        )}>
                                                            {m.quantity > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                                                            {Math.abs(m.quantity || 0)}
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{m.warehouse?.name || "Unknown"}</span>
                                                        <span className="text-[8px] font-bold text-slate-400">{m.createdAt ? format(new Date(m.createdAt), "HH:mm") : "-"}</span>
                                                    </div>
                                                    <p className="text-[9px] text-slate-500 italic bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 inline-block">{m.type}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="p-4 bg-slate-50 text-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End of History</span>
                                </div>
                            </div>

                            <div className="p-6 rounded-2xl bg-primary text-white shadow-xl shadow-primary/20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary to-indigo-700 overflow-hidden relative group">
                                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                    <WarehouseIcon className="h-32 w-32" />
                                </div>
                                <div className="relative z-10">
                                    <h4 className="font-black text-lg mb-1 leading-tight">Warehouse Insight</h4>
                                    <p className="text-xs text-white/80 font-medium mb-4">Total Stock di seluruh gudang saat ini:</p>
                                    <div className="text-4xl font-black mb-1">
                                        {isClient ? initialProducts.reduce((acc: number, p: any) => acc + (p.stocks?.reduce((sacc: number, s: any) => sacc + s.quantity, 0) || 0), 0).toLocaleString() : "..."}
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary-foreground/60">Items Handled</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {showInputModal && <StockInputModal products={initialProducts} warehouses={warehouses} onClose={() => {
                        setShowInputModal(false);
                        window.location.reload();
                    }} />}

                    {selectedStockForAdjustment && (
                        <StockAdjustmentModal
                            product={selectedStockForAdjustment!.product}
                            stock={selectedStockForAdjustment!.stock}
                            onClose={() => {
                                setSelectedStockForAdjustment(null);
                                window.location.reload();
                            }}
                        />
                    )}
                </>
            )}

            {showPreview && (
                <ReportPreviewModal
                    title={previewTitle}
                    data={previewData}
                    onClose={() => setShowPreview(false)}
                    onExport={handleExport}
                />
            )}

            {showStockCard && (
                <StockCardModal
                    initialProductId={selectedProductIdForCard}
                    products={initialProducts}
                    warehouses={warehouses}
                    onClose={() => setShowStockCard(false)}
                />
            )}
        </div>
    );
}
