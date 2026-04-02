"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Trash2, Edit2, Eye, Download, FileText } from "lucide-react";
import { ReportPreviewModal } from "@/components/ReportPreviewModal";
import { format } from "date-fns";
import { ReceiptModal } from "./ReceiptModal";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { deleteGoodsReceiptAction, deletePurchaseReturnAction } from "@/app/actions";
import { DashboardStats } from "../components/DashboardStats";
import Link from "next/link";
import { exportToExcel } from "@/lib/excel";
import { ReturnModal } from "./ReturnModal";
import { SupplierModal } from "@/components/modals/SupplierModal";
import { BuyerModal } from "@/components/modals/BuyerModal";
import { ProductModal } from "@/components/modals/ProductModal";

export function PurchaseDashboard({ initialReceipts, initialReturns, products, warehouses, vendors }: {
    initialReceipts: any[],
    initialReturns: any[],
    products: any[],
    warehouses: any[],
    vendors: any[]
}) {
    const { data: session } = useSession() as any;
    const isAdmin = session?.user?.role === "ADMIN";
    const userRole = session?.user?.role || "";

    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [editData, setEditData] = useState<any>(null);

    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [previewTitle, setPreviewTitle] = useState("");

    const [activeTab, setActiveTab] = useState<"LPB" | "RETUR">("LPB");
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Quick Add Modals States
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [showBuyerModal, setShowBuyerModal] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus penerimaan ini? Stok akan otomatis dikurangi kembali dan jurnal akan dihapus.")) return;
        try {
            await deleteGoodsReceiptAction(id);
            alert("Penerimaan berhasil dihapus");
        } catch (e) {
            alert("Gagal menghapus penerimaan");
        }
    };

    const handleDeleteReturn = async (id: string) => {
        if (!confirm("Hapus retur ini? Stok akan dikembalikan (revert) dan dampak finansial akan dibatalkan.")) return;
        try {
            await deletePurchaseReturnAction(id);
            alert("Retur berhasil dihapus");
        } catch (e: any) {
            alert(e.message || "Gagal menghapus retur");
        }
    };

    const filteredReceipts = initialReceipts.filter(r =>
        r.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.receivedFrom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.formNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExport = () => {
        const data = filteredReceipts.map(r => ({
            'No. Form': r.formNumber,
            'Tanggal': format(new Date(r.date || r.createdAt), "dd/MM/yyyy"),
            'Terima Dari': r.receivedFrom,
            'No. Terima': r.receiptNumber,
            'Gudang': r.warehouse.name,
            'Sales Person': r.salesPerson,
            'Total Qty': r.items.reduce((acc: number, i: any) => acc + i.quantity, 0),
            'Total Harga': r.items.reduce((acc: number, i: any) => acc + (i.quantity * Number(i.purchasePrice || 0)), 0),
            'Status': r.isVerified ? 'VERIFIED' : 'PENDING'
        }));
        exportToExcel(data, 'Laporan_Penerimaan_Barang', 'Penerimaan');
    };

    const handlePreview = () => {
        const data = filteredReceipts.map(r => ({
            'No. Form': r.formNumber,
            'Tanggal': format(new Date(r.date || r.createdAt), "dd/MM/yyyy"),
            'Terima Dari': r.receivedFrom,
            'No. Terima': r.receiptNumber,
            'Gudang': r.warehouse.name,
            'Sales Person': r.salesPerson,
            'Qty': r.items.reduce((acc: number, i: any) => acc + i.quantity, 0),
            'Total Harga': Number(r.items.reduce((acc: number, i: any) => acc + (i.quantity * Number(i.purchasePrice || 0)), 0)),
            'Status': r.isVerified ? 'VERIFIED' : 'PENDING'
        }));
        setPreviewData(data);
        setPreviewTitle("Riwayat Penerimaan Barang (LPB)");
        setShowPreview(true);
    };

    const filteredReturns = initialReturns?.filter(r =>
        r.returnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.receipt?.receivedFrom.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Header Section */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">LOGISTIK & PEMBELIAN</h1>
                    <p className="text-slate-500 font-medium text-sm mt-1">Kelola penerimaan barang dan retur supplier</p>
                </div>
                
                <div className="flex flex-wrap gap-3 w-full xl:w-auto">
                    <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 w-full sm:w-auto">
                        <button 
                            onClick={() => setActiveTab("LPB")}
                            className={cn(
                                "flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                activeTab === "LPB" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Pembelian
                        </button>
                        <button 
                            onClick={() => setActiveTab("RETUR")}
                            className={cn(
                                "flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                activeTab === "RETUR" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Retur
                        </button>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                        {activeTab === "LPB" ? (
                            <button
                                onClick={() => setShowReceiptModal(true)}
                                className="flex-1 sm:flex-none bg-primary text-white px-8 py-3 rounded-2xl flex items-center justify-center gap-3 hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95 font-black text-xs uppercase tracking-widest"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Input LPB</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowReturnModal(true)}
                                className="flex-1 sm:flex-none bg-rose-600 text-white px-8 py-3 rounded-2xl flex items-center justify-center gap-3 hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all active:scale-95 font-black text-xs uppercase tracking-widest"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Input Retur</span>
                            </button>
                        )}
                        <button
                            onClick={handleExport}
                            className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-sm group"
                            title="Export Excel"
                        >
                            <Download className="h-5 w-5 text-slate-400 group-hover:text-primary" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Actions & Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3">
                    <DashboardStats />
                </div>
                <div className="erp-card bg-slate-900 border-none p-6 text-white flex flex-col justify-between overflow-hidden relative group min-h-[200px]">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Plus className="h-24 w-24" />
                    </div>
                    <div className="relative z-10">
                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Quick Add Data</h4>
                        <div className="grid grid-cols-1 gap-2">
                            <button onClick={() => setShowSupplierModal(true)} className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 text-sm font-bold">
                                <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400"><Plus className="h-4 w-4" /></div>
                                Supplier Baru
                            </button>
                            <button onClick={() => setShowProductModal(true)} className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 text-sm font-bold">
                                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Plus className="h-4 w-4" /></div>
                                Barang Baru
                            </button>
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-6 font-bold uppercase tracking-widest">Master Data Shortcuts</p>
                </div>
            </div>

            {/* Search & Main Content */}
            <div className="erp-card bg-white p-0 overflow-hidden shadow-xl border-slate-200">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/30">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "p-2 rounded-xl border",
                            activeTab === "LPB" ? "bg-primary/10 border-primary/20 text-primary" : "bg-rose-100 border-rose-200 text-rose-600"
                        )}>
                            <FileText className="h-5 w-5" />
                        </div>
                        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                            {activeTab === "LPB" ? "Daftar Penerimaan Barang" : "Daftar Retur Pembelian"}
                        </h2>
                    </div>
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder={activeTab === "LPB" ? "Cari No. Form, Supplier, atau No. SJ..." : "Cari No. Retur atau Vendor..."}
                            className="erp-input pl-12 h-12"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="table-erp">
                        <thead>
                            {activeTab === "LPB" ? (
                                <tr>
                                    <th className="w-16 text-center">#</th>
                                    <th>Ref. Tracking</th>
                                    <th>Supplier</th>
                                    <th className="text-center">No. Terima</th>
                                    <th className="text-center">Gudang</th>
                                    <th className="text-right">Qty</th>
                                    <th className="text-right">Tanggal</th>
                                    <th className="text-center w-40">Aksi</th>
                                </tr>
                            ) : (
                                <tr>
                                    <th className="w-16 text-center">#</th>
                                    <th>No. Retur</th>
                                    <th>Ref. LPB</th>
                                    <th>Supplier / Vendor</th>
                                    <th className="text-center">Status</th>
                                    <th className="text-right">Qty</th>
                                    <th className="text-right">Tanggal</th>
                                    <th className="text-center w-24">Aksi</th>
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {activeTab === "LPB" ? (
                                filteredReceipts.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-20 text-center">
                                            <p className="text-slate-400 font-bold italic uppercase tracking-widest text-xs">Belum ada data penerimaan barang.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredReceipts.map((r: any, idx: number) => (
                                        <tr key={r.id}>
                                            <td className="text-center text-slate-400">{idx + 1}</td>
                                            <td className="font-mono text-primary font-black text-xs uppercase tracking-tight">{r.formNumber}</td>
                                            <td>
                                                <div className="font-black text-slate-800 uppercase tracking-tight truncate max-w-[200px]" title={r.receivedFrom}>{r.receivedFrom}</div>
                                            </td>
                                            <td className="text-center font-bold text-slate-500">{r.receiptNumber}</td>
                                            <td className="text-center">
                                                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200">
                                                    {r.warehouse.name}
                                                </span>
                                            </td>
                                            <td className="text-right font-black text-slate-900">
                                                {r.items.reduce((acc: number, i: any) => acc + i.quantity, 0)}
                                            </td>
                                            <td className="text-right text-slate-500 whitespace-nowrap">
                                                {isClient ? format(new Date(r.date || r.createdAt), "dd MMM yyyy") : "..."}
                                            </td>
                                            <td>
                                                <div className="flex items-center justify-center gap-2">
                                                    <Link
                                                        href={`/purchase/print/${r.id}`}
                                                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                                                        title="Cetak LPB"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Link>
                                                    <Link
                                                        href={`/purchase/print/invoice/${r.id}`}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                        title="Cetak Invoice"
                                                    >
                                                        <FileText className="h-4 w-4" />
                                                    </Link>
                                                    <button
                                                        onClick={() => {
                                                            setEditData(r);
                                                            setShowReceiptModal(true);
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl"
                                                        disabled={r.isVerified && !isAdmin && userRole !== "PURCHASE"}
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    {(isAdmin || userRole === "PURCHASE") && (
                                                        <button
                                                            onClick={() => handleDelete(r.id)}
                                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )
                            ) : (
                                filteredReturns.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-20 text-center text-rose-400">
                                            <p className="font-bold italic uppercase tracking-widest text-xs">Belum ada riwayat retur pembelian.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredReturns.map((r: any, idx: number) => (
                                        <tr key={r.id}>
                                            <td className="text-center text-rose-200">{idx + 1}</td>
                                            <td className="font-mono font-black text-rose-600 text-xs uppercase tracking-tight">{r.returnNumber}</td>
                                            <td className="text-slate-500 font-bold">{r.receipt?.receiptNumber}</td>
                                            <td>
                                                <div className="font-bold text-slate-700 truncate max-w-[250px]" title={r.receipt?.receivedFrom}>{r.receipt?.receivedFrom}</div>
                                            </td>
                                            <td className="text-center">
                                                {r.status === "PENDING" ? (
                                                    <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black rounded-lg border border-amber-100 uppercase tracking-widest animate-pulse">PENDING</span>
                                                ) : (
                                                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-lg border border-emerald-100 uppercase tracking-widest">VERIFIED</span>
                                                )}
                                            </td>
                                            <td className="text-right font-black text-rose-600">
                                                {r.items?.reduce((acc: number, i: any) => acc + i.quantity, 0)}
                                            </td>
                                            <td className="text-right text-slate-500">
                                                {isClient ? format(new Date(r.date || r.createdAt), "dd MMM yyyy") : "..."}
                                            </td>
                                            <td>
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditData(r);
                                                            setShowReturnModal(true);
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl"
                                                        disabled={r.status !== "PENDING"}
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteReturn(r.id)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            {showReceiptModal && (
                <ReceiptModal
                    products={products}
                    warehouses={warehouses}
                    vendors={vendors}
                    initialData={editData}
                    onClose={() => {
                        setShowReceiptModal(false);
                        setEditData(null);
                    }}
                />
            )}

            {showReturnModal && (
                <ReturnModal
                    receipts={initialReceipts}
                    initialData={editData}
                    onClose={() => {
                        setShowReturnModal(false);
                        setEditData(null);
                    }}
                />
            )}

            {showPreview && (
                <ReportPreviewModal
                    title={previewTitle}
                    data={previewData}
                    onClose={() => setShowPreview(false)}
                    onExport={handleExport}
                />
            )}
            {showSupplierModal && (
                <SupplierModal
                    onClose={() => setShowSupplierModal(false)}
                    onSuccess={(newSupplier) => {
                        window.location.reload();
                    }}
                />
            )}

            {showBuyerModal && (
                <BuyerModal
                    onClose={() => setShowBuyerModal(false)}
                    onSuccess={(newBuyer) => {
                        window.location.reload();
                    }}
                />
            )}

            {showProductModal && (
                <ProductModal
                    onClose={() => setShowProductModal(false)}
                    onSuccess={(newProduct) => {
                        window.location.reload();
                    }}
                />
            )}
        </div>
    );
}
