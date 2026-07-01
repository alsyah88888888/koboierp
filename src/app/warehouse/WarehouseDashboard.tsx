"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Warehouse as WarehouseIcon, Layers, Trash2, FileText, Search, Activity, Box, ArrowUpRight, ArrowDownLeft, Download, Eye, Edit2, ArrowLeftRight, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { StockInputModal } from "./StockInputModal";
import { StockAdjustmentModal } from "./StockAdjustmentModal";
import { StockTransferModal } from "./StockTransferModal";
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
    const [selectedStockForTransfer, setSelectedStockForTransfer] = useState<{product: any, stock: any} | null>(null);
    const [showStockCard, setShowStockCard] = useState(false);
    const [selectedProductIdForCard, setSelectedProductIdForCard] = useState<string | undefined>(undefined);
    const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});
    const [isClient, setIsClient] = useState(false);

    const toggleProduct = (id: string) => {
        setExpandedProducts(prev => ({...prev, [id]: !prev[id]}));
    };

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

    const getStockMetadata = (productId: string, warehouseId: string, vendorName: string) => {
        const matchingReceipt = unverifiedReceipts.find(r => 
            (r.receivedFrom || "UMUM").trim().toLowerCase() === (vendorName || "UMUM").trim().toLowerCase() && 
            r.warehouseId === warehouseId && 
            r.items?.some((item: any) => item.productId === productId)
        );
        const matchingItem = matchingReceipt?.items?.find((item: any) => item.productId === productId);
        return {
            salesPerson: matchingReceipt?.salesPerson || "-",
            hpp: matchingItem?.purchasePrice ? Number(matchingItem.purchasePrice) : 0
        };
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
            const data = initialProducts.flatMap(p =>
                (p.stocks || [])
                    .filter((s: any) => s.quantity > 0)
                    .map((s: any) => {
                        const meta = getStockMetadata(p.id, s.warehouseId, s.vendorName);
                        const hpp = meta.hpp || Number(p.purchasePrice) || 0;
                        return {
                            'SKU': p.sku,
                            'Nama Barang': p.name,
                            'Vendor / PT': s.vendorName || "UMUM",
                            'Gudang': warehouses.find(w => w.id === s.warehouseId)?.name || 'Unknown',
                            'Sales Person': meta.salesPerson,
                            'Satuan': p.uom,
                            'Total Stok': s.quantity,
                            'HPP per Unit': hpp,
                            'Total Nilai': (s.quantity || 0) * hpp,
                            'Threshold': p.lowStockThreshold,
                            'Status': s.quantity <= p.lowStockThreshold ? 'LOW' : 'NORMAL'
                        };
                    })
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
                        'Total Nilai': (item.quantity || 0) * (Number(item.purchasePrice) || 0),
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
            const data = initialProducts.flatMap(p =>
                (p.stocks || [])
                    .filter((s: any) => s.quantity > 0)
                    .map((s: any) => {
                        const meta = getStockMetadata(p.id, s.warehouseId, s.vendorName);
                        const hpp = meta.hpp || Number(p.purchasePrice) || 0;
                        return {
                            'SKU': p.sku,
                            'Nama Barang': p.name,
                            'Vendor / PT': s.vendorName || "UMUM",
                            'Gudang': warehouses.find(w => w.id === s.warehouseId)?.name || 'Unknown',
                            'Sales Person': meta.salesPerson,
                            'Satuan': p.uom,
                            'Total Stok': s.quantity,
                            'HPP per Unit': hpp,
                            'Total Nilai': (s.quantity || 0) * hpp,
                            'Threshold': p.lowStockThreshold,
                            'Status': s.quantity <= p.lowStockThreshold ? 'LOW' : 'NORMAL'
                        };
                    })
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
                        'Total Nilai': (item.quantity || 0) * (Number(item.purchasePrice) || 0),
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2 py-4 bg-gradient-to-r from-slate-900/5 to-transparent rounded-3xl border border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-950 text-white rounded-2xl shadow-xl shadow-slate-950/10">
                        <WarehouseIcon className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 uppercase">
                            Warehouse
                        </h2>
                        <p className="text-slate-500 font-bold text-[10px] md:text-xs tracking-wider uppercase opacity-70">Inventory & Stock Distribution</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={() => setShowInputModal(true)}
                        className="w-full md:w-auto bg-slate-900 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all font-bold shadow-lg shadow-slate-900/10 hover:shadow-slate-900/20 active:scale-98 group text-xs uppercase tracking-wider"
                    >
                        <Plus className="h-4 w-4 text-emerald-400 group-hover:rotate-90 transition-transform duration-300" />
                        <span>Stock Entry</span>
                    </button>
                </div>
            </div>

            {/* Control Panel: Navigation & Actions */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200/80 p-3 rounded-[1.5rem] shadow-sm">
                {/* Tabs Selector */}
                <div className="flex bg-slate-100/80 p-1 rounded-2xl w-full lg:w-fit gap-1">
                    <button
                        onClick={() => setActiveTab("inventory")}
                        className={cn(
                            "flex-1 lg:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300",
                            activeTab === "inventory"
                                ? "bg-white text-slate-900 shadow-md scale-102"
                                : "text-slate-500 hover:text-slate-800"
                        )}
                    >
                        <Box className={cn("h-4 w-4", activeTab === "inventory" ? "text-slate-900" : "text-slate-400")} />
                        <span>Inventory</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("checker")}
                        className={cn(
                            "flex-1 lg:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300",
                            activeTab === "checker"
                                ? "bg-white text-slate-900 shadow-md scale-102"
                                : "text-slate-500 hover:text-slate-800"
                        )}
                    >
                        <Layers className={cn("h-4 w-4", activeTab === "checker" ? "text-slate-900" : "text-slate-400")} />
                        <span>Checker</span>
                    </button>
                </div>

                {/* Actions Toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                    <Link
                        href="/warehouse/print-database"
                        target="_blank"
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs uppercase tracking-wider transition-all"
                    >
                        <FileText className="h-4 w-4 text-slate-500" />
                        <span>Cetak DB</span>
                    </Link>

                    <button
                        onClick={() => {
                            setSelectedProductIdForCard(undefined);
                            setShowStockCard(true);
                        }}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs uppercase tracking-wider transition-all"
                    >
                        <FileText className="h-4 w-4 text-slate-500" />
                        <span>Kartu Stok</span>
                    </button>

                    <button
                        onClick={handlePreview}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs uppercase tracking-wider transition-all"
                        title="Preview Report"
                    >
                        <Eye className="h-4 w-4 text-slate-500" />
                        <span>Preview</span>
                    </button>

                    <button
                        onClick={handleExport}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/50 text-emerald-800 font-bold text-xs uppercase tracking-wider transition-all shadow-sm shadow-emerald-500/5 hover:shadow-md"
                    >
                        <Download className="h-4 w-4 text-emerald-600" />
                        <span>Export Excel</span>
                    </button>
                </div>
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
                            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                                {warehouses.map((w) => {
                                    const totalStock = initialProducts.reduce((acc: number, p: any) => acc + p.stocks.filter((s: any) => s.warehouseId === w.id).reduce((sacc: number, s: any) => sacc + s.quantity, 0), 0);
                                    const capacity = 5000; // Placeholder capacity
                                    const percentage = Math.min(Math.round((totalStock / capacity) * 100), 100);

                                    return (
                                        <div key={w.id} className="p-5 rounded-2xl border border-slate-200/70 bg-white hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-center mb-3">
                                                    <div className="p-2 bg-slate-100 text-slate-700 rounded-xl group-hover:bg-slate-900 group-hover:text-white transition-colors duration-300">
                                                        <WarehouseIcon className="h-4 w-4" />
                                                    </div>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">Capacity</span>
                                                </div>
                                                <h4 className="font-extrabold text-slate-900 text-sm truncate mb-0.5">{w.name}</h4>
                                                <p className="text-[10px] text-slate-400 font-semibold mb-4 uppercase tracking-tight truncate">{w.location || "Gudang Utama"}</p>
                                            </div>

                                            <div className="space-y-2 mt-auto">
                                                <div className="flex justify-between items-baseline">
                                                    <span className="text-xl font-mono font-black text-slate-900 leading-none">{isClient ? totalStock.toLocaleString() : "..."}</span>
                                                    <span className="text-[10px] font-extrabold text-slate-400">{percentage}% Full</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full transition-all duration-1000 rounded-full",
                                                            percentage > 90 
                                                                ? "bg-gradient-to-r from-rose-500 to-red-600" 
                                                                : percentage > 70 
                                                                    ? "bg-gradient-to-r from-amber-500 to-orange-500" 
                                                                    : "bg-gradient-to-r from-emerald-500 to-teal-500"
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
                            <div className="bg-white border border-slate-200/80 rounded-2xl md:rounded-3xl shadow-sm overflow-hidden md:min-h-[600px]">
                                <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between bg-slate-50/40 backdrop-blur-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-100 text-slate-800 rounded-xl">
                                            <Box className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Master Stock</h3>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest opacity-80">Real-time inventory overview</p>
                                        </div>
                                    </div>
                                    <div className="relative w-full md:w-80">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <input
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            placeholder="Search SKU or Product..."
                                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/15 transition-all font-medium placeholder:text-slate-400 shadow-sm"
                                        />
                                    </div>
                                </div>

                                {/* DESKTOP TABLE VIEW */}
                                <div className="hidden lg:block overflow-auto max-h-[calc(100vh-450px)] min-h-[400px] custom-scrollbar border-b border-slate-100">
                                    <table className="w-full text-xs text-left min-w-[1200px] table-fixed relative">
                                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0 z-20 shadow-sm">
                                            <tr>
                                                <th className="px-6 py-4.5 uppercase text-[9px] font-bold tracking-widest w-64 text-slate-600">Barang / SKU</th>
                                                <th className="px-6 py-4.5 uppercase text-[9px] font-bold tracking-widest text-left w-40 text-slate-600">Gudang</th>
                                                <th className="px-6 py-4.5 uppercase text-[9px] font-bold tracking-widest text-left w-48 text-slate-600">Vendor / Pemasok</th>
                                                <th className="px-6 py-4.5 uppercase text-[9px] font-bold tracking-widest text-center w-28 text-slate-600">Sales</th>
                                                <th className="px-6 py-4.5 uppercase text-[9px] font-bold tracking-widest text-right w-36 text-slate-600">Qty Tersedia</th>
                                                <th className="px-6 py-4.5 uppercase text-[9px] font-bold tracking-widest text-right w-36 text-slate-600">HPP per Unit</th>
                                                <th className="px-6 py-4.5 uppercase text-[9px] font-bold tracking-widest text-right w-36 text-slate-600">Total Nilai</th>
                                                <th className="px-6 py-4.5 uppercase text-[9px] font-bold tracking-widest text-right w-28 text-slate-600">Status</th>
                                                {isAdmin && <th className="px-6 py-4.5 uppercase text-[9px] font-bold tracking-widest text-center w-24 text-slate-600">Aksi</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredProducts.map((p: any) => {
                                                const activeStocks = (p.stocks || []).filter((s: any) => s.quantity !== 0);
                                                const totalNetQty = activeStocks.reduce((sum: number, s: any) => sum + Number(s.quantity), 0);
                                                const isExpanded = expandedProducts[p.id];
                                                const hasNegative = activeStocks.some((s: any) => s.quantity < 0);
                                                
                                                return (
                                                    <React.Fragment key={p.id}>
                                                        {/* Parent Row (Product Level) */}
                                                        <tr className="bg-slate-50/50 hover:bg-slate-100/50 transition-colors cursor-pointer" onClick={() => toggleProduct(p.id)}>
                                                            <td className="px-6 py-4" colSpan={4}>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-1.5 bg-white shadow-sm border border-slate-200 rounded-md text-slate-400">
                                                                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-black text-slate-900 text-sm flex items-center gap-2">
                                                                            {p.name}
                                                                            {hasNegative && (
                                                                                <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border border-rose-200">
                                                                                    <AlertTriangle className="h-3 w-3" /> Ada Stok Minus
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-[10px] font-mono text-slate-500 mt-0.5 tracking-wider">{p.sku} | {activeStocks.length} Gudang/Vendor</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Stok</div>
                                                                <div className={cn("text-lg font-mono font-black", totalNetQty < 0 ? "text-rose-600" : "text-slate-900")}>
                                                                    {isClient ? totalNetQty.toLocaleString() : "..."}
                                                                    <span className="text-[10px] text-slate-400 ml-1">{p.uom}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4" colSpan={4}></td>
                                                        </tr>
                                                        
                                                        {/* Child Rows (Stock Details) */}
                                                        {isExpanded && activeStocks.length === 0 && (
                                                            <tr>
                                                                <td colSpan={9} className="px-6 py-4 text-center text-slate-400 text-xs italic bg-white">
                                                                    Tidak ada pergerakan stok
                                                                </td>
                                                            </tr>
                                                        )}
                                                        {isExpanded && activeStocks.map((s: any) => {
                                                            const whName = warehouses.find(w => w.id === s.warehouseId)?.name || "Unknown";
                                                            const isLow = s.quantity > 0 && s.quantity <= p.lowStockThreshold;
                                                            const isNegative = s.quantity < 0;
                                                            const meta = getStockMetadata(p.id, s.warehouseId, s.vendorName);
                                                            const salesPerson = meta.salesPerson;
                                                            const hpp = meta.hpp || Number(p.purchasePrice) || 0;
                                                            
                                                            return (
                                                                <tr key={`${p.id}-${s.id}`} className="bg-white hover:bg-slate-50/50 transition-colors group border-l-4 border-l-transparent hover:border-l-indigo-400">
                                                                    <td className="px-6 py-3 pl-12">
                                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sub-Stok</div>
                                                                    </td>
                                                                    <td className="px-6 py-3 text-left font-bold text-slate-600 text-xs truncate">
                                                                        {whName}
                                                                    </td>
                                                                    <td className="px-6 py-3 text-left">
                                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 text-[10px] font-bold border border-slate-200">
                                                                            <WarehouseIcon className="h-3 w-3 text-slate-400 shrink-0" />
                                                                            <span className="truncate">{s.vendorName || "UMUM"}</span>
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-3 text-center">
                                                                        {salesPerson !== "-" ? (
                                                                            <span className={cn(
                                                                                "px-2 py-0.5 rounded-md text-[9px] font-extrabold border shadow-sm tracking-wide",
                                                                                salesPerson === "BC" ? "bg-indigo-50 text-indigo-700 border-indigo-100" : "bg-amber-50 text-amber-700 border-amber-100"
                                                                            )}>
                                                                                {salesPerson}
                                                                            </span>
                                                                        ) : <span className="text-slate-400">-</span>}
                                                                    </td>
                                                                    <td className="px-6 py-3 text-right">
                                                                        <div className={cn("text-sm font-mono font-bold", isNegative ? "text-rose-600" : "text-slate-900")}>
                                                                            {isClient ? (s.quantity || 0).toLocaleString() : "..."} 
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-3 text-right font-mono font-bold text-slate-500 text-[11px]">
                                                                        {formatCurrency(hpp)}
                                                                    </td>
                                                                    <td className="px-6 py-3 text-right font-mono font-bold text-slate-800 text-[11px]">
                                                                        {formatCurrency(hpp * (s.quantity || 0))}
                                                                    </td>
                                                                    <td className="px-6 py-3 text-right">
                                                                        <span className={cn(
                                                                            "px-2 py-0.5 rounded-md text-[9px] font-bold border shadow-sm",
                                                                            isNegative ? "bg-rose-100 text-rose-700 border-rose-200" 
                                                                            : isLow ? "bg-amber-50 text-amber-700 border-amber-100" 
                                                                            : "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                                        )}>
                                                                            {isNegative ? "Minus" : isLow ? "Low Stock" : "In Stock"}
                                                                        </span>
                                                                    </td>
                                                                    {isAdmin && (
                                                                        <td className="px-6 py-3 text-center">
                                                                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                <button onClick={() => setSelectedStockForAdjustment({ product: p, stock: s })} className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg" title="Penyesuaian Stok"><Edit2 className="h-3.5 w-3.5" /></button>
                                                                                <button onClick={() => setSelectedStockForTransfer({ product: p, stock: s })} className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg" title="Mutasi"><ArrowLeftRight className="h-3.5 w-3.5" /></button>
                                                                                <button onClick={() => { setSelectedProductIdForCard(p.id); setShowStockCard(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Kartu Stok"><FileText className="h-3.5 w-3.5" /></button>
                                                                                <button onClick={() => handleDeleteProduct(p.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Hapus Produk"><Trash2 className="h-3.5 w-3.5" /></button>
                                                                            </div>
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            );
                                                        })}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* MOBILE & TABLET CARD VIEW */}
                                <div className="lg:hidden divide-y divide-slate-100 overflow-y-auto max-h-[70vh] custom-scrollbar">
                                    {filteredProducts.map((p: any) => {
                                        const activeStocks = (p.stocks || []).filter((s: any) => s.quantity !== 0);
                                        const totalNetQty = activeStocks.reduce((sum: number, s: any) => sum + Number(s.quantity), 0);
                                        const isExpanded = expandedProducts[p.id];
                                        const hasNegative = activeStocks.some((s: any) => s.quantity < 0);
                                        
                                        return (
                                            <div key={p.id} className="bg-white">
                                                {/* Parent Card */}
                                                <div 
                                                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                                                    onClick={() => toggleProduct(p.id)}
                                                >
                                                    <div className="flex-1 min-w-0 pr-4">
                                                        <div className="font-black text-slate-900 text-sm flex items-center gap-2 mb-1">
                                                            <div className="truncate">{p.name}</div>
                                                            {hasNegative && <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />}
                                                        </div>
                                                        <div className="text-[10px] font-mono text-slate-500 tracking-widest">{p.sku} | {activeStocks.length} Gudang</div>
                                                    </div>
                                                    <div className="text-right flex items-center gap-3">
                                                        <div>
                                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Stok</div>
                                                            <div className={cn("text-lg font-black leading-none", totalNetQty < 0 ? "text-rose-600" : "text-slate-900")}>
                                                                {isClient ? totalNetQty.toLocaleString() : "..."}
                                                            </div>
                                                        </div>
                                                        <div className="text-slate-400">
                                                            {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Child Cards (Details) */}
                                                {isExpanded && (
                                                    <div className="bg-slate-50/50 border-t border-slate-100 divide-y divide-slate-100">
                                                        {activeStocks.length === 0 && (
                                                            <div className="p-4 text-center text-xs text-slate-400 italic">Tidak ada stok</div>
                                                        )}
                                                        {activeStocks.map((s: any) => {
                                                            const whName = warehouses.find(w => w.id === s.warehouseId)?.name || "Unknown";
                                                            const isLow = s.quantity > 0 && s.quantity <= p.lowStockThreshold;
                                                            const isNegative = s.quantity < 0;
                                                            const meta = getStockMetadata(p.id, s.warehouseId, s.vendorName);
                                                            
                                                            return (
                                                                <div key={`${p.id}-${s.id}`} className="p-4 pl-6 space-y-3 relative overflow-hidden">
                                                                    {isNegative && <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />}
                                                                    <div className="flex justify-between items-start gap-3">
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="font-bold text-slate-700 text-xs truncate mb-1">{whName}</div>
                                                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white text-slate-600 text-[10px] font-bold border border-slate-200">
                                                                                <WarehouseIcon className="h-3 w-3 text-slate-400 shrink-0" />
                                                                                <span className="truncate">{s.vendorName || "UMUM"}</span>
                                                                            </span>
                                                                        </div>
                                                                        <span className={cn(
                                                                            "shrink-0 px-2 py-0.5 rounded-md text-[9px] font-bold border shadow-sm",
                                                                            isNegative ? "bg-rose-100 text-rose-700 border-rose-200"
                                                                            : isLow ? "bg-amber-50 text-amber-700 border-amber-100" 
                                                                            : "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                                        )}>
                                                                            {isNegative ? "Minus" : isLow ? "Low Stock" : "In Stock"}
                                                                        </span>
                                                                    </div>
                                                                    
                                                                    <div className="flex items-end justify-between pt-2 border-t border-slate-200/50">
                                                                        <div>
                                                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Qty Gudang Ini</div>
                                                                            <div className={cn("text-xl font-mono font-black leading-none", isNegative ? "text-rose-600" : "text-slate-900")}>
                                                                                {isClient ? (s.quantity || 0).toLocaleString() : "..."} 
                                                                                <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">{p.uom}</span>
                                                                            </div>
                                                                        </div>
                                                                        {isAdmin && (
                                                                            <div className="flex items-center gap-1.5">
                                                                                <button onClick={() => setSelectedStockForAdjustment({ product: p, stock: s })} className="p-2 text-slate-400 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 rounded-lg shadow-sm">
                                                                                    <Edit2 className="h-3.5 w-3.5" />
                                                                                </button>
                                                                                <button onClick={() => setSelectedStockForTransfer({ product: p, stock: s })} className="p-2 text-slate-400 hover:text-violet-600 bg-white border border-slate-200 hover:border-violet-300 rounded-lg shadow-sm">
                                                                                    <ArrowLeftRight className="h-3.5 w-3.5" />
                                                                                </button>
                                                                                <button onClick={() => { setSelectedProductIdForCard(p.id); setShowStockCard(true); }} className="p-2 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-300 rounded-lg shadow-sm">
                                                                                    <FileText className="h-3.5 w-3.5" />
                                                                                </button>
                                                                                <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-slate-400 hover:text-red-600 bg-white border border-slate-200 hover:border-red-300 rounded-lg shadow-sm">
                                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
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
                            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden h-fit">
                                <div className="p-4.5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/60">
                                    <Activity className="h-4 w-4 text-slate-600" />
                                    <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">Recent Activity</h3>
                                </div>
                                <div className="p-5 space-y-5">
                                    {movements.length === 0 ? (
                                        <p className="text-center py-10 text-slate-400 italic text-[11px]">Belum ada pergerakan stok.</p>
                                    ) : (
                                        movements.map((m: any) => (
                                            <div key={m.id} className="relative pl-5 pb-5 border-l-2 border-slate-100 last:pb-0 last:border-l-0">
                                                <div className={cn(
                                                    "absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm",
                                                    m.quantity > 0 ? "bg-emerald-500 shadow-emerald-500/20" : "bg-rose-500 shadow-rose-500/20"
                                                )} />
                                                <div className="space-y-1">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <p className="text-[10px] font-bold text-slate-800 line-clamp-1 uppercase leading-tight">{m.product?.name || "Product Deleted"}</p>
                                                        <div className={cn(
                                                            "flex items-center text-[10px] font-mono font-bold shrink-0",
                                                            m.quantity > 0 ? "text-emerald-600" : "text-rose-600"
                                                        )}>
                                                            {m.quantity > 0 ? "+" : ""}
                                                            {m.quantity || 0}
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between items-center text-[8px] font-bold text-slate-400">
                                                        <span className="uppercase tracking-tighter truncate max-w-[80px]">{m.warehouse?.name || "Unknown"}</span>
                                                        <span>{m.createdAt ? format(new Date(m.createdAt), "HH:mm") : "-"}</span>
                                                    </div>
                                                    <span className={cn(
                                                        "text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide",
                                                        m.type === "RECEIPT" || m.type?.includes("IN")
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-100/50"
                                                            : "bg-rose-50/50 text-rose-700 border-rose-100/50"
                                                    )}>{m.type}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="p-3 bg-slate-50/50 border-t border-slate-100 text-center">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">End of History</span>
                                </div>
                            </div>

                            {/* Warehouse Insight Widget */}
                            <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white shadow-xl shadow-slate-900/10 overflow-hidden relative group border border-slate-800 animate-fade-in">
                                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
                                    <WarehouseIcon className="h-32 w-32" />
                                </div>
                                <div className="relative z-10 space-y-3">
                                    <div>
                                        <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-200">Warehouse Insight</h4>
                                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-tight">Real-time stats</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] text-slate-400 font-medium">Total unit tersimpan saat ini:</p>
                                        <div className="text-3xl font-mono font-black text-white leading-none">
                                            {isClient ? initialProducts.reduce((acc: number, p: any) => acc + (p.stocks?.reduce((sacc: number, s: any) => sacc + s.quantity, 0) || 0), 0).toLocaleString() : "..."}
                                        </div>
                                    </div>
                                    <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Total Items Handled</span>
                                        <span className="bg-white/10 px-2 py-0.5 rounded text-[9px] font-bold font-mono">{initialProducts.length} SKU</span>
                                    </div>
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

                    {selectedStockForTransfer && (
                        <StockTransferModal
                            products={initialProducts}
                            warehouses={warehouses}
                            preselectedProduct={selectedStockForTransfer.product}
                            preselectedStock={selectedStockForTransfer.stock}
                            onClose={() => setSelectedStockForTransfer(null)}
                            onSuccess={() => window.location.reload()}
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
