"use client";

import { useState } from "react";
import { Plus, Clock, FileText, Search, Truck, Trash2, Eye, Edit2, BarChart3, TrendingUp, TrendingDown, Users } from "lucide-react";
import { format } from "date-fns";
import SalesModal from "@/app/sales/SalesModal";
import { useSession } from "next-auth/react";
import { deleteSalesDeliveryAction } from "@/app/actions";
import { DashboardStats } from "../components/DashboardStats";
import Link from "next/link";
import { ReportPreviewModal } from "@/components/ReportPreviewModal";
import { exportToExcel } from "@/lib/excel";
import { SalesReturnModal } from "./SalesReturnModal";
import { Undo2 } from "lucide-react";

interface SalesDashboardProps {
    initialDeliveries: any[];
    initialReceipts?: any[];
    products: any[];
    warehouses: any[];
    customers: any[];
    salesExpenses?: any[];
}

export default function SalesDashboard({ initialDeliveries, initialReceipts = [], products, warehouses, customers, salesExpenses = [] }: SalesDashboardProps) {
    const { data: session } = useSession() as any;
    const isAdmin = session?.user?.role === "ADMIN";
    const [showSalesModal, setShowSalesModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [editData, setEditData] = useState<any>(null);

    // Calculate Performance for BC & PF
    const getStats = (id: string) => {
        const sales = initialDeliveries.filter(d => d.salesPerson === id);

        // Saring 3 pengiriman terbaru
        const recentDeliveries = [...sales].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 3);

        // Total Qty
        const totalQty = sales.reduce((acc, d) => acc + d.items.reduce((sum: number, i: any) => sum + i.quantity, 0), 0);

        return {
            sjCount: sales.length,
            totalQty,
            recentDeliveries
        };
    };

    const bcStats = getStats("BC");
    const pfStats = getStats("PF");

    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [previewTitle, setPreviewTitle] = useState("");

    const handlePrint = () => {
        window.print();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus pengiriman ini? Stok akan otomatis ditambahkan kembali dan jurnal akan dihapus.")) return;
        try {
            await deleteSalesDeliveryAction(id);
            alert("Pengiriman berhasil dihapus");
        } catch (e) {
            alert("Gagal menghapus pengiriman");
        }
    };

    const filteredDeliveries = initialDeliveries.filter(d =>
        d.deliveryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.buyerName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExport = () => {
        const data = filteredDeliveries.map(d => ({
            'No. SJ': d.deliveryNumber,
            'Tanggal': format(new Date(d.createdAt), "dd/MM/yyyy HH:mm"),
            'Kirim Ke': d.recipient,
            'Buyer': d.buyerName,
            'Gudang': d.warehouse.name,
            'Sales Person': d.salesPerson,
            'Total Qty': d.items.reduce((acc: number, i: any) => acc + i.quantity, 0),
            'Subtotal': Number(d.subtotal),
            'Discount': Number(d.totalDiscount),
            'Total': Number(d.subtotal) - Number(d.totalDiscount)
        }));
        exportToExcel(data, 'Laporan_Penjualan', 'Penjualan');
    };

    const handlePreview = () => {
        const data = filteredDeliveries.map(d => ({
            'No. SJ': d.deliveryNumber,
            'Tanggal': format(new Date(d.createdAt), "dd/MM/yyyy HH:mm"),
            'Kirim Ke': d.recipient,
            'Buyer': d.buyerName,
            'Gudang': d.warehouse.name,
            'Sales Person': d.salesPerson,
            'Qty': d.items.reduce((acc: number, i: any) => acc + i.quantity, 0),
            'Subtotal': Number(d.subtotal),
            'Discount': Number(d.totalDiscount),
            'Total': Number(d.subtotal) - Number(d.totalDiscount)
        }));
        setPreviewData(data);
        setPreviewTitle("Riwayat Pengiriman (Sales SJ)");
        setShowPreview(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hide-print">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-primary">Penjualan (Sales Delivery)</h2>
                    <p className="text-muted-foreground">Input pengiriman barang ke buyer dan monitoring stok keluar.</p>
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
                        <FileText className="h-5 w-5" />
                        <span>Export Excel</span>
                    </button>
                    <button
                        onClick={() => setShowReturnModal(true)}
                        className="bg-white border-2 border-blue-600 text-blue-600 px-6 py-2 rounded-md flex items-center gap-2 hover:bg-blue-50 transition-all font-bold shadow-sm active:scale-95"
                    >
                        <Undo2 className="h-5 w-5" />
                        <span>Retur Penjualan</span>
                    </button>
                    <button
                        onClick={() => setShowSalesModal(true)}
                        className="bg-primary text-white px-6 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95 font-bold"
                    >
                        <Plus className="h-5 w-5 text-white" />
                        <span className="text-white">Input Penjualan</span>
                    </button>
                </div>
            </div>

            <div className="hide-print">
                <DashboardStats />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                {/* BC Performance Card */}
                <div className="bg-gradient-to-br from-indigo-50 to-white border-2 border-indigo-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-200">
                                <Users className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Performance ID: BC</h3>
                                <p className="text-xs text-slate-500 font-medium tracking-wide font-mono uppercase">Salesperson Overview</p>
                            </div>
                        </div>
                        <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-200">Active</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1 flex items-center gap-1">
                                <FileText className="h-3 w-3 text-indigo-500" /> Total SJ Diterbitkan
                            </p>
                            <p className="text-2xl font-black text-indigo-600">{bcStats.sjCount}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">Surat Jalan</p>
                        </div>
                        <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1 flex items-center gap-1">
                                <Truck className="h-3 w-3 text-indigo-500" /> Total Qty Dikirim
                            </p>
                            <p className="text-2xl font-black text-indigo-600">{bcStats.totalQty}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">Pcs / Item</p>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-widest">Riwayat Pengiriman Terbaru</span>
                        {bcStats.recentDeliveries.length > 0 ? (
                            <div className="space-y-2">
                                {bcStats.recentDeliveries.map((delivery, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded border border-slate-100">
                                        <div>
                                            <p className="font-bold text-slate-700">{delivery.deliveryNumber}</p>
                                            <p className="text-[10px] text-slate-500 truncate max-w-[120px]">{delivery.buyerName}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium text-slate-600">{format(new Date(delivery.createdAt), "dd MMM yy")}</p>
                                            <p className="text-[10px] font-black text-indigo-600">{delivery.items.reduce((s: number, i: any) => s + i.quantity, 0)} Pcs</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground italic text-center py-2">Belum ada pengiriman</p>
                        )}
                    </div>
                </div>

                {/* PF Performance Card */}
                <div className="bg-gradient-to-br from-amber-50 to-white border-2 border-amber-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-amber-600 text-white p-2 rounded-xl shadow-lg shadow-amber-200">
                                <Users className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Performance ID: PF</h3>
                                <p className="text-xs text-slate-500 font-medium tracking-wide font-mono uppercase">Salesperson Overview</p>
                            </div>
                        </div>
                        <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-200">Active</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1 flex items-center gap-1">
                                <FileText className="h-3 w-3 text-amber-500" /> Total SJ Diterbitkan
                            </p>
                            <p className="text-2xl font-black text-amber-600">{pfStats.sjCount}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">Surat Jalan</p>
                        </div>
                        <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1 flex items-center gap-1">
                                <Truck className="h-3 w-3 text-amber-500" /> Total Qty Dikirim
                            </p>
                            <p className="text-2xl font-black text-amber-600">{pfStats.totalQty}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">Pcs / Item</p>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-widest">Riwayat Pengiriman Terbaru</span>
                        {pfStats.recentDeliveries.length > 0 ? (
                            <div className="space-y-2">
                                {pfStats.recentDeliveries.map((delivery, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded border border-slate-100">
                                        <div>
                                            <p className="font-bold text-slate-700">{delivery.deliveryNumber}</p>
                                            <p className="text-[10px] text-slate-500 truncate max-w-[120px]">{delivery.buyerName}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium text-slate-600">{format(new Date(delivery.createdAt), "dd MMM yy")}</p>
                                            <p className="text-[10px] font-black text-amber-600">{delivery.items.reduce((s: number, i: any) => s + i.quantity, 0)} Pcs</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground italic text-center py-2">Belum ada pengiriman</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <div className="p-6 rounded-xl border bg-card shadow-sm">
                    <div className="flex justify-between items-start">
                        <p className="text-sm font-medium text-muted-foreground italic uppercase font-bold tracking-tighter">Global Total Penjualan</p>
                        <BarChart3 className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="text-2xl font-black mt-2 text-primary">{initialDeliveries.length}</h3>
                </div>
                <div className="p-6 rounded-xl border bg-card shadow-sm">
                    <div className="flex justify-between items-start">
                        <p className="text-sm font-medium text-muted-foreground">Hari Ini</p>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <h3 className="text-2xl font-bold mt-2">
                        {initialDeliveries.filter(d => new Date(d.createdAt).toDateString() === new Date().toDateString()).length}
                    </h3>
                </div>
            </div>

            <div className="rounded-xl border bg-card shadow-sm">
                <div className="p-6 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h3 className="text-lg font-semibold text-primary">Riwayat Pengiriman</h3>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Cari No. SJ / Buyer..."
                            className="w-full pl-10 pr-4 py-2 bg-muted/50 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/30 text-muted-foreground border-b text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">No. Pengiriman (SJ)</th>
                                <th className="px-6 py-4">Kirim Ke</th>
                                <th className="px-6 py-4">Buyer</th>
                                <th className="px-6 py-4">Gudang</th>
                                <th className="px-6 py-4 text-right">Total Qty (Jumlah)</th>
                                <th className="px-6 py-4 text-right">Tanggal</th>
                                {isAdmin && <th className="px-6 py-4 text-center w-10">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredDeliveries.map((d: any) => (
                                <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-6 py-4 font-mono text-primary font-medium">{d.deliveryNumber}</td>
                                    <td className="px-6 py-4 font-medium">{d.recipient}</td>
                                    <td className="px-6 py-4">{d.buyerName}</td>
                                    <td className="px-6 py-4 text-xs">
                                        <span className="bg-muted px-2 py-0.5 rounded uppercase font-bold text-[10px]">
                                            {d.warehouse.name}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {d.items.reduce((acc: number, i: any) => acc + i.quantity, 0)} {d.items[0]?.uom || ""}
                                    </td>
                                    <td className="px-6 py-4 text-right text-muted-foreground">
                                        {format(new Date(d.createdAt), "dd/MM/yyyy HH:mm")}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Link
                                                href={`/sales/print/sj/${d.id}`}
                                                className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-lg transition-colors"
                                                title="Lihat Surat Jalan"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Link>
                                            <Link
                                                href={`/sales/print/${d.id}`}
                                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                title="Lihat Invoice"
                                            >
                                                <FileText className="h-4 w-4" />
                                            </Link>
                                            <button
                                                onClick={() => {
                                                    setEditData(d);
                                                    setShowSalesModal(true);
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                title="Edit Data"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            {isAdmin && (
                                                <button
                                                    onClick={() => handleDelete(d.id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Hapus Penjualan"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredDeliveries.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">
                                        Belum ada data penjualan.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showSalesModal && (
                <SalesModal
                    products={products}
                    warehouses={warehouses}
                    customers={customers}
                    initialData={editData}
                    onClose={() => {
                        setShowSalesModal(false);
                        setEditData(null);
                    }}
                />
            )}

            {showReturnModal && (
                <SalesReturnModal
                    deliveries={initialDeliveries}
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
