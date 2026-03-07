"use client";

import { useState } from "react";
import { Plus, Clock, FileText, Search, Truck, Trash2, Eye, Edit2, BarChart3, TrendingUp, TrendingDown, Users } from "lucide-react";
import { format } from "date-fns";
import SalesModal from "@/app/sales/SalesModal";
import { useSession } from "next-auth/react";
import { deleteSalesDeliveryAction, deleteSalesReturnAction } from "@/app/actions";
import { cn } from "@/lib/utils";
import { DashboardStats } from "../components/DashboardStats";
import Link from "next/link";
import { ReportPreviewModal } from "@/components/ReportPreviewModal";
import { exportToExcel } from "@/lib/excel";
import { SalesReturnModal } from "./SalesReturnModal";
import { Undo2 } from "lucide-react";

interface SalesDashboardProps {
    initialDeliveries: any[];
    initialReceipts?: any[];
    initialReturns?: any[];
    products: any[];
    warehouses: any[];
    customers: any[];
    salesExpenses?: any[];
}

export default function SalesDashboard({ initialDeliveries, initialReceipts = [], initialReturns = [], products, warehouses, customers, salesExpenses = [] }: SalesDashboardProps) {
    const { data: session } = useSession() as any;
    const isAdmin = session?.user?.role === "ADMIN";
    const userRole = session?.user?.role || "";
    const [showSalesModal, setShowSalesModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [editData, setEditData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<"SJ" | "RETURNS">("SJ");

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

    const handleDeleteReturn = async (id: string) => {
        if (!confirm("Hapus retur ini? Stok akan dikurangi kembali (revert).")) return;
        try {
            await deleteSalesReturnAction(id);
            alert("Retur berhasil dihapus");
        } catch (e: any) {
            alert(e.message || "Gagal menghapus retur");
        }
    };

    const filteredDeliveries = initialDeliveries.filter(d =>
        d.deliveryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.buyerName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredReturns = initialReturns.filter(r =>
        r.returnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.delivery?.buyerName.toLowerCase().includes(searchTerm.toLowerCase())
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
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 hide-print mb-4">
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    <button
                        onClick={handlePreview}
                        className="bg-white border-2 border-emerald-600 text-emerald-600 px-4 md:px-6 py-2 rounded-xl flex items-center gap-2 hover:bg-emerald-50 transition-all font-bold shadow-sm active:scale-95 text-xs md:text-sm"
                    >
                        <Eye className="h-4 w-4 md:h-5 md:w-5" />
                        <span>Preview</span>
                    </button>
                    <button
                        onClick={handleExport}
                        className="bg-emerald-600 text-white px-4 md:px-6 py-2 rounded-xl flex items-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95 font-bold text-xs md:text-sm"
                    >
                        <FileText className="h-4 w-4 md:h-5 md:w-5" />
                        <span>Export</span>
                    </button>
                    <button
                        onClick={() => setShowReturnModal(true)}
                        className="bg-white border-2 border-blue-600 text-blue-600 px-4 md:px-6 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-50 transition-all font-bold shadow-sm active:scale-95 text-xs md:text-sm"
                    >
                        <Undo2 className="h-4 w-4 md:h-5 md:w-5" />
                        <span>Retur</span>
                    </button>
                </div>
                <div className="flex justify-center md:justify-end">
                    {activeTab === "SJ" ? (
                        <button
                            onClick={() => setShowSalesModal(true)}
                            className="bg-primary text-white px-4 md:px-6 py-2 rounded-xl flex items-center gap-2 hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95 font-bold text-xs md:text-sm w-full md:w-auto justify-center"
                        >
                            <Plus className="h-4 w-4 md:h-5 md:w-5 text-white" />
                            <span className="text-white">Input Penjualan</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                setEditData(null);
                                setShowReturnModal(true);
                            }}
                            className="bg-blue-600 text-white px-4 md:px-6 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 font-bold text-xs md:text-sm w-full md:w-auto justify-center"
                        >
                            <Plus className="h-4 w-4 md:h-5 md:w-5 text-white" />
                            <span className="text-white">Tambah Retur</span>
                        </button>
                    )}
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
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setActiveTab("SJ")}
                            className={cn(
                                "text-lg font-bold transition-all border-b-2 pb-1",
                                activeTab === "SJ" ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-slate-600"
                            )}
                        >
                            Riwayat Pengiriman
                        </button>
                        <button
                            onClick={() => setActiveTab("RETURNS")}
                            className={cn(
                                "text-lg font-bold transition-all border-b-2 pb-1",
                                activeTab === "RETURNS" ? "text-blue-600 border-blue-600" : "text-muted-foreground border-transparent hover:text-slate-600"
                            )}
                        >
                            Retur Penjualan
                        </button>
                    </div>
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
                <div className="overflow-x-auto custom-scrollbar">
                    {activeTab === "SJ" ? (
                        <table className="w-full text-sm text-left min-w-[1000px]">
                            <thead className="bg-muted/30 text-muted-foreground border-b text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">No. Pengiriman (SJ)</th>
                                    <th className="px-6 py-4">Kirim Ke</th>
                                    <th className="px-6 py-4">Buyer</th>
                                    <th className="px-6 py-4">Gudang</th>
                                    <th className="px-6 py-4 text-right">Total Qty (Jumlah)</th>
                                    <th className="px-6 py-4 text-right">Tanggal</th>
                                    {(isAdmin || userRole === "SALES") && <th className="px-6 py-4 text-center w-10">Aksi</th>}
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
                                                {(isAdmin || userRole === "SALES") && (
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
                                        <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground italic">
                                            Belum ada data penjualan.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-sm text-left min-w-[1000px]">
                            <thead className="bg-blue-50/50 text-blue-900 border-b text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">No. Retur</th>
                                    <th className="px-6 py-4">No. SJ Terkait</th>
                                    <th className="px-6 py-4">Buyer</th>
                                    <th className="px-6 py-4 text-right">Total Qty Retur</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-center w-24">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-blue-50">
                                {filteredReturns.map((r: any) => (
                                    <tr key={r.id} className="hover:bg-blue-50/20 transition-colors">
                                        <td className="px-6 py-4 font-mono text-blue-700 font-bold">{r.returnNumber}</td>
                                        <td className="px-6 py-4 font-mono text-slate-500">{r.delivery.deliveryNumber}</td>
                                        <td className="px-6 py-4 font-medium">{r.delivery.buyerName}</td>
                                        <td className="px-6 py-4 text-right font-bold text-blue-600">
                                            {r.items.reduce((acc: number, item: any) => acc + item.quantity, 0)} {r.items[0]?.product?.uom || ""}
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
                                        <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">
                                            Belum ada data retur penjualan.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
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
        </div>
    );
}
