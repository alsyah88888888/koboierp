"use client";

import { useState, useEffect } from "react";
import { Plus, Clock, FileText, Search, Truck, Trash2, Eye, Edit2, BarChart3, TrendingUp, TrendingDown, Users } from "lucide-react";
import { format } from "date-fns";
import SalesModal from "@/app/sales/SalesModal";
import { useSession } from "next-auth/react";
import { callAction } from "@/proxy";

import { cn } from "@/lib/utils";
import { DashboardStats } from "../components/DashboardStats";
import Link from "next/link";
import { ReportPreviewModal } from "@/components/ReportPreviewModal";
import { exportToExcel } from "@/lib/excel";
import { SalesReturnModal } from "./SalesReturnModal";
import { ManualPOModal } from "./ManualPOModal";
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
    const isAdmin = session?.user?.role?.toUpperCase() === "ADMIN";
    const userRole = session?.user?.role?.toUpperCase() || "";
    const [showSalesModal, setShowSalesModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [showManualModal, setShowManualModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [editData, setEditData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<"SJ" | "RETURNS">("SJ");
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

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
            await callAction("deleteSalesDelivery", id);
            alert("Pengiriman berhasil dihapus");
            window.location.reload();
        } catch (e) {
            alert("Gagal menghapus pengiriman");
        }
    };

    const handleDeleteReturn = async (id: string) => {
        if (!confirm("Hapus retur ini? Stok akan dikurangi kembali (revert).")) return;
        try {
            await callAction("deleteSalesReturn", id);
            alert("Retur berhasil dihapus");
            window.location.reload();
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
            'Gudang': d.warehouse?.name || "-",
            'Sales Person': d.salesPerson,
            'Total Qty': d.items?.reduce((acc: number, i: any) => acc + (Number(i.quantity) || 0), 0) || 0,
            'Subtotal': Number(d.subtotal || 0),
            'Discount': Number(d.totalDiscount || 0),
            'Total': Number(d.subtotal || 0) - Number(d.totalDiscount || 0)
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
        <div className="space-y-6 animate-fade-up">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hide-print">
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <button
                        onClick={handlePreview}
                        className="bg-white border-2 border-slate-200 text-slate-600 px-4 py-2 rounded-xl flex items-center justify-center gap-2 hover:border-emerald-500 hover:text-emerald-600 transition-all font-bold active:scale-95 flex-1 sm:flex-none"
                    >
                        <Eye className="h-4 w-4" />
                        <span>Preview</span>
                    </button>
                    <button
                        onClick={handleExport}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95 font-bold flex-1 sm:flex-none"
                    >
                        <FileText className="h-4 w-4" />
                        <span>Export</span>
                    </button>
                    <button
                        onClick={() => setShowReturnModal(true)}
                        className="bg-white border-2 border-slate-200 text-slate-600 px-4 py-2 rounded-xl flex items-center justify-center gap-2 hover:border-blue-500 hover:text-blue-600 transition-all font-bold active:scale-95 flex-1 sm:flex-none"
                    >
                        <Undo2 className="h-4 w-4" />
                        <span>Retur</span>
                    </button>
                </div>
                <div className="w-full lg:w-auto">
                    {activeTab === "SJ" ? (
                        <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 w-full lg:w-auto">
                            <button
                                onClick={() => setShowSalesModal(true)}
                                className="erp-btn-primary flex-1 lg:flex-none"
                            >
                                <Plus className="h-5 w-5" />
                                <span>Input Penjualan (Barcode)</span>
                            </button>
                            <button
                                onClick={() => setShowManualModal(true)}
                                className="bg-white border-2 border-slate-200 text-slate-600 px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:border-slate-900 hover:text-slate-900 transition-all font-black active:scale-95 flex-1 lg:flex-none"
                            >
                                <FileText className="h-4 w-4" />
                                <span>Manual SJ/PO</span>
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => {
                                setEditData(null);
                                setShowReturnModal(true);
                            }}
                            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 font-bold w-full lg:w-auto"
                        >
                            <Plus className="h-5 w-5" />
                            <span>Tambah Retur</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="hide-print">
                <DashboardStats />
            </div>

            <div className="grid gap-4 md:gap-6 md:grid-cols-2">
                {/* BC Performance Card */}
                {(isAdmin || bcStats.sjCount > 0) && (
                    <div className="erp-card p-6 bg-gradient-to-br from-indigo-50/50 to-white">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-4">
                                <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-200">
                                    <Users className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Performance: BC</h3>
                                    <p className="erp-label !mb-0">Salesperson Overview</p>
                                </div>
                            </div>
                            <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-200">Active</div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                <p className="erp-label">Total SJ</p>
                                <p className="text-2xl font-black text-indigo-600">{bcStats.sjCount}</p>
                            </div>
                            <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                <p className="erp-label">Total Qty</p>
                                <p className="text-2xl font-black text-indigo-600">{bcStats.totalQty}</p>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-100">
                            <span className="erp-label">Riwayat Pengiriman Terbaru</span>
                            {bcStats.recentDeliveries.length > 0 ? (
                                <div className="space-y-2">
                                    {bcStats.recentDeliveries.map((delivery, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-xs p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                            <div className="min-w-0">
                                                <p className="font-black text-slate-800 truncate">{delivery.deliveryNumber}</p>
                                                <p className="text-[10px] text-slate-500 truncate">{delivery.buyerName}</p>
                                            </div>
                                            <div className="text-right shrink-0 ml-4">
                                                <p className="font-bold text-slate-600">{isClient ? format(new Date(delivery.createdAt), "dd MMM") : "..."}</p>
                                                <p className="text-[10px] font-black text-indigo-600">{delivery.items.reduce((s: number, i: any) => s + i.quantity, 0)} Pcs</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground italic text-center py-4">Belum ada pengiriman</p>
                            )}
                        </div>
                    </div>
                )}

                {/* PF Performance Card */}
                {(isAdmin || pfStats.sjCount > 0) && (
                    <div className="erp-card p-6 bg-gradient-to-br from-amber-50/50 to-white">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-4">
                                <div className="bg-amber-600 text-white p-3 rounded-2xl shadow-lg shadow-amber-200">
                                    <Users className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Performance: PF</h3>
                                    <p className="erp-label !mb-0">Salesperson Overview</p>
                                </div>
                            </div>
                            <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-200">Active</div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                <p className="erp-label">Total SJ</p>
                                <p className="text-2xl font-black text-amber-600">{pfStats.sjCount}</p>
                            </div>
                            <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                <p className="erp-label">Total Qty</p>
                                <p className="text-2xl font-black text-amber-600">{pfStats.totalQty}</p>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-100">
                            <span className="erp-label">Riwayat Pengiriman Terbaru</span>
                            {pfStats.recentDeliveries.length > 0 ? (
                                <div className="space-y-2">
                                    {pfStats.recentDeliveries.map((delivery, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-xs p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                            <div className="min-w-0">
                                                <p className="font-black text-slate-800 truncate">{delivery.deliveryNumber}</p>
                                                <p className="text-[10px] text-slate-500 truncate">{delivery.buyerName}</p>
                                            </div>
                                            <div className="text-right shrink-0 ml-4">
                                                <p className="font-bold text-slate-600">{isClient ? format(new Date(delivery.createdAt), "dd MMM") : "..."}</p>
                                                <p className="text-[10px] font-black text-amber-600">{delivery.items.reduce((s: number, i: any) => s + i.quantity, 0)} Pcs</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground italic text-center py-4">Belum ada pengiriman</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="stats-grid">
                <div className="erp-card p-5">
                    <div className="flex justify-between items-center">
                        <p className="erp-label">Total Penjualan</p>
                        <BarChart3 className="h-4 w-4 text-primary opacity-20" />
                    </div>
                    <h3 className="text-3xl font-black mt-1 text-primary">{initialDeliveries.length}</h3>
                </div>
                <div className="erp-card p-5">
                    <div className="flex justify-between items-center">
                        <p className="erp-label">Terbit Hari Ini</p>
                        <Clock className="h-4 w-4 text-primary opacity-20" />
                    </div>
                    <h3 className="text-3xl font-black mt-1 text-emerald-600">
                        {isClient ? initialDeliveries.filter(d => new Date(d.createdAt).toDateString() === new Date().toDateString()).length : "0"}
                    </h3>
                </div>
            </div>

            <div className="table-container">
                <div className="p-6 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white">
                    <div className="flex items-center gap-8 overflow-x-auto whitespace-nowrap w-full md:w-auto custom-scrollbar pb-2 md:pb-0">
                        <button
                            onClick={() => setActiveTab("SJ")}
                            className={cn(
                                "text-sm font-black uppercase tracking-widest transition-all border-b-4 pb-3 shrink-0",
                                activeTab === "SJ" ? "text-primary border-primary" : "text-slate-300 border-transparent hover:text-slate-400"
                            )}
                        >
                            Riwayat Pengiriman
                        </button>
                        <button
                            onClick={() => setActiveTab("RETURNS")}
                            className={cn(
                                "text-sm font-black uppercase tracking-widest transition-all border-b-4 pb-3 shrink-0",
                                activeTab === "RETURNS" ? "text-blue-600 border-blue-600" : "text-slate-300 border-transparent hover:text-slate-400"
                            )}
                        >
                            Retur Penjualan
                        </button>
                    </div>
                    <div className="relative w-full md:w-96 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Cari No. SJ / Buyer / Penerima..."
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary focus:bg-white transition-all ring-primary/5 focus:ring-4"
                        />
                    </div>
                </div>
                
                <div className="table-responsive">
                    {activeTab === "SJ" ? (
                        <table className="table-erp table-to-cards min-w-full md:min-w-[1000px]">
                            <thead className="hidden md:table-header-group">
                                <tr>
                                    <th className="w-48">No. Pengiriman</th>
                                    <th className="w-60">Buyer / Penerima</th>
                                    <th>Alamat</th>
                                    <th className="w-40">Gudang</th>
                                    <th className="text-right w-40">Qty</th>
                                    <th className="text-right w-40">Tanggal</th>
                                    {(isAdmin || userRole === "SALES") && <th className="text-center w-32">Aksi</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {Array.isArray(filteredDeliveries) && filteredDeliveries.map((d: any) => (
                                    <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td data-label="No. SJ" className="font-mono text-primary font-bold md:pl-6">
                                            {d.deliveryNumber}
                                        </td>
                                        <td data-label="Buyer">
                                            <div className="font-black text-slate-900">{d.buyerName}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter truncate max-w-[200px]">
                                                {d.recipient?.split(',')[0]}
                                            </div>
                                        </td>
                                        <td data-label="Alamat" className="text-xs text-slate-500 leading-relaxed max-w-xs md:truncate">
                                            {d.recipient}
                                        </td>
                                        <td data-label="Gudang">
                                            <span className="bg-slate-100 px-2 py-1 rounded text-[10px] font-black uppercase text-slate-600">
                                                {d.warehouse.name}
                                            </span>
                                        </td>
                                        <td data-label="Qty" className="text-right font-bold text-slate-900 md:pr-6">
                                            {d.items.reduce((acc: number, i: any) => acc + i.quantity, 0)} <span className="text-[10px] text-slate-400">Pcs</span>
                                        </td>
                                        <td data-label="Tanggal" className="text-right text-xs text-slate-500 md:pr-6">
                                            {isClient ? format(new Date(d.createdAt), "dd/MM/yyyy HH:mm") : "..."}
                                        </td>
                                        <td data-label="Aksi" className="md:pr-6">
                                            <div className="flex items-center justify-end md:justify-center gap-1">
                                                <Link href={`/sales/print/sj/${d.id}`} className="p-2.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-xl transition-all">
                                                    <Eye className="h-4 w-4" />
                                                </Link>
                                                <Link href={`/sales/print/${d.id}`} className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all">
                                                    <FileText className="h-4 w-4" />
                                                </Link>
                                                <button onClick={() => { setEditData(d); setShowSalesModal(true); }} className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all">
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                {(isAdmin || userRole === "SALES") && (
                                                    <button onClick={() => handleDelete(d.id)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <table className="table-erp table-to-cards min-w-full md:min-w-[1000px]">
                            <thead className="hidden md:table-header-group">
                                <tr>
                                    <th className="w-40">No. Retur</th>
                                    <th className="w-48">No. SJ Terkait</th>
                                    <th>Buyer</th>
                                    <th className="text-right w-40">Total Retur</th>
                                    <th className="text-center w-32">Status</th>
                                    <th className="text-center w-24">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Array.isArray(filteredReturns) && filteredReturns.map((r: any) => (
                                    <tr key={r.id}>
                                        <td data-label="No. Retur" className="font-mono text-blue-700 font-bold md:pl-6">{r.returnNumber}</td>
                                        <td data-label="No. SJ" className="font-mono text-slate-500">{r.delivery.deliveryNumber}</td>
                                        <td data-label="Buyer" className="font-bold">{r.delivery.buyerName}</td>
                                        <td data-label="Total" className="text-right font-black text-blue-600 md:pr-6">
                                            {r.items.reduce((acc: number, item: any) => acc + item.quantity, 0)} <span className="text-[10px] text-slate-400">Pcs</span>
                                        </td>
                                        <td data-label="Status" className="text-center">
                                            {r.status === "PENDING" ? (
                                                <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black rounded-full border border-amber-200">PENDING</span>
                                            ) : (
                                                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full border border-emerald-200">VERIFIED</span>
                                            )}
                                        </td>
                                        <td data-label="Aksi" className="md:pr-6">
                                            <div className="flex items-center justify-end md:justify-center gap-1">
                                                <button onClick={() => { setEditData(r); setShowReturnModal(true); }} className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all" disabled={r.status !== "PENDING"}>
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => handleDeleteReturn(r.id)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
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

            {showManualModal && (
                <ManualPOModal
                    products={products}
                    warehouses={warehouses}
                    onClose={() => {
                        setShowManualModal(false);
                        window.location.reload();
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
