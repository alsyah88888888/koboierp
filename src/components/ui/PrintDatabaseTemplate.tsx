"use client";

import React from "react";
import { format } from "date-fns";

interface Product {
    sku: string;
    category: string;
    name: string;
    uom: string;
    barcode?: string;
}

export function PrintDatabaseTemplate({ products }: { products: Product[] }) {
    return (
        <div className="p-8 bg-white text-slate-900 font-sans min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-start border-b-4 border-primary pb-6 mb-8">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-primary">Master Database Barang</h1>
                    <p className="text-sm font-bold text-slate-500 italic mt-1">PT. Kola Borasi Indonesia - Inventory Report</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dicetak Pada</p>
                    <p className="text-sm font-bold text-slate-800">{format(new Date(), "dd MMMM yyyy HH:mm")}</p>
                </div>
            </div>

            {/* Table */}
            <table className="w-full border-collapse border-2 border-slate-200">
                <thead>
                    <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                        <th className="border-2 border-slate-800 px-4 py-3 text-left w-40">SKU</th>
                        <th className="border-2 border-slate-800 px-4 py-3 text-left w-40">Kategori</th>
                        <th className="border-2 border-slate-800 px-4 py-3 text-left">Nama Barang</th>
                        <th className="border-2 border-slate-800 px-4 py-3 text-center w-24">Satuan</th>
                        <th className="border-2 border-slate-800 px-4 py-3 text-left w-40">Barcode</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map((p, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                            <td className="border-2 border-slate-200 px-4 py-2 font-mono text-xs font-bold text-slate-800">{p.sku}</td>
                            <td className="border-2 border-slate-200 px-4 py-2 text-[10px] font-black uppercase text-slate-600">{p.category || "UMUM"}</td>
                            <td className="border-2 border-slate-200 px-4 py-2 text-sm font-bold text-slate-900">{p.name}</td>
                            <td className="border-2 border-slate-200 px-4 py-2 text-center text-[10px] font-black uppercase text-slate-500">{p.uom}</td>
                            <td className="border-2 border-slate-200 px-4 py-2 font-mono text-[10px] text-slate-400">{p.barcode || "-"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Footer */}
            <div className="mt-12 pt-8 border-t-2 border-slate-100 flex justify-between items-end">
                <div className="text-[10px] font-bold text-slate-400">
                    <p>© 2026 PT. Kola Borasi Indonesia</p>
                    <p>Sistem ERP Internal - Inventory Module</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Entri</p>
                    <p className="text-xl font-black text-primary">{products.length} Items</p>
                </div>
            </div>

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 1cm;
                    }
                    .no-print {
                        display: none !important;
                    }
                    body {
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }
                }
            `}</style>
        </div>
    );
}
