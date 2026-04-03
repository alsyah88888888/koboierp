"use client";

import { useState, useEffect } from "react";
import { X, History, ArrowDownLeft, ArrowUpRight, RotateCcw, Box, Info, Filter, TrendingDown, TrendingUp } from "lucide-react";
import { getProductTrackingAction } from "@/actions/warehouse";
import { cn, formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

interface ItemTrackingModalProps {
    productId: string;
    onClose: () => void;
}

export function ItemTrackingModal({ productId, onClose }: ItemTrackingModalProps) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        const load = async () => {
            setLoading(true);
            try {
                const res = await getProductTrackingAction(productId);
                setData(res);
            } catch (e: any) {
                setError(e.message || "Gagal memuat riwayat produk.");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [productId]);

    if (loading) {
        return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
                <div className="bg-white rounded-[2.5rem] p-16 flex flex-col items-center gap-6 shadow-2xl animate-pulse border-2 border-primary/20">
                    <div className="relative">
                        <div className="h-16 w-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                        <History className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <div className="text-center">
                        <p className="text-slate-900 font-black uppercase tracking-[0.2em] text-sm">Menyusun Ledger...</p>
                        <p className="text-slate-400 text-[10px] font-bold mt-1 uppercase">Mohon tunggu sebentar</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
                <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full text-center space-y-6 shadow-2xl border-2 border-rose-100">
                    <div className="inline-flex p-5 bg-rose-50 rounded-[1.5rem] border-2 border-rose-100 shadow-inner">
                        <X className="h-10 w-10 text-rose-500" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">KONEKSI TERPUTUS</h3>
                        <p className="text-slate-500 font-medium mt-2 leading-relaxed">{error}</p>
                    </div>
                    <button onClick={onClose} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95">Tutup Jendela</button>
                </div>
            </div>
        );
    }

    const totalIn = data.history.reduce((acc: number, row: any) => acc + (row.qtyIn || 0), 0);
    const totalOut = data.history.reduce((acc: number, row: any) => acc + (row.qtyOut || 0), 0);
    const netBalance = totalIn - totalOut;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[60] flex items-center justify-center p-0 sm:p-6 animate-in fade-in duration-500">
            <div className="bg-slate-50 rounded-none sm:rounded-[3rem] w-full max-w-5xl h-full sm:max-h-[90vh] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
                {/* Header Section */}
                <div className="px-8 py-8 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center bg-white gap-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />
                    
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="p-4 bg-slate-900 text-white rounded-[1.5rem] shadow-xl shadow-slate-200">
                            <History className="h-8 w-8" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">{data.product.name}</h3>
                                <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border border-primary/10">TRACKING AKTIF</span>
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                                <span className="text-[11px] font-mono text-slate-500 font-bold bg-slate-100 flex items-center gap-1.5 px-3 py-1 rounded-xl border border-slate-200">
                                    <Tag className="h-3 w-3" /> SKU: {data.product.sku}
                                </span>
                                <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest bg-white shadow-sm border border-slate-200 px-3 py-1 rounded-xl">
                                    SATUAN: {data.product.uom}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full md:w-auto relative z-10">
                        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm grow md:grow-0">
                            <div className="px-4 py-2 text-center border-r border-slate-100">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saldo Ledger</p>
                                <p className={cn(
                                    "text-lg font-black tracking-tighter",
                                    netBalance >= 0 ? "text-emerald-600" : "text-rose-600"
                                )}>
                                    {netBalance > 0 ? "+" : ""}{netBalance}
                                </p>
                            </div>
                            <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-xl transition-all group">
                                <X className="h-6 w-6 text-slate-300 group-hover:text-slate-900 transition-colors" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Statistics Grid */}
                <div className="px-8 py-6 grid grid-cols-2 md:grid-cols-4 gap-4 bg-white border-b border-slate-100">
                    <div className="erp-card bg-emerald-50 border-emerald-100 p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest">Total Masuk</p>
                                <h4 className="text-2xl font-black text-emerald-700 tracking-tighter">+{totalIn}</h4>
                            </div>
                            <div className="p-2 bg-white rounded-lg shadow-sm"><TrendingUp className="h-4 w-4 text-emerald-500" /></div>
                        </div>
                    </div>
                    <div className="erp-card bg-rose-50 border-rose-100 p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-black text-rose-600/60 uppercase tracking-widest">Total Keluar</p>
                                <h4 className="text-2xl font-black text-rose-700 tracking-tighter">-{totalOut}</h4>
                            </div>
                            <div className="p-2 bg-white rounded-lg shadow-sm"><TrendingDown className="h-4 w-4 text-rose-500" /></div>
                        </div>
                    </div>
                </div>

                {/* Ledger Content */}
                <div className="flex-1 overflow-auto p-4 sm:p-8 custom-scrollbar bg-slate-50/50">
                    {data.history.length === 0 ? (
                        <div className="py-32 text-center space-y-6">
                            <div className="p-10 bg-white border-2 border-slate-100 inline-block rounded-[2.5rem] shadow-xl shadow-slate-200/50">
                                <Box className="h-16 w-16 text-slate-200" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-slate-900 font-black uppercase tracking-widest text-sm">BELUM ADA AKTIVITAS</p>
                                <p className="text-slate-400 text-xs font-medium italic">Item ini belum memiliki catatan transaksi pembelian atau penjualan.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="erp-card bg-white p-0 overflow-hidden shadow-xl border-slate-200">
                            <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex items-center gap-2">
                                <Filter className="h-3.5 w-3.5 text-slate-400" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rincian Pergerakan Barang</span>
                            </div>
                            <table className="table-erp">
                                <thead>
                                    <tr>
                                        <th className="w-16 text-center">#</th>
                                        <th className="w-40">Tanggal</th>
                                        <th>Referensi / Kode</th>
                                        <th>Mitra / Rekanan</th>
                                        <th className="text-right w-24">Masuk</th>
                                        <th className="text-right w-24">Keluar</th>
                                        <th className="text-right w-24">Satuan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.history.map((row: any, idx: number) => (
                                        <tr key={row.id} className="group">
                                            <td className="text-center text-slate-400">{idx + 1}</td>
                                            <td className="whitespace-nowrap font-bold text-slate-600 text-[11px]">
                                                {isClient ? format(new Date(row.date), "dd MMM yyyy, HH:mm") : "..."}
                                            </td>
                                            <td className="font-mono text-xs font-black text-slate-900 group-hover:text-primary transition-colors uppercase tracking-tight">
                                                <div className="flex items-center gap-2">
                                                    {row.type === "PURCHASE" && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
                                                    {row.type === "SALE" && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
                                                    {row.type.includes("RETURN") && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />}
                                                    {row.ref}
                                                </div>
                                            </td>
                                            <td className="text-[11px] font-bold text-slate-500 uppercase">
                                                {row.partner}
                                            </td>
                                            <td className="text-right">
                                                {row.qtyIn > 0 ? (
                                                    <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-xs font-black border border-emerald-100 shadow-sm">
                                                        +{row.qtyIn}
                                                    </span>
                                                ) : <span className="text-slate-200">0</span>}
                                            </td>
                                            <td className="text-right">
                                                {row.qtyOut > 0 ? (
                                                    <span className="bg-rose-50 text-rose-700 px-3 py-1 rounded-lg text-xs font-black border border-rose-100 shadow-sm">
                                                        -{row.qtyOut}
                                                    </span>
                                                ) : <span className="text-slate-200">0</span>}
                                            </td>
                                            <td className="text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">{data.product.uom}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Sticky Footer */}
                <div className="px-8 py-6 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                   <div className="flex items-center gap-3 text-slate-400 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                        <Info className="h-4 w-4 text-primary" />
                        <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Menampilkan mutasi stok akumulasi berdasarkan filter aktif</span>
                   </div>
                   <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button onClick={onClose} className="grow sm:grow-0 px-10 py-3 bg-slate-900 text-white hover:bg-slate-800 rounded-2xl transition-all font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-slate-200 active:scale-95">Tutup Ledger</button>
                   </div>
                </div>
            </div>
        </div>
    );
}

const Tag = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/>
    </svg>
);
