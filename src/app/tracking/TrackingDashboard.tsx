"use client";

import { useState, useMemo } from "react";
import { 
    Search, 
    Package, 
    Download, 
    Activity, 
    Filter,
    ArrowUpRight,
    ArrowDownRight,
    TrendingUp,
    LayoutGrid,
    List,
    Box,
    ChevronRight,
    History,
    User,
    ExternalLink,
    Clock,
    X,
    ShieldCheck,
    AlertTriangle,
    RefreshCw
} from "lucide-react";
import { callAction } from "@/proxy";
import { cn } from "@/lib/utils";
import { exportToExcel } from "@/lib/excel";

interface TrackingDashboardProps {
    initialProducts: any[];
    userEmail: string;
    userRole: string;
}

export function TrackingDashboard({ initialProducts, userEmail, userRole }: TrackingDashboardProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [auditData, setAuditData] = useState<any[]>([]);
    const [showAudit, setShowAudit] = useState(false);
    const [loadingAudit, setLoadingAudit] = useState(false);

    // Permission Logic
    const canExport = userRole === "ADMIN" || userEmail === "ferza@kolaborasi.id";

    // Data Processing: Aggregate stock levels
    const processedProducts = useMemo(() => {
        return initialProducts.map(p => ({
            ...p,
            totalStock: (p.stocks || []).reduce((acc: number, s: any) => acc + (Number(s.quantity) || 0), 0)
        }));
    }, [initialProducts]);

    // Filtering
    const filteredProducts = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return processedProducts.filter(p => 
            p.sku?.toLowerCase().includes(term) || 
            p.name?.toLowerCase().includes(term)
        );
    }, [processedProducts, searchTerm]);

    const handleExport = () => {
        if (!canExport) return;
        
        const exportData = filteredProducts.map(p => ({
            'SKU': p.sku,
            'Nama Barang': p.name,
            'Satuan (UOM)': p.uom || 'PCS',
            'Total Stok': p.totalStock
        }));
        
        exportToExcel(exportData, 'Item_Tracking_Export', 'Items');
    };

    const getDocUrl = (record: any) => {
        if (!record.parentId) return "#";
        if (record.type === "PURCHASE") return `/purchase/print/${record.parentId}`;
        if (record.type === "SALE") return `/sales/print/sj/${record.parentId}`;
        if (record.type === "PURCHASE_RETURN") return `/purchase/print/invoice/${record.parentId}`;
        if (record.type === "SALES_RETURN") return `/sales/print/sj/${record.parentId}`;
        return "#";
    };

    const handleProductClick = async (product: any) => {
        setSelectedProduct(product);
        setLoadingHistory(true);
        setHistory([]);
        try {
            const res = await callAction("getProductTracking", product.id);
            if (res && res.history) {
                setHistory(res.history);
            }
        } catch (err) {
            console.error("Failed to fetch history:", err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleRunAudit = async () => {
        setLoadingAudit(true);
        setShowAudit(true);
        try {
            const res = await callAction("runStockAuditAction");
            setAuditData(res);
        } catch (err) {
            console.error("Audit failed:", err);
        } finally {
            setLoadingAudit(false);
        }
    };

    return (
        <div className="p-4 lg:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header / Stats Section */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 text-primary rounded-xl ring-1 ring-primary/20 shadow-sm">
                            <Activity className="h-5 w-5" />
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            Tracking Item
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">ReadOnly</span>
                        </h1>
                    </div>
                    <p className="text-sm text-slate-500 font-medium ml-1">Pencarian cepat stok barang secara real-time di seluruh gudang.</p>
                </div>

                <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
                    <button 
                        onClick={() => setViewMode("list")}
                        className={cn(
                            "p-2 rounded-xl transition-all duration-300",
                            viewMode === "list" ? "bg-primary text-white shadow-lg" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                        )}
                    >
                        <List className="h-4 w-4" />
                    </button>
                    <button 
                        onClick={() => setViewMode("grid")}
                        className={cn(
                            "p-2 rounded-xl transition-all duration-300",
                            viewMode === "grid" ? "bg-primary text-white shadow-lg" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                        )}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </button>
                    
                    {canExport && (
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={handleRunAudit}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-slate-600/20 active:scale-95 border border-slate-700"
                            >
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Audit Stok
                            </button>
                            <button 
                                onClick={handleExport}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                            >
                                <Download className="h-3.5 w-3.5" />
                                Export Excel
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] translate-x-4 -translate-y-4 group-hover:scale-110 group-hover:translate-x-2 transition-all duration-700">
                        <Package className="h-32 w-32" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Produk</p>
                    <div className="flex items-end gap-3">
                        <h2 className="text-3xl font-black text-slate-900">{processedProducts.length}</h2>
                        <span className="text-[10px] font-bold text-emerald-500 mb-1 flex items-center gap-0.5">
                             Registered
                        </span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                     <div className="absolute top-0 right-0 p-4 opacity-[0.03] translate-x-4 -translate-y-4 group-hover:scale-110 group-hover:translate-x-2 transition-all duration-700 text-primary">
                        <Box className="h-32 w-32" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Stok Tersedia</p>
                    <div className="flex items-end gap-3">
                        <h3 className="text-3xl font-black text-slate-900">
                            {processedProducts.reduce((acc, p) => acc + (p.totalStock > 0 ? 1 : 0), 0)}
                        </h3>
                        <span className="text-[10px] font-bold text-blue-500 mb-1 uppercase tracking-widest">In Stock</span>
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm lg:col-span-2 relative overflow-hidden flex items-center px-8 group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10 w-full flex items-center gap-6">
                        <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl">
                            <Search className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 block ml-1">Cari SKU / Nama Barang</label>
                            <input 
                                type="text"
                                placeholder="Universal search items..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-transparent border-b-2 border-slate-100 focus:border-primary py-2 text-xl font-black text-slate-900 outline-none transition-all placeholder:text-slate-200"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* List / Grid Display */}
            {viewMode === "list" ? (
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">No</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Information</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Unit</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Available Stock</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map((p, i) => (
                                    <tr 
                                        key={p.id} 
                                        onClick={() => handleProductClick(p)}
                                        className="group hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 cursor-pointer active:bg-slate-100"
                                    >
                                        <td className="px-8 py-5 font-mono text-xs text-slate-400">{i + 1}</td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-primary font-black group-hover:scale-110 transition-transform">
                                                    <Package className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{p.sku}</p>
                                                    <p className="text-sm font-black text-slate-900 leading-tight uppercase">{p.name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex justify-center">
                                                <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded-lg uppercase border border-slate-200">
                                                    {p.uom || 'PCS'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center justify-end gap-3 text-right">
                                                <span className={cn(
                                                    "text-xl font-black font-mono tracking-tighter",
                                                    p.totalStock <= (p.lowStockThreshold || 10) ? "text-rose-500" : (p.totalStock > 0 ? "text-emerald-500" : "text-slate-300")
                                                )}>
                                                    {p.totalStock.toLocaleString('id-ID')}
                                                </span>
                                                {p.totalStock <= (p.lowStockThreshold || 10) ? (
                                                    <div className="flex flex-col items-end">
                                                        <div className="h-2 w-2 bg-rose-500 rounded-full animate-ping shadow-[0_0_8px_rgba(244,63,94,0.5)]"></div>
                                                        <span className="text-[7px] font-black text-rose-500 uppercase tracking-tighter mt-1">Low Stock</span>
                                                    </div>
                                                ) : p.totalStock > 0 ? (
                                                    <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                                ) : (
                                                    <div className="h-2 w-2 bg-slate-200 rounded-full"></div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {filteredProducts.map((p) => (
                        <div 
                            key={p.id} 
                            onClick={() => handleProductClick(p)}
                            className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer active:scale-95"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3 bg-slate-100 rounded-2xl group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                    <Package className="h-6 w-6" />
                                </div>
                                <span className="px-3 py-1 bg-slate-50 text-slate-400 text-[9px] font-black rounded-lg uppercase border border-slate-100 italic">
                                    {p.uom || 'PCS'}
                                </span>
                            </div>
                            
                            <div className="space-y-1 mb-6">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.sku}</p>
                                <h4 className="text-lg font-black text-slate-900 leading-tight uppercase line-clamp-2 h-14">{p.name}</h4>
                            </div>

                            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Global Stock</p>
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "text-2xl font-black font-mono",
                                        p.totalStock <= (p.lowStockThreshold || 10) ? "text-rose-600" : (p.totalStock > 0 ? "text-primary" : "text-slate-200")
                                    )}>
                                        {p.totalStock}
                                    </span>
                                    {p.totalStock <= (p.lowStockThreshold || 10) && p.totalStock > 0 && (
                                        <span className="absolute top-6 right-6 flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {filteredProducts.length === 0 && (
                <div className="py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                    <Search className="h-16 w-16 text-slate-100 mx-auto mb-4" />
                    <p className="text-sm font-black text-slate-300 uppercase tracking-[0.2em]">Tidak ada barang ditemukan</p>
                </div>
            )}

            {/* Sidebar Details Drawer */}
            {selectedProduct && (
                <div className="fixed inset-0 z-[120] flex justify-end overflow-hidden">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setSelectedProduct(null)}
                    />
                    
                    {/* Panel */}
                    <div className="relative w-full max-w-xl bg-white shadow-2xl h-full animate-in slide-in-from-right duration-500 ease-out border-l border-slate-100 flex flex-col">
                        {/* Header */}
                        <div className="p-8 border-b border-slate-100 bg-slate-50/50 relative text-slate-900">
                            <button 
                                onClick={() => setSelectedProduct(null)}
                                className="absolute top-8 right-8 p-3 bg-white hover:bg-slate-100 rounded-2xl shadow-sm border border-slate-200 transition-all active:scale-90"
                            >
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20">
                                    <History className="h-6 w-6" />
                                </div>
                                <h3 className="text-2xl font-black tracking-tight">Lifecycle Tracking</h3>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{selectedProduct.sku}</p>
                                <h4 className="text-xl font-black leading-tight uppercase line-clamp-2">{selectedProduct.name}</h4>
                            </div>
                        </div>

                        {/* History Content */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                            {loadingHistory ? (
                                <div className="space-y-6 pt-10">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex gap-4 animate-pulse">
                                            <div className="h-10 w-10 bg-slate-100 rounded-full shrink-0" />
                                            <div className="flex-1 space-y-2 py-1">
                                                <div className="h-3 bg-slate-100 rounded-full w-24" />
                                                <div className="h-2 bg-slate-50 rounded-full w-full" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : history.length > 0 ? (
                                <div className="space-y-4">
                                    {history.map((record, index) => (
                                        <div key={record.id} className="relative pl-10 group">
                                            {/* Timeline Line */}
                                            {index !== history.length - 1 && (
                                                <div className="absolute left-[19px] top-8 bottom-[-20px] w-0.5 bg-slate-100 group-hover:bg-primary/20 transition-colors" />
                                            )}
                                            
                                            {/* Dot / Icon */}
                                            <div className={cn(
                                                "absolute left-0 top-0 h-10 w-10 rounded-full border-4 border-white shadow-sm flex items-center justify-center transition-all z-10 group-hover:scale-110 text-white",
                                                record.type.includes("PURCHASE") ? "bg-emerald-500" : "bg-primary"
                                            )}>
                                                {record.type.includes("PURCHASE") ? (
                                                    <ArrowUpRight className="h-4 w-4" />
                                                ) : (
                                                    <ArrowDownRight className="h-4 w-4" />
                                                )}
                                            </div>

                                            {/* Card */}
                                            <div className="bg-white border border-slate-100 p-5 rounded-2xl group-hover:border-primary/20 group-hover:shadow-md transition-all">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
                                                            <Clock className="h-3 w-3" />
                                                            {new Date(record.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                        </span>
                                                        <span className={cn(
                                                            "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md inline-block w-fit",
                                                            record.type.includes("PURCHASE") ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-primary/5 text-primary border border-primary/10"
                                                        )}>
                                                            {record.type.replace("_", " ")}
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={cn(
                                                            "text-xl font-black font-mono tracking-tighter leading-none",
                                                            record.qtyIn > 0 ? "text-emerald-500" : "text-rose-500"
                                                        )}>
                                                            {record.qtyIn > 0 ? `+${record.qtyIn}` : `-${record.qtyOut}`}
                                                        </p>
                                                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{selectedProduct.uom || 'PCS'}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between pt-3 border-t border-slate-50 gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                                            Ref: <span className="text-slate-900 font-mono italic lowercase ml-1">{record.ref}</span>
                                                        </p>
                                                        <div className="flex items-center gap-2 text-slate-500">
                                                            <User className="h-3 w-3 shrink-0" />
                                                            <span className="text-[11px] font-bold truncate uppercase">{record.partner}</span>
                                                        </div>
                                                    </div>
                                                    {userRole === "ADMIN" && record.parentId && (
                                                        <a 
                                                            href={getDocUrl(record)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-2 hover:bg-slate-100 rounded-xl text-slate-300 hover:text-primary transition-all active:scale-90"
                                                            title="View Document"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <ExternalLink className="h-4 w-4" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                                    <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                        <History className="h-10 w-10 text-slate-300" />
                                    </div>
                                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Belum ada riwayat transaksi</p>
                                </div>
                            )}
                        </div>

                        {/* Footer Info */}
                        <div className="p-8 bg-slate-50/50 border-t border-slate-100">
                            <div className="flex items-center justify-between text-slate-500">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-emerald-500 text-white rounded-lg shadow-sm">
                                        <TrendingUp className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest leading-none mb-1">Status Barang</p>
                                        <p className="text-xs font-black text-slate-900 uppercase">Perputaran Aktif</p>
                                    </div>
                                </div>
                                <div className="text-right text-slate-900">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Last Update</p>
                                    <p className="text-[10px] font-mono font-bold italic lowercase">{new Date().toLocaleTimeString('id-ID')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Audit Modal */}
            {showAudit && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={() => setShowAudit(false)} />
                    <div className="relative w-full max-w-5xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-slate-900 text-white rounded-2xl">
                                    <ShieldCheck className="h-6 w-6" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 leading-none">Stock Reconciliation</h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Comparing Transaction History vs Stock Table</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAudit(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all">
                                <X className="h-5 w-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-8 custom-scrollbar">
                            {loadingAudit ? (
                                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                    <RefreshCw className="h-10 w-10 text-primary animate-spin" />
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Calculating inventory life-cycles...</p>
                                </div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">SKU / Item</th>
                                            <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">History Sum</th>
                                            <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Table Sum</th>
                                            <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {auditData.map((item: any) => (
                                            <tr key={item.id} className="group">
                                                <td className="py-4">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.sku}</p>
                                                    <p className="text-sm font-black text-slate-900 uppercase">{item.name}</p>
                                                </td>
                                                <td className="py-4 text-center">
                                                    <div className="flex flex-col">
                                                        <span className="text-lg font-black font-mono">{item.calculatedStock}</span>
                                                        <span className="text-[8px] text-slate-400 font-bold uppercase">(+{item.totalPurchased} in, -{item.totalSold} out)</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 text-center">
                                                    <span className="text-lg font-black font-mono text-slate-900">{item.currentStock}</span>
                                                </td>
                                                <td className="py-4 text-center">
                                                    {item.discrepancy === 0 ? (
                                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                                                            <ShieldCheck className="h-3.5 w-3.5" />
                                                            <span className="text-[10px] font-black uppercase">Verified</span>
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-full border border-rose-100">
                                                            <AlertTriangle className="h-3.5 w-3.5" />
                                                            <span className="text-[10px] font-black uppercase">Diff: {item.discrepancy}</span>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <Activity className="h-5 w-5 text-emerald-400" />
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                                    Audit ini menghitung saldo berdasarkan seluruh riwayat transaksi (GR, Sale, Returns) <br/>dan membandingkannya dengan saldo tabel Stock saat ini secara real-time.
                                </p>
                            </div>
                            <button onClick={handleRunAudit} className="px-6 py-3 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-2">
                                <RefreshCw className={cn("h-4 w-4", loadingAudit && "animate-spin")} />
                                Re-Calculate
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
