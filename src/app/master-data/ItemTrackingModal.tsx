"use client";

import { useState, useEffect, useMemo } from "react";
import { X, History, Box, Info, Filter, RefreshCw, Tag as LucideTag } from "lucide-react";
import { callAction } from "@/proxy";
import { cn } from "@/lib/utils";
import { format, isValid } from "date-fns";

interface ItemTrackingModalProps {
    productId: string;
    onClose: () => void;
}

export function ItemTrackingModal({ productId, onClose }: ItemTrackingModalProps) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);
    
    // Filters State
    const [fDay, setFDay] = useState("");
    const [fMonth, setFMonth] = useState("");
    const [fYear, setFYear] = useState("");

    useEffect(() => {
        setIsClient(true);
        const load = async () => {
            setLoading(true);
            try {
                const res = await callAction("getProductTracking", productId);
                if (res) setData(res);
                else throw new Error("Data tidak ditemukan");
            } catch (e: any) {
                setError(e.message || "Gagal memuat riwayat produk.");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [productId]);

    const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

    const filteredHistory = useMemo(() => {
        if (!data?.history) return [];
        return data.history.filter((rec: any) => {
            const d = new Date(rec.date);
            if (!isValid(d)) return true;
            const mDay = fDay === "" || d.getDate() === parseInt(fDay);
            const mMonth = fMonth === "" || (d.getMonth() + 1) === parseInt(fMonth);
            const mYear = fYear === "" || d.getFullYear() === parseInt(fYear);
            return mDay && mMonth && mYear;
        });
    }, [data, fDay, fMonth, fYear]);

    if (loading) {
        return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
                <div className="bg-white rounded-[2.5rem] p-16 flex flex-col items-center gap-6 shadow-2xl animate-pulse">
                    <History className="h-10 w-10 text-primary animate-spin" />
                    <p className="text-slate-900 font-black uppercase tracking-widest text-sm">MEMUAT LEDGER...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
                <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full text-center space-y-6 shadow-2xl">
                    <X className="h-12 w-12 text-rose-500 mx-auto" />
                    <p className="text-slate-500 font-bold">{error || "Terjadi kesalahan"}</p>
                    <button onClick={onClose} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs">Tutup</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-w-5xl h-[85vh] shadow-2xl flex flex-col overflow-hidden border border-white/20">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-900 text-white rounded-2xl">
                            <History className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{data.product.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-100">SKU: {data.product.sku}</span>
                                <span className="text-[10px] font-black text-primary uppercase bg-primary/5 px-2 py-0.5 rounded italic">SATUAN: {data.product.uom}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                        <X className="h-6 w-6 text-slate-300 hover:text-slate-900" />
                    </button>
                </div>

                {/* Filter Panel */}
                <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Filter className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Filter Periode</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <select value={fDay} onChange={(e) => setFDay(e.target.value)} className="bg-white border-2 border-slate-100 rounded-xl px-3 py-1.5 text-[10px] font-bold outline-none h-9">
                            <option value="">Tgl</option>
                            {Array.from({ length: 31 }, (_, i) => (<option key={i+1} value={i+1}>{i+1}</option>))}
                        </select>
                        <select value={fMonth} onChange={(e) => setFMonth(e.target.value)} className="bg-white border-2 border-slate-100 rounded-xl px-3 py-1.5 text-[10px] font-bold outline-none h-9">
                            <option value="">Bulan</option>
                            {months.map((m, i) => (<option key={i} value={i+1}>{m}</option>))}
                        </select>
                        <select value={fYear} onChange={(e) => setFYear(e.target.value)} className="bg-white border-2 border-slate-100 rounded-xl px-3 py-1.5 text-[10px] font-bold outline-none h-9">
                            <option value="">Tahun</option>
                            {years.map(y => (<option key={y} value={y}>{y}</option>))}
                        </select>
                        {(fDay || fMonth || fYear) && (
                            <button onClick={() => { setFDay(""); setFMonth(""); setFYear(""); }} className="p-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100" title="Reset">
                                <RefreshCw className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4 sm:p-8 custom-scrollbar">
                    <div className="bg-white border-2 border-slate-100 rounded-[2rem] overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b-2 border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Tanggal</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Ref / Kode</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Partner</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right text-slate-400">Masuk</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right text-slate-400">Keluar</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Tidak ada riwayat pada periode ini</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredHistory.map((row: any) => (
                                        <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-[11px] font-bold text-slate-500">
                                                {(() => {
                                                    const d = new Date(row.date);
                                                    return isClient && isValid(d) ? format(d, "dd MMM yyyy, HH:mm") : "...";
                                                })()}
                                            </td>
                                            <td className="px-6 py-4 text-[11px] font-black text-slate-900 uppercase">{row.ref}</td>
                                            <td className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase">{row.partner}</td>
                                            <td className="px-6 py-4 text-right">
                                                {row.qtyIn > 0 && <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg text-[10px] font-black border border-emerald-100">+{row.qtyIn}</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {row.qtyOut > 0 && <span className="bg-rose-50 text-rose-600 px-2 py-1 rounded-lg text-[10px] font-black border border-rose-100">-{row.qtyOut}</span>}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-slate-400">
                        <Info className="h-4 w-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Sinkronisasi data dilakukan secara realtime</span>
                    </div>
                    <button onClick={onClose} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95">Tutup</button>
                </div>
            </div>
        </div>
    );
}
