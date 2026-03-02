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

export function PurchaseDashboard({ initialReceipts, products, warehouses, vendors }: {
    initialReceipts: any[],
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
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hide-print">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-primary">Modul Penerimaan Barang</h2>
                    <p className="text-muted-foreground tracking-tight">Kelola penerimaan barang gudang (LPB).</p>
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
                    <button
                        onClick={() => setShowReceiptModal(true)}
                        className="bg-primary text-white px-6 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95 font-bold"
                    >
                        <Plus className="h-5 w-5 text-white" />
                        <span className="text-white">Input Penerimaan</span>
                    </button>
                </div>
            </div>

            <div className="hide-print">
                <DashboardStats />
            </div>

            <div className="rounded-xl border bg-card shadow-sm">
                <div className="p-6 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-primary">
                    <h3 className="text-lg font-bold capitalize">Data Penerimaan Barang</h3>
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
                                                disabled={r.isVerified && !isAdmin}
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
