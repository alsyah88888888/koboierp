"use client";

import { useState } from "react";
import { Plus, Clock, FileText, Search, Trash2, Printer as PrintIcon, Edit2, Eye } from "lucide-react";
import { format } from "date-fns";
import { ReceiptModal } from "./ReceiptModal";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { deleteGoodsReceiptAction } from "@/app/actions";
import { DashboardStats } from "../components/DashboardStats";
import Link from "next/link";

export function PurchaseDashboard({ initialReceipts, products, warehouses }: { initialReceipts: any[], products: any[], warehouses: any[] }) {
    const { data: session } = useSession() as any;
    const isAdmin = session?.user?.role === "ADMIN";
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [editData, setEditData] = useState<any>(null);

    const handlePrint = () => {
        window.print();
    };

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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center hide-print">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-primary">Penerimaan Barang (Purchase)</h2>
                    <p className="text-muted-foreground">Input dan monitoring surat penerimaan barang untuk stok gudang.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handlePrint}
                        className="bg-white border-2 border-slate-200 text-slate-700 px-6 py-2 rounded-md flex items-center gap-2 hover:bg-slate-50 transition-all font-bold"
                    >
                        <FileText className="h-5 w-5" />
                        <span>Cetak Bukti Terima</span>
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

            <div className="grid gap-4 md:grid-cols-4">
                <div className="p-6 rounded-xl border bg-card shadow-sm">
                    <div className="flex justify-between items-start">
                        <p className="text-sm font-medium text-muted-foreground">Total Penerimaan</p>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <h3 className="text-2xl font-bold mt-2">{initialReceipts.length}</h3>
                </div>
                <div className="p-6 rounded-xl border bg-card shadow-sm">
                    <div className="flex justify-between items-start">
                        <p className="text-sm font-medium text-muted-foreground">Hari Ini</p>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <h3 className="text-2xl font-bold mt-2">
                        {initialReceipts.filter(r => new Date(r.date || r.createdAt).toDateString() === new Date().toDateString()).length}
                    </h3>
                </div>
            </div>

            <div className="rounded-xl border bg-card shadow-sm">
                <div className="p-6 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h3 className="text-lg font-semibold text-primary">Riwayat Penerimaan</h3>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Cari No. Terima / Supplier..."
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
                                {isAdmin && <th className="px-6 py-4 text-center w-10">Aksi</th>}
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
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">
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
                    initialData={editData}
                    onClose={() => {
                        setShowReceiptModal(false);
                        setEditData(null);
                    }}
                />
            )}
        </div>
    );
}
