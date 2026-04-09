"use client";

import { useState, useEffect } from "react";
import { Plus, Clock, FileText, Search, Truck, Trash2, Eye, Edit2, BarChart3, TrendingUp, TrendingDown, Users } from "lucide-react";
import { format } from "date-fns";
import SalesModal from "@/app/sales/SalesModal";
import { useSession } from "next-auth/react";
import { callAction } from "@/proxy";
import { useDialog } from "@/components/ui/DialogProvider";
import { cn } from "@/lib/utils";
import { DashboardStats } from "../components/DashboardStats";
import Link from "next/link";
import { ReportPreviewModal } from "@/components/ReportPreviewModal";
import { exportToExcel } from "@/lib/excel";
import { SalesReturnModal } from "./SalesReturnModal";
import { ManualPOModal } from "./ManualPOModal";
import { Undo2, XCircle } from "lucide-react";
import { VoidReasonModal } from "@/components/VoidReasonModal";

interface SalesDashboardProps {
    initialDeliveries: any[];
    initialReceipts?: any[];
    initialReturns?: any[];
    products: any[];
    warehouses: any[];
    customers: any[];
    salesExpenses?: any[];
    systemSettings?: any;
}

export default function SalesDashboard({ initialDeliveries, initialReceipts = [], initialReturns = [], products, warehouses, customers, salesExpenses = [], systemSettings }: SalesDashboardProps) {
    const { confirm, alert } = useDialog();
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
    const [showVoidModal, setShowVoidModal] = useState(false);
    const [voidId, setVoidId] = useState<string | null>(null);

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
    const handleVoid = async (id: string) => {
        setVoidId(id);
        setShowVoidModal(true);
    };

    const onVoidConfirm = async (reason: string) => {
        if (!voidId) return;
        try {
            await callAction("voidSalesDelivery", voidId, reason);
            setShowVoidModal(false);
            setVoidId(null);
            await alert({
                title: "Berhasil Dibatalkan",
                message: "Transaksi telah dibatalkan (VOID) dan stok telah dikembalikan.",
                type: "success"
            });
            window.location.reload();
        } catch (e: any) {
            await alert({
                title: "Gagal Membatalkan",
                message: e.message || "Terjadi kesalahan saat membatalkan transaksi.",
                type: "danger"
            });
        }
    };

    const handleDeleteReturn = async (id: string) => {
        const ok = await confirm({
            title: "Hapus Retur Penjualan?",
            message: "Hapus retur ini? Stok akan dikurangi kembali (revert) secara otomatis.",
            confirmText: "Hapus Sekarang",
            type: "danger",
            hasCountdown: true
        });
        if (!ok) return;

        try {
            await callAction("deleteSalesReturn", id);
            await alert({
                title: "Berhasil",
                message: "Data retur penjualan telah dihapus.",
                type: "success"
            });
            window.location.reload();
        } catch (e: any) {
            await alert({
                title: "Gagal Menghapus",
                message: e.message || "Gagal menghapus retur.",
                type: "danger"
            });
        }
    };


    const filteredDeliveries = initialDeliveries.filter(d =>
        d.deliveryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.buyerName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExportXMLCoretax = async () => {
        try {
            const { generateCoretaxXML } = await import("@/lib/coretax-xml");
            const xmlContent = generateCoretaxXML(filteredDeliveries, systemSettings);
            const blob = new Blob([xmlContent], { type: 'text/xml' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Coretax_Export_${format(new Date(), "yyyyMMdd_HHmm")}.xml`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (e: any) {
            console.error("XML Export error:", e);
            alert({ title: "Gagal Ekspor", message: "Terjadi kesalahan saat membuat file XML.", type: "danger" });
        }
    };

    const filteredReturns = initialReturns.filter(r =>
        r.returnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.delivery?.buyerName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExport = () => {
        const exportData: any[] = [];
        
        filteredDeliveries.forEach(d => {
            const items = d.items || [];
            items.forEach((item: any) => {
                const qty = Number(item.quantity) || 0;
                const price = Number(item.salesPrice) || 0;
                const discLine = Number(item.discount || 0);
                const itemTotalBrutto = qty * price;

                exportData.push({
                    'No. Surat Jalan': d.deliveryNumber,
                    'No. PO Buyer': d.poNumber || "-",
                    'Tanggal': format(new Date(d.createdAt), "dd/MM/yyyy HH:mm"),
                    'Buyer / Customer': d.buyerName,
                    'Barcode / SKU': item.product?.sku || "-",
                    'Nama Barang': item.product?.name || "-",
                    'Qty': qty,
                    'Satuan': item.uom || item.product?.uom || "-",
                    'Harga Satuan': price,
                    'Total Harga Item': itemTotalBrutto,
                    'Potongan Item': discLine,
                    'Tgl SJ': format(new Date(d.createdAt), "dd/MM/yyyy"),
                    'Gudang': d.warehouse?.name || "-",
                    'Sales Person': d.salesPerson || "-",
                    'Hasil Jumlah Qty': Number(d.items?.reduce((acc: number, i: any) => acc + (Number(i.quantity) || 0), 0) || 0),
                    'Hasil Total Brutto': Number(d.subtotal || 0),
                    'Hasil PPN 11%': Number(d.taxAmount || 0),
                    'Hasil Grand Total Netto': Number(d.grandTotal || 0)
                });
            });
        });

        exportToExcel(exportData, `Laporan_Penjualan_Detail_${format(new Date(), "yyyyMMdd")}`, 'Penjualan');
    };

    const handlePreview = () => {
        const data = filteredDeliveries.map(d => ({
            'No. SJ': d.deliveryNumber,
            'No. PO': d.poNumber || "-",
            'Tgl SJ': format(new Date(d.createdAt), "dd/MM/yyyy"),
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
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 px-1 hide-print">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">Sales Operations</h1>
                    <p className="text-slate-500 text-[10px] md:text-sm font-bold uppercase tracking-widest opacity-70">Shipment tracking & Revenue performance</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-full sm:w-auto">
                        <button
                            onClick={() => setActiveTab("SJ")}
                            className={cn(
                                "flex-1 sm:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                activeTab === "SJ" ? "bg-primary text-white shadow-md shadow-primary/20" : "text-slate-500 hover:bg-slate-50"
                            )}
                        >
                            Pengiriman
                        </button>
                        <button
                            onClick={() => setActiveTab("RETURNS")}
                            className={cn(
                                "flex-1 sm:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                activeTab === "RETURNS" ? "bg-rose-600 text-white shadow-md shadow-rose-200" : "text-slate-500 hover:bg-slate-50"
                            )}
                        >
                            Retur Pelanggan
                        </button>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            onClick={activeTab === "SJ" ? () => setShowSalesModal(true) : () => setShowReturnModal(true)}
                            className={cn(
                                "flex-1 sm:flex-none px-8 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest",
                                activeTab === "SJ" ? "bg-primary text-white shadow-primary/20" : "bg-rose-600 text-white shadow-rose-200"
                            )}
                        >
                            <Plus className="h-4 w-4" />
                            <span>{activeTab === "SJ" ? "Input SJ" : "Input Retur"}</span>
                        </button>
                        <div className="flex gap-2">
                           <button onClick={handlePreview} className="p-3 bg-white border border-slate-200 rounded-2xl hover:border-primary hover:text-primary transition-all shadow-sm group" title="Preview Report">
                               <Eye className="h-5 w-5 text-slate-400 group-hover:text-primary" />
                           </button>
                           <button onClick={handleExport} className="p-3 bg-white border border-slate-200 rounded-2xl hover:border-emerald-500 hover:text-emerald-500 transition-all shadow-sm group" title="Export Excel">
                               <Download className="h-5 w-5 text-slate-400 group-hover:text-emerald-500" />
                           </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="hide-print">
                <DashboardStats />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* BC Performance Card */}
                {(isAdmin || bcStats.sjCount > 0) && (
                    <div className="erp-card p-6 md:p-8 relative overflow-hidden group">
                        <div className="absolute -right-12 -top-12 h-48 w-48 bg-indigo-50 rounded-full blur-3xl transition-transform group-hover:scale-110 opacity-60" />
                        
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-8">
                                <div className="flex items-center gap-5">
                                    <div className="bg-indigo-600 text-white p-4 rounded-2xl shadow-xl shadow-indigo-100">
                                        <TrendingUp className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Performance: BC</h3>
                                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mt-1">Enterprise Sales Lead</p>
                                    </div>
                                </div>
                                <div className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100 shadow-sm">Lead Active</div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-5 bg-white/50 backdrop-blur-sm border border-slate-100 rounded-[2rem] shadow-sm group-hover:border-indigo-100 transition-colors">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Delivery</p>
                                    <p className="text-3xl font-black text-indigo-600 tracking-tighter">{bcStats.sjCount}</p>
                                </div>
                                <div className="p-5 bg-white/50 backdrop-blur-sm border border-slate-100 rounded-[2rem] shadow-sm group-hover:border-indigo-100 transition-colors">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Quantity</p>
                                    <p className="text-3xl font-black text-indigo-600 tracking-tighter">{bcStats.totalQty}</p>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-100/60">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Recent Shipments</span>
                                    <div className="h-1 w-8 bg-indigo-200 rounded-full" />
                                </div>
                                {bcStats.recentDeliveries.length > 0 ? (
                                    <div className="space-y-3">
                                        {bcStats.recentDeliveries.map((delivery, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-xs p-4 bg-white border border-slate-100 rounded-2xl hover:shadow-md hover:border-indigo-100 transition-all cursor-default group/item">
                                                <div className="min-w-0">
                                                    <p className="font-black text-slate-800 text-[13px] tracking-tight">{delivery.deliveryNumber}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 truncate mt-0.5">{delivery.buyerName}</p>
                                                </div>
                                                <div className="text-right shrink-0 ml-4 flex flex-col items-end">
                                                    <p className="font-black text-indigo-600 text-[13px]">{delivery.items.reduce((s: number, i: any) => s + i.quantity, 0)} <span className="text-[9px] uppercase">Pcs</span></p>
                                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">{isClient ? format(new Date(delivery.createdAt), "dd MMM") : "..."}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                        <p className="text-[10px] font-black text-slate-400 italic uppercase tracking-widest">Belum ada pengiriman</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* PF Performance Card */}
                {(isAdmin || pfStats.sjCount > 0) && (
                    <div className="erp-card p-6 md:p-8 relative overflow-hidden group">
                        <div className="absolute -right-12 -top-12 h-48 w-48 bg-amber-50 rounded-full blur-3xl transition-transform group-hover:scale-110 opacity-60" />
                        
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-8">
                                <div className="flex items-center gap-5">
                                    <div className="bg-amber-600 text-white p-4 rounded-2xl shadow-xl shadow-amber-100">
                                        <Users className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Performance: PF</h3>
                                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mt-1">Direct Sales Channel</p>
                                    </div>
                                </div>
                                <div className="bg-amber-100 text-amber-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-100 shadow-sm">Lead Active</div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-5 bg-white/50 backdrop-blur-sm border border-slate-100 rounded-[2rem] shadow-sm group-hover:border-amber-100 transition-colors">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Delivery</p>
                                    <p className="text-3xl font-black text-indigo-600 tracking-tighter">{pfStats.sjCount}</p>
                                </div>
                                <div className="p-5 bg-white/50 backdrop-blur-sm border border-slate-100 rounded-[2rem] shadow-sm group-hover:border-amber-100 transition-colors">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Quantity</p>
                                    <p className="text-3xl font-black text-indigo-600 tracking-tighter">{pfStats.totalQty}</p>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-100/60">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Recent Shipments</span>
                                    <div className="h-1 w-8 bg-amber-200 rounded-full" />
                                </div>
                                {pfStats.recentDeliveries.length > 0 ? (
                                    <div className="space-y-3">
                                        {pfStats.recentDeliveries.map((delivery, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-xs p-4 bg-white border border-slate-100 rounded-2xl hover:shadow-md hover:border-amber-100 transition-all cursor-default group/item">
                                                <div className="min-w-0">
                                                    <p className="font-black text-slate-800 text-[13px] tracking-tight">{delivery.deliveryNumber}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 truncate mt-0.5">{delivery.buyerName}</p>
                                                </div>
                                                <div className="text-right shrink-0 ml-4 flex flex-col items-end">
                                                    <p className="font-black text-amber-600 text-[13px]">{delivery.items.reduce((s: number, i: any) => s + i.quantity, 0)} <span className="text-[9px] uppercase">Pcs</span></p>
                                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">{isClient ? format(new Date(delivery.createdAt), "dd MMM") : "..."}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                        <p className="text-[10px] font-black text-slate-400 italic uppercase tracking-widest">Belum ada pengiriman</p>
                                    </div>
                                )}
                            </div>
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
                                    <tr 
                                        key={d.id} 
                                        className={cn(
                                            "hover:bg-slate-50/50 transition-colors",
                                            d.isVoid && "bg-slate-50/80 opacity-60"
                                        )}
                                    >
                                        <td data-label="No. SJ" className="font-mono text-primary font-bold md:pl-6">
                                            <div className="flex items-center gap-2">
                                                <span className={cn(d.isVoid && "line-through text-slate-400")}>{d.deliveryNumber}</span>
                                                {d.isVoid && (
                                                    <span className="bg-rose-100 text-rose-600 text-[8px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter">BATAL</span>
                                                )}
                                            </div>
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
                                                {(isAdmin || userRole === "SALES") && !d.isVoid && (
                                                    <button onClick={() => handleVoid(d.id)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Void Transaction">
                                                        <XCircle className="h-4 w-4" />
                                                    </button>
                                                )}
                                                {d.isVoid && (
                                                    <div className="px-3 py-1 bg-slate-100 text-slate-400 text-[8px] font-black italic rounded-lg" title={d.voidReason}>
                                                        VOIDED: {d.voidReason}
                                                    </div>
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

            <VoidReasonModal 
                isOpen={showVoidModal}
                onClose={() => {
                    setShowVoidModal(false);
                    setVoidId(null);
                }}
                onConfirm={onVoidConfirm}
                title="Batalkan Penjualan (VOID)"
                message="Membatalkan pengiriman ini akan mengembalikan stok barang ke gudang secara otomatis. Tindakan ini tidak dapat dibatalkan."
            />
        </div>
    );
}
