"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
    X, ClipboardList, RefreshCw, Truck, Calendar, 
    Check, Copy, Info, Tag
} from "lucide-react";
import { callAction } from "@/proxy";

interface WarehouseMappingInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialDate?: string;
}

export function WarehouseMappingInfoModal({
    isOpen,
    onClose,
    initialDate
}: WarehouseMappingInfoModalProps) {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayStr);
    const [categoryFilter, setCategoryFilter] = useState<"ALL" | "KB-TRN" | "KB-TRD">("ALL");
    const [mappings, setMappings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

    const loadMappings = async (dateStr: string) => {
        setIsLoading(true);
        try {
            // First check ShippingMapping table
            const res = await callAction("getShippingMappings", dateStr, "ALL");
            if (Array.isArray(res) && res.length > 0) {
                setMappings(res);
            } else {
                // Fallback to daily shipping schedule if no explicit mapping
                const schedule = await callAction("getDailyShippingSchedule", dateStr);
                if (Array.isArray(schedule)) {
                    const flattened: any[] = [];
                    schedule.forEach((d: any) => {
                        (d.items || []).forEach((it: any, idx: number) => {
                            flattened.push({
                                id: `${d.id}-${idx}`,
                                category: d.taxType || "KB-TRN",
                                poNumber: d.poNumber || "",
                                buyerName: d.buyerName || "",
                                productName: it.productName || "Item",
                                quantity: Number(it.quantity || 0),
                                driver: d.driver || ""
                            });
                        });
                    });
                    setMappings(flattened);
                } else {
                    setMappings([]);
                }
            }
        } catch (err) {
            console.error("Gagal memuat mapping gudang:", err);
            setMappings([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadMappings(selectedDate);
        }
    }, [isOpen, selectedDate]);

    if (!isOpen) return null;

    const filtered = mappings.filter(m => {
        if (categoryFilter === "ALL") return true;
        return m.category === categoryFilter;
    });

    const countTRN = mappings.filter(m => m.category === "KB-TRN").length;
    const countTRD = mappings.filter(m => m.category === "KB-TRD").length;

    const handleCopy = (text: string, id: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedIndex(id);
        setTimeout(() => setCopiedIndex(null), 1500);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-2xl">
                            <ClipboardList className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-black text-slate-900 tracking-tight">
                                    Informasi Mapping Pengiriman Gudang
                                </h3>
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                                    Referensi Purchase
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                Acuan muatan yang disusun tim Gudang sebagai panduan input Surat Jalan.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Filter & Controls Bar */}
                <div className="p-4 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        {/* Date Picker */}
                        <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                            <Calendar className="h-4 w-4 text-slate-500" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent border-none outline-none text-xs font-bold text-slate-800 cursor-pointer"
                            />
                        </div>

                        {/* Category Tabs */}
                        <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                            <button
                                onClick={() => setCategoryFilter("ALL")}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                                    categoryFilter === "ALL"
                                        ? "bg-slate-900 text-white shadow-xs"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                Semua ({mappings.length})
                            </button>
                            <button
                                onClick={() => setCategoryFilter("KB-TRN")}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                                    categoryFilter === "KB-TRN"
                                        ? "bg-blue-600 text-white shadow-xs"
                                        : "text-blue-700 hover:bg-blue-50"
                                }`}
                            >
                                KB-TRN ({countTRN})
                            </button>
                            <button
                                onClick={() => setCategoryFilter("KB-TRD")}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                                    categoryFilter === "KB-TRD"
                                        ? "bg-emerald-600 text-white shadow-xs"
                                        : "text-emerald-700 hover:bg-emerald-50"
                                }`}
                            >
                                KB-TRD ({countTRD})
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={() => loadMappings(selectedDate)}
                        className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all"
                        title="Perbarui Data Mapping"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                </div>

                {/* Guidance Banner */}
                <div className="px-5 py-2.5 bg-blue-50/70 border-b border-blue-100 flex items-center gap-2 text-xs text-blue-900 font-medium">
                    <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span>
                        Gunakan data di bawah sebagai acuan saat menginput Surat Jalan (SJ). Anda dapat mengklik tombol salin untuk menyalin No. PO atau Nama Buyer.
                    </span>
                </div>

                {/* Content Table */}
                <div className="flex-1 overflow-y-auto p-5">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <RefreshCw className="h-8 w-8 animate-spin text-amber-500 mb-2" />
                            <p className="text-xs font-bold">Memuat referensi mapping gudang...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-16 text-slate-400">
                            <Truck className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                            <h4 className="text-sm font-bold text-slate-700">Belum Ada Mapping Gudang</h4>
                            <p className="text-xs text-slate-500 mt-1">
                                Tim Gudang belum menyusun mapping pengiriman untuk tanggal {selectedDate}.
                            </p>
                        </div>
                    ) : (
                        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-black uppercase text-[10.5px]">
                                        <th className="py-2.5 px-3 w-8 text-center">NO</th>
                                        <th className="py-2.5 px-2.5 w-24">KATEGORI</th>
                                        <th className="py-2.5 px-3 w-32">NO. PO</th>
                                        <th className="py-2.5 px-3.5 w-44">BUYER / CUSTOMER</th>
                                        <th className="py-2.5 px-3.5">NAMA BARANG</th>
                                        <th className="py-2.5 px-3 w-16 text-right">QTY</th>
                                        <th className="py-2.5 px-3.5 w-32">DRIVER</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filtered.map((row, idx) => (
                                        <tr key={row.id || idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-2.5 px-3 text-center text-slate-400 font-bold">
                                                {idx + 1}
                                            </td>
                                            <td className="py-2.5 px-2.5">
                                                <span className={`inline-block font-black text-[9.5px] px-2 py-0.5 rounded ${
                                                    row.category === "KB-TRN"
                                                        ? "bg-blue-100 text-blue-800"
                                                        : "bg-emerald-100 text-emerald-800"
                                                }`}>
                                                    {row.category}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3">
                                                <div className="flex items-center justify-between gap-1 group">
                                                    <span className="font-bold text-slate-800 uppercase tracking-tight truncate max-w-[100px]">
                                                        {row.poNumber || "-"}
                                                    </span>
                                                    {row.poNumber && (
                                                        <button
                                                            onClick={() => handleCopy(row.poNumber, `po-${idx}`)}
                                                            className="text-slate-300 hover:text-slate-700 transition-colors"
                                                            title="Salin No. PO"
                                                        >
                                                            {copiedIndex === `po-${idx}` ? (
                                                                <Check className="h-3 w-3 text-emerald-600" />
                                                            ) : (
                                                                <Copy className="h-3 w-3" />
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-3.5">
                                                <div className="flex items-center justify-between gap-1 group">
                                                    <span className="font-bold text-slate-900 uppercase">
                                                        {row.buyerName}
                                                    </span>
                                                    <button
                                                        onClick={() => handleCopy(row.buyerName, `buyer-${idx}`)}
                                                        className="text-slate-300 hover:text-slate-700 transition-colors"
                                                        title="Salin Nama Buyer"
                                                    >
                                                        {copiedIndex === `buyer-${idx}` ? (
                                                            <Check className="h-3 w-3 text-emerald-600" />
                                                        ) : (
                                                            <Copy className="h-3 w-3" />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-3.5 text-slate-800 uppercase font-semibold">
                                                {row.productName}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-black text-slate-900 tabular-nums">
                                                {row.quantity.toLocaleString("id-ID")}
                                            </td>
                                            <td className="py-2.5 px-3.5 font-black text-slate-900 uppercase">
                                                {row.driver ? (
                                                    <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200 text-[10px]">
                                                        {row.driver}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 italic font-normal text-[10px]">
                                                        Belum diatur
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">
                        Total {filtered.length} item muatan untuk tanggal {selectedDate}
                    </span>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl font-bold transition-all"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
}

export default WarehouseMappingInfoModal;
