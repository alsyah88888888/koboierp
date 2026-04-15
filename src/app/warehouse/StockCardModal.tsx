"use client";

import { useState, useMemo, useEffect } from "react";
import { callAction } from "@/proxy";
import { X, FileText, Printer, Search, Calendar, Warehouse as WarehouseIcon, ArrowUpRight, ArrowDownLeft, Trash2 } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

interface Product {
    id: string;
    sku: string;
    name: string;
}

interface Warehouse {
    id: string;
    name: string;
}

export function StockCardModal({ 
    initialProductId, 
    products, 
    warehouses, 
    onClose 
}: { 
    initialProductId?: string, 
    products: Product[], 
    warehouses: Warehouse[], 
    onClose: () => void 
}) {
    const [productId, setProductId] = useState(initialProductId || "");
    const [warehouseId, setWarehouseId] = useState("");
    const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchData = async () => {
        if (!productId) return;
        setIsLoading(true);
        try {
            const result = await callAction("getStockCard", { productId, startDate, endDate, warehouseId });
            setData(result);
        } catch (error) {
            alert("Gagal mengambil data kartu stok");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (initialProductId) fetchData();
    }, []);

    const handlePrint = () => {
        window.print();
    };

    const selectedProduct = products.find(p => p.id === productId);

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300 overflow-y-auto">
            {/* Modal Container */}
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl my-auto overflow-hidden flex flex-col animate-in zoom-in duration-300 print:shadow-none print:rounded-none print:max-w-none print:m-0">
                
                {/* Header (Hidde on print usually, but we want a custom print header) */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 print:hidden">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100">
                            <FileText className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Kartu Stok Barang</h2>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest opacity-70">Stock Movement Tracking & Audit</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handlePrint}
                            disabled={!data || isLoading}
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                        >
                            <Printer className="h-4 w-4" />
                            Print Card
                        </button>
                        <button onClick={onClose} className="p-2.5 hover:bg-white hover:shadow-md rounded-xl transition-all border border-slate-200 bg-slate-50 text-slate-400 hover:text-red-500">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Filters Board - Print: Hidden */}
                <div className="p-8 bg-white border-b border-slate-50 print:hidden">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Pilih Produk (SKU)</label>
                            <select 
                                value={productId} 
                                onChange={e => setProductId(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-indigo-500 focus:bg-white transition-all outline-none appearance-none"
                            >
                                <option value="">-- Pilih Produk --</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Dari Tanggal</label>
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={e => setStartDate(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-indigo-500 focus:bg-white transition-all outline-none" 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Sampai Tanggal</label>
                            <input 
                                type="date" 
                                value={endDate} 
                                onChange={e => setEndDate(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-indigo-500 focus:bg-white transition-all outline-none" 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Gudang (Opsional)</label>
                            <select 
                                value={warehouseId} 
                                onChange={e => setWarehouseId(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-indigo-500 focus:bg-white transition-all outline-none appearance-none"
                            >
                                <option value="">Semua Gudang</option>
                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                        <div className="md:col-start-4">
                            <button 
                                onClick={fetchData}
                                disabled={!productId || isLoading}
                                className="w-full py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-50"
                            >
                                {isLoading ? "Memuat..." : "Tampilkan Card"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Print Content Area */}
                <div id="print-area" className="flex-1 overflow-y-auto p-8 bg-slate-50/30 custom-scrollbar print:overflow-visible print:p-0 print:bg-white">
                    {data ? (
                        <div className="space-y-8 print:space-y-4">
                            {/* Premium Header - Visible on Print & Screen */}
                            <div className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-2xl relative overflow-hidden print:rounded-none print:shadow-none print:p-6">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
                                <div className="relative z-10 flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
                                    <div>
                                        <h1 className="text-3xl font-black tracking-tighter uppercase mb-1">PT KOLA BORASI INDONESIA</h1>
                                        <p className="text-indigo-400 font-black text-xs uppercase tracking-[0.3em]">Kartu Riwayat Stok Barang</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="px-4 py-2 bg-white/10 rounded-xl border border-white/10 inline-block">
                                            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-0.5">Periode Laporan</p>
                                            <p className="text-sm font-bold">{format(new Date(startDate), "dd MMM yyyy")} - {format(new Date(endDate), "dd MMM yyyy")}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Product Info Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3">
                                <div className="p-6 bg-white border-2 border-slate-100 rounded-3xl shadow-sm print:p-4 print:border">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nama Produk / Item</p>
                                    <h3 className="text-lg font-black text-slate-900">{data.product.name}</h3>
                                </div>
                                <div className="p-6 bg-white border-2 border-slate-100 rounded-3xl shadow-sm print:p-4 print:border">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">SKU / Kode Barang</p>
                                    <h3 className="text-lg font-black text-indigo-600 font-mono tracking-tighter">{data.product.sku}</h3>
                                </div>
                                <div className="p-6 bg-white border-2 border-slate-100 rounded-3xl shadow-sm print:p-4 print:border">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Satuan & Gudang</p>
                                    <h3 className="text-lg font-black text-slate-900">{data.product.uom} <span className="text-xs text-slate-400 ml-2">/ {data.warehouseName}</span></h3>
                                </div>
                            </div>

                            {/* Main Table */}
                            <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] shadow-xl overflow-hidden print:border print:rounded-none print:shadow-none">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b-2 border-slate-100">
                                            <th className="px-6 py-5 uppercase text-[10px] font-black tracking-widest text-slate-500 w-12 text-center">No</th>
                                            <th className="px-6 py-5 uppercase text-[10px] font-black tracking-widest text-slate-500">Tanggal</th>
                                            <th className="px-6 py-5 uppercase text-[10px] font-black tracking-widest text-slate-500">Ref. Transaksi</th>
                                            <th className="px-6 py-5 uppercase text-[10px] font-black tracking-widest text-slate-500">Keterangan</th>
                                            <th className="px-6 py-5 uppercase text-[10px] font-black tracking-widest text-emerald-600 text-right">Masuk</th>
                                            <th className="px-6 py-5 uppercase text-[10px] font-black tracking-widest text-rose-600 text-right">Keluar</th>
                                            <th className="px-6 py-5 uppercase text-[10px] font-black tracking-widest text-slate-900 text-right">Saldo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {/* Saldo Awal Row */}
                                        <tr className="bg-slate-50/50 font-bold italic">
                                            <td className="px-6 py-4 text-center">-</td>
                                            <td className="px-6 py-4" colSpan={3}>
                                                <span className="uppercase text-[10px] tracking-widest opacity-60">Saldo Awal (Sebelum {format(new Date(startDate), "dd/MM/yyyy")})</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">-</td>
                                            <td className="px-6 py-4 text-right">-</td>
                                            <td className="px-6 py-4 text-right text-lg">{data.openingBalance.toLocaleString()}</td>
                                        </tr>

                                        {data.history.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-20 text-center text-slate-400 font-medium italic">Tidak ada mutasi dalam periode ini.</td>
                                            </tr>
                                        ) : (
                                            data.history.map((m: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                                                    <td className="px-6 py-4 text-center font-bold text-slate-400">{idx + 1}</td>
                                                    <td className="px-6 py-4 font-bold text-slate-700">{format(new Date(m.date), "dd/MM/yyyy HH:mm")}</td>
                                                    <td className="px-6 py-4 font-mono text-[11px] font-black text-indigo-600">{m.ref}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-[10px] font-black uppercase text-slate-800 tracking-tight">{m.type}</div>
                                                        <div className="text-[8px] font-bold text-slate-400 mt-0.5">{m.warehouse} - {m.vendor}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-black text-emerald-600 text-lg">{m.qtyIn > 0 ? `+${m.qtyIn.toLocaleString()}` : "-"}</td>
                                                    <td className="px-6 py-4 text-right font-black text-rose-600 text-lg">{m.qtyOut > 0 ? `-${m.qtyOut.toLocaleString()}` : "-"}</td>
                                                    <td className="px-6 py-4 text-right font-black text-slate-900 text-xl">{m.balance.toLocaleString()}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                    <tfoot className="bg-slate-900 text-white">
                                        <tr className="font-black uppercase tracking-widest text-[10px]">
                                            <td colSpan={4} className="px-6 py-5 text-right opacity-60">Total Periode & Saldo Akhir</td>
                                            <td className="px-6 py-5 text-right text-base text-emerald-400">+{data.totalIn.toLocaleString()}</td>
                                            <td className="px-6 py-5 text-right text-base text-rose-400">-{data.totalOut.toLocaleString()}</td>
                                            <td className="px-6 py-5 text-right text-2xl">{data.finalBalance.toLocaleString()}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* Manual Log Section (Visible on Print or specific request) */}
                            <div className="mt-8 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-px bg-slate-200 flex-1" />
                                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Log Pengambilan Barang (Manual)</h3>
                                    <div className="h-px bg-slate-200 flex-1" />
                                </div>
                                
                                <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden print:border print:rounded-none">
                                    <table className="w-full text-xs text-left border-collapse">
                                        <thead className="bg-slate-50 border-b border-slate-100">
                                            <tr>
                                                <th className="px-4 py-3 border-r w-10 text-center font-black uppercase tracking-tighter">No</th>
                                                <th className="px-4 py-3 border-r w-32 font-black uppercase tracking-tighter">Tanggal</th>
                                                <th className="px-4 py-3 border-r font-black uppercase tracking-tighter">Pengambil / Keperluan</th>
                                                <th className="px-4 py-3 border-r w-24 font-black uppercase tracking-tighter text-right">Keluar</th>
                                                <th className="px-4 py-3 border-r w-24 font-black uppercase tracking-tighter text-right">Sisa Stok</th>
                                                <th className="px-4 py-3 w-28 font-black uppercase tracking-tighter text-center">Paraf</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                                <tr key={i} className="border-b h-12">
                                                    <td className="border-r text-center text-slate-300">{i}</td>
                                                    <td className="border-r"></td>
                                                    <td className="border-r"></td>
                                                    <td className="border-r"></td>
                                                    <td className="border-r"></td>
                                                    <td></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-end pt-10 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest print:pt-4">
                                <div className="text-center w-48">
                                    <p className="mb-16">Warehouse Admin</p>
                                    <div className="h-px bg-slate-200 w-full mb-1" />
                                    <p>( ........................... )</p>
                                </div>
                                <div className="text-right italic">
                                    Printed: {format(new Date(), "dd/MM/yyyy HH:mm:ss")}
                                </div>
                                <div className="text-center w-48 font-black">
                                    <p className="mb-16">Warehouse Manager</p>
                                    <div className="h-px bg-slate-200 w-full mb-1" />
                                    <p>( ........................... )</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-[400px] flex flex-col items-center justify-center text-slate-400">
                            <div className="p-6 bg-slate-100 rounded-full mb-4">
                                <Search className="h-12 w-12 opacity-20" />
                            </div>
                            <p className="font-black uppercase tracking-widest text-xs">Pilih produk dan tentukan periode</p>
                            <p className="text-[10px] font-bold opacity-60">untuk menampilkan riwayat mutasi stok barang</p>
                        </div>
                    )}
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        size: landscape;
                        margin: 10mm;
                    }
                    body * {
                        visibility: hidden;
                    }
                    #print-area, #print-area * {
                        visibility: visible;
                    }
                    #print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        background: white !important;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
