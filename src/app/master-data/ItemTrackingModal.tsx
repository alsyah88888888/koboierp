"use client";

import { useState, useEffect } from "react";
import { X, History, ArrowDownLeft, ArrowUpRight, RotateCcw, Box, Info } from "lucide-react";
import { getProductTrackingAction } from "@/app/actions";
import { cn, formatDate } from "@/lib/utils";

interface ItemTrackingModalProps {
    productId: string;
    onClose: () => void;
}

export function ItemTrackingModal({ productId, onClose }: ItemTrackingModalProps) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await getProductTrackingAction(productId);
                setData(res);
            } catch (e: any) {
                setError(e.message || "Failed to load history");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [productId]);

    if (loading) {
        return (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-12 flex flex-col items-center gap-4">
                    <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Fetching Ledger...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-4">
                    <div className="inline-flex p-4 bg-red-50 rounded-2xl">
                        <X className="h-8 w-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900">Error Loading Data</h3>
                    <p className="text-slate-500 font-medium">{error}</p>
                    <button onClick={onClose} className="w-full bg-slate-100 py-3 rounded-xl font-bold uppercase text-xs tracking-widest text-slate-600">Close</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 py-6 border-b-2 border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-2xl">
                            <History className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">{data.product.name}</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-widest bg-white border border-slate-200 px-2 py-0.5 rounded">SKU: {data.product.sku}</span>
                                <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded">{data.product.uom}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="h-6 w-6 text-slate-400" />
                    </button>
                </div>

                {/* History Table */}
                <div className="flex-1 overflow-auto p-4 sm:p-8 custom-scrollbar bg-white">
                    {data.history.length === 0 ? (
                        <div className="py-20 text-center space-y-4">
                            <div className="p-6 bg-slate-50 inline-block rounded-full">
                                <Box className="h-10 w-10 text-slate-200" />
                            </div>
                            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No transactions found for this item.</p>
                        </div>
                    ) : (
                        <div className="border-2 border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b-2 border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Date</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Transaction</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Partner</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">In</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Out</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 font-bold">
                                    {data.history.map((row: any) => (
                                        <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                                                {new Date(row.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {row.type === "PURCHASE" && <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" />}
                                                    {row.type === "SALE" && <ArrowUpRight className="h-3.5 w-3.5 text-blue-500" />}
                                                    {row.type.includes("RETURN") && <RotateCcw className="h-3.5 w-3.5 text-amber-500" />}
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] text-slate-800 uppercase tracking-tight">{row.ref}</span>
                                                        <span className={cn(
                                                            "text-[8px] uppercase tracking-widest font-black",
                                                            row.type === "PURCHASE" ? "text-emerald-500" :
                                                            row.type === "SALE" ? "text-blue-500" : "text-amber-500"
                                                        )}>{row.type.replace('_', ' ')}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-[11px] text-slate-600 truncate max-w-[200px]">
                                                {row.partner}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {row.qtyIn > 0 ? (
                                                    <span className="text-emerald-600 tabular-nums">+{row.qtyIn}</span>
                                                ) : <span className="text-slate-300">-</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right font-black">
                                                {row.qtyOut > 0 ? (
                                                    <span className="text-blue-600 tabular-nums">-{row.qtyOut}</span>
                                                ) : <span className="text-slate-300">-</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="px-8 py-4 bg-slate-50 border-t-2 border-slate-100 flex items-center justify-between">
                   <div className="flex items-center gap-2 text-slate-400">
                        <Info className="h-4 w-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Calculated Balance from recent history</span>
                   </div>
                   <button onClick={onClose} className="px-6 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl transition-all font-black text-slate-700 uppercase tracking-widest text-[10px]">Close History</button>
                </div>
            </div>
        </div>
    );
}
