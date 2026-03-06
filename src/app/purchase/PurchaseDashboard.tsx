"use client";

import { useState } from "react";
import { Plus, Search, Trash2, Edit2, Eye, Download } from "lucide-react";
import { ReportPreviewModal } from "@/components/ReportPreviewModal";
import { format } from "date-fns";
import { ReceiptModal } from "./ReceiptModal";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { deleteGoodsReceiptAction } from "@/app/actions";
import { DashboardStats } from "../components/DashboardStats";
import Link from "next/link";
import { exportToExcel } from "@/lib/excel";
import { ReturnModal } from "./ReturnModal";

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

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus penerimaan ini? Stok akan otomatis dikurangi kembali dan jurnal akan dihapus.")) return;
        try {
            await deleteGoodsReceiptAction(id);
            alert("Penerimaan berhasil dihapus");
        } catch (e) {
            alert("Gagal menghapus penerimaan");
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hide-print">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-primary">Modul Pembelian</h2>
                    <p className="text-muted-foreground tracking-tight">Kelola pembelian barang gudang (LPB).</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={handlePreview}
                        className="bg-white border-2 border-emerald-600 text-emerald-600 px-6 py-2 rounded-md flex items-center gap-2 hover:bg-emerald-50 transition-all font-bold shadow-sm active:scale-95"
                    >
                        <Eye className="h-5 w-5" />
                        <span>Preview Laporan</span>
                    </button>
                    <button
                        onClick={handleExport}
                        className="bg-emerald-600 text-white px-6 py-2 rounded-md flex items-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95 font-bold"
                    >
                        <Download className="h-5 w-5" />
                        <span>Export Excel</span>
                    </button>
                    {activeTab === "LPB" ? (
                        <button
                            onClick={() => setShowReceiptModal(true)}
                            className="bg-primary text-white px-6 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95 font-bold"
                        >
                            <Plus className="h-5 w-5 text-white" />
                            <span className="text-white">Input Penerimaan</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowReturnModal(true)}
                            className="bg-rose-600 text-white px-6 py-2 rounded-md flex items-center gap-2 hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all active:scale-95 font-bold"
                        >
                            <Plus className="h-5 w-5 text-white" />
                            <span className="text-white">Ajukan Retur</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="hide-print">
                <DashboardStats />
            </div>

            <div className="flex gap-4 border-b hide-print">
                <button
                    onClick={() => setActiveTab("LPB")}
                    className={cn(
                        "pb-3 px-4 font-bold text-sm transition-colors border-b-2",
                        activeTab === "LPB" ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                    )}
                >
                    Pembelian (LPB)
                </button>
                <button
                    onClick={() => setActiveTab("RETUR")}
                    className={cn(
                        "pb-3 px-4 font-bold text-sm transition-colors border-b-2",
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

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/30 text-muted-foreground border-b text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">No. Form (Tracking)</th>
                                    <th className="px-6 py-4">Terima Dari</th>
                                    <th className="px-6 py-4">No. Terima</th>
                                    <th className="px-6 py-4">Gudang</th>
                                    <th className="px-6 py-4 text-right">Qty Barang</th>
                                    <th className="px-6 py-4 text-right">Tanggal</th>
                                    <th className="px-6 py-4 text-center w-10">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredReceipts.map((r: any) => (
                                    <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                                        <td className="px-6 py-4 font-mono text-primary font-medium">{r.formNumber}</td>
                                        <td className="px-6 py-4 font-medium">{r.receivedFrom}</td>
                                        <td className="px-6 py-4">{r.receiptNumber}</td>
                                        <td className="px-6 py-4">
                                            <span className="bg-muted px-2 py-0.5 rounded text-[10px] uppercase font-bold">
                                                {r.warehouse.name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {r.items.reduce((acc: number, i: any) => acc + i.quantity, 0)}
                                        </td>
                                        <td className="px-6 py-4 text-right text-muted-foreground">
                                            {format(new Date(r.date || r.createdAt), "dd/MM/yyyy")}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Link
                                                    href={`/purchase/print/${r.id}`}
                                                    className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-lg transition-colors"
                                                    title="Lihat Form"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Link>
                                                <button
                                                    onClick={() => {
                                                        setEditData(r);
                                                        setShowReceiptModal(true);
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                    title="Edit Data"
                                                    disabled={r.isVerified && !isAdmin && userRole !== "PURCHASE"}
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                {isAdmin && (
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
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-rose-50 border-b border-rose-100 text-rose-800 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">No. Retur</th>
                                    <th className="px-6 py-4">Tanggal Pengajuan</th>
                                    <th className="px-6 py-4">Ref. Penerimaan (LPB)</th>
                                    <th className="px-6 py-4">Vendor</th>
                                    <th className="px-6 py-4 text-center">Qty Diretur</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-rose-50">
                                {filteredReturns.map((r: any) => (
                                    <tr key={r.id} className="hover:bg-rose-50/50 transition-colors">
                                        <td className="px-6 py-4 font-mono font-bold text-rose-600">{r.returnNumber}</td>
                                        <td className="px-6 py-4 text-slate-500">{format(new Date(r.date || r.createdAt), "dd/MM/yyyy")}</td>
                                        <td className="px-6 py-4 text-slate-600">{r.receipt?.receiptNumber}</td>
                                        <td className="px-6 py-4 font-medium text-slate-700">{r.receipt?.receivedFrom}</td>
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
                    onClose={() => setShowReturnModal(false)}
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
        </div>
    );
}
