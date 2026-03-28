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
        setShowPreview(true);
    };

    const filteredReturns = initialReturns?.filter(r =>
        r.returnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.receipt?.receivedFrom.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 hide-print mb-4 px-1">
                <div className="flex flex-wrap gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    <div className="bg-white border rounded-xl p-1 flex gap-1 shadow-sm shrink-0">
                        <button onClick={() => setShowSupplierModal(true)} className="hover:bg-slate-50 px-3 py-1.5 rounded-lg font-bold text-[10px] md:text-xs transition-colors flex items-center gap-1.5 text-slate-600 whitespace-nowrap">
                            <Plus className="h-3 w-3" /> Supplier
                        </button>
                        <button onClick={() => setShowBuyerModal(true)} className="hover:bg-slate-50 px-3 py-1.5 rounded-lg font-bold text-[10px] md:text-xs transition-colors flex items-center gap-1.5 text-slate-600 whitespace-nowrap">
                            <Plus className="h-3 w-3" /> Buyer
                        </button>
                        <button onClick={() => setShowProductModal(true)} className="hover:bg-slate-50 px-3 py-1.5 rounded-lg font-bold text-[10px] md:text-xs transition-colors flex items-center gap-1.5 text-slate-600 whitespace-nowrap">
                            <Plus className="h-3 w-3" /> Barang
                        </button>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center md:justify-end w-full md:w-auto">
                    <button
                        onClick={handlePreview}
                        className="bg-white border-2 border-emerald-600 text-emerald-600 px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-50 transition-all font-bold shadow-sm active:scale-95 flex-1 sm:flex-none"
                    >
                        <Eye className="h-5 w-5" />
                        <span>Preview</span>
                    </button>
                    <button
                        onClick={handleExport}
                        className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95 font-bold flex-1 sm:flex-none"
                    >
                        <Download className="h-5 w-5" />
                        <span>Export</span>
                    </button>

                    <div className="flex-1 sm:flex-none">
                        {activeTab === "LPB" ? (
                            <button
                                onClick={() => setShowReceiptModal(true)}
                                className="bg-primary text-white px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95 font-bold w-full"
                            >
                                <Plus className="h-5 w-5 text-white" />
                                <span className="text-white">Input LPB</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowReturnModal(true)}
                                className="bg-rose-600 text-white px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all active:scale-95 font-bold w-full"
                            >
                                <Plus className="h-5 w-5 text-white" />
                                <span className="text-white">Retur</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="hide-print">
                <DashboardStats />
            </div>

            <div className="flex overflow-x-auto whitespace-nowrap gap-4 border-b hide-print custom-scrollbar scrollbar-hide">
                <button
                    onClick={() => setActiveTab("LPB")}
                    className={cn(
                        "pb-3 px-4 font-bold text-sm transition-colors border-b-2 shrink-0",
                        activeTab === "LPB" ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                    )}
                >
                    Pembelian
                </button>
                <button
                    onClick={() => setActiveTab("RETUR")}
                    className={cn(
                        "pb-3 px-4 font-bold text-sm transition-colors border-b-2 shrink-0",
                        activeTab === "RETUR" ? "border-rose-600 text-rose-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                    )}
                >
                    Retur Pembelian
                </button>
            </div>

            {activeTab === "LPB" && (
                <div className="rounded-xl border bg-card shadow-sm">
                    <div className="p-6 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-primary">
                        <h3 className="text-lg font-bold capitalize">Data Pembelian</h3>
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Cari..."
                                className="w-full pl-10 pr-4 py-2 bg-muted/50 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-sm text-left min-w-[1000px] table-fixed">
                            <thead className="bg-muted/30 text-muted-foreground border-b text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 w-48">No. Form (Tracking)</th>
                                    <th className="px-6 py-4">Terima Dari</th>
                                    <th className="px-6 py-4 w-40 text-center">No. Terima</th>
                                    <th className="px-6 py-4 w-40 text-center">Gudang</th>
                                    <th className="px-6 py-4 text-right w-32">Qty Barang</th>
                                    <th className="px-6 py-4 text-right w-32">Tanggal</th>
                                    <th className="px-6 py-4 text-center w-36">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-slate-700">
                                {filteredReceipts.map((r: any) => (
                                    <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                                        <td className="px-6 py-4 font-mono text-primary font-medium truncate" title={r.formNumber}>{r.formNumber}</td>
                                        <td className="px-6 py-4 font-medium truncate" title={r.receivedFrom}>{r.receivedFrom}</td>
                                        <td className="px-6 py-4 text-center truncate" title={r.receiptNumber}>{r.receiptNumber}</td>
                                        <td className="px-6 py-4">
                                            <span className="bg-muted px-2 py-0.5 rounded text-[10px] uppercase font-bold">
                                                {r.warehouse.name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {r.items.reduce((acc: number, i: any) => acc + i.quantity, 0)}
                                        </td>
                                        <td className="px-6 py-4 text-right text-muted-foreground">
                                            {isClient ? format(new Date(r.date || r.createdAt), "dd/MM/yyyy") : "..."}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Link
                                                    href={`/purchase/print/${r.id}`}
                                                    className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1"
                                                    title="Cetak LPB (Penerimaan)"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    <span className="text-[10px] font-bold">LPB</span>
                                                </Link>
                                                <Link
                                                    href={`/purchase/print/invoice/${r.id}`}
                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1"
                                                    title="Cetak Invoice (Faktur)"
                                                >
                                                    <FileText className="h-4 w-4" />
                                                    <span className="text-[10px] font-bold">INV</span>
                                                </Link>
                                                <button
                                                    onClick={() => {
                                                        setEditData(r);
                                                        setShowReceiptModal(true);
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                    title="Edit Data"
                                                    disabled={r.isVerified && !isAdmin && userRole !== "PURCHASE" && userRole !== "SALES"}
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                {(isAdmin || userRole === "PURCHASE" || userRole === "SALES") && (
                                                    <button
                                                        onClick={() => handleDelete(r.id)}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Hapus Penerimaan"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredReceipts.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground italic">
                                            Belum ada data penerimaan barang.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === "RETUR" && (
                <div className="rounded-xl border border-rose-100 bg-white shadow-sm overflow-hidden">
                    <div className="p-6 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-rose-50/30">
                        <h3 className="text-lg font-bold text-rose-800 capitalize">Riwayat Retur Pembelian</h3>
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-400" />
                            <input
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Cari No Retur / Vendor..."
                                className="w-full pl-10 pr-4 py-2 bg-white border-rose-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-sm text-left min-w-[1000px] table-fixed">
                            <thead className="bg-rose-50 border-b border-rose-100 text-rose-800 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 w-40">No. Retur</th>
                                    <th className="px-6 py-4 w-40">Tanggal Pengajuan</th>
                                    <th className="px-6 py-4 w-52">Ref. Penerimaan (LPB)</th>
                                    <th className="px-6 py-4">Vendor</th>
                                    <th className="px-6 py-4 text-center w-32">Qty Diretur</th>
                                    <th className="px-6 py-4 text-center w-32">Status</th>
                                    <th className="px-6 py-4 text-center w-24">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-rose-50 text-slate-700">
                                {filteredReturns.map((r: any) => (
                                    <tr key={r.id} className="hover:bg-rose-50/50 transition-colors">
                                        <td className="px-6 py-4 font-mono font-bold text-rose-600 truncate" title={r.returnNumber}>{r.returnNumber}</td>
                                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{isClient ? format(new Date(r.date || r.createdAt), "dd/MM/yyyy") : "..."}</td>
                                        <td className="px-6 py-4 text-slate-600 truncate" title={r.receipt?.receiptNumber}>{r.receipt?.receiptNumber}</td>
                                        <td className="px-6 py-4 font-medium text-slate-700">
                                            <div className="truncate max-w-[250px]" title={r.receipt?.receivedFrom}>{r.receipt?.receivedFrom}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-rose-600">
                                            {r.items?.reduce((acc: number, i: any) => acc + i.quantity, 0)} Items
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {r.status === "PENDING" ? (
                                                <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full border border-amber-200">PENDING</span>
                                            ) : (
                                                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">VERIFIED</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditData(r);
                                                        setShowReturnModal(true);
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                    title="Edit Retur"
                                                    disabled={r.status !== "PENDING"}
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteReturn(r.id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Hapus Retur"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredReturns.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-rose-400 italic">
                                            Belum ada riwayat retur pembelian barang.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

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
                        window.location.reload(); // Simple reload to refetch initial data
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
