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
    Box
} from "lucide-react";
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
                        <button 
                            onClick={handleExport}
                            className="ml-2 flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                        >
                            <Download className="h-3.5 w-3.5" />
                            Export Excel
                        </button>
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
                                    <tr key={p.id} className="group hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
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
                                                    p.totalStock > 0 ? "text-emerald-500" : "text-slate-300"
                                                )}>
                                                    {p.totalStock.toLocaleString('id-ID')}
                                                </span>
                                                {p.totalStock > 0 ? (
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
                        <div key={p.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
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
                                        p.totalStock > 0 ? "text-primary" : "text-slate-200"
                                    )}>
                                        {p.totalStock}
                                    </span>
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
        </div>
    );
}
