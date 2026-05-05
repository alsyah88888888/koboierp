"use client";

import { useState, useEffect } from "react";
import { Plus, Clock, FileText, Search, Truck, Trash2, Eye, Edit2, BarChart3, TrendingUp, TrendingDown, Users, Download, Wallet, XCircle, Undo2, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import SalesModal from "@/app/sales/SalesModal";
import { useSession } from "next-auth/react";
import { callAction } from "@/proxy";
import { useDialog } from "@/components/ui/DialogProvider";
import { cn, formatCurrency } from "@/lib/utils";
import { DashboardStats } from "../components/DashboardStats";
import Link from "next/link";
import { ReportPreviewModal } from "@/components/ReportPreviewModal";
import { exportToExcel } from "@/lib/excel";
import { SalesReturnModal } from "./SalesReturnModal";
import SalesOrderModal from "./SalesOrderModal";
import { VoidReasonModal } from "@/components/VoidReasonModal";

interface SalesDashboardProps {
    initialDeliveries: any[];
    initialReceipts?: any[];
    initialReturns?: any[];
    initialSalesOrders?: any[];
    products: any[];
    warehouses: any[];
    customers: any[];
    salesExpenses?: any[];
    systemSettings?: any;
}

export default function SalesDashboard({ initialDeliveries, initialReceipts = [], initialReturns = [], initialSalesOrders = [], products, warehouses, customers, salesExpenses = [], systemSettings }: SalesDashboardProps) {
    const { confirm, alert } = useDialog();
    const { data: session } = useSession() as any;
    const isAdmin = session?.user?.role?.toUpperCase() === "ADMIN";
    const userRole = session?.user?.role?.toUpperCase() || "";
    const [showSalesModal, setShowSalesModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [showManualModal, setShowManualModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [editData, setEditData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<"SJ" | "RETURNS" | "PO">("SJ");
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

    const handleDeleteOrder = async (id: string) => {
        const ok = await confirm({
            title: "Hapus PO Penjualan?",
            message: "Hapus pesanan ini? Tindakan ini tidak dapat dibatalkan. PO yang sudah memiliki pengiriman (SJ) tidak dapat dihapus.",
            confirmText: "Hapus Sekarang",
            type: "danger",
            hasCountdown: true
        });
        if (!ok) return;

        try {
            const res = await callAction("deleteSalesOrder", id);
            if (res.error) throw new Error(res.error);
            
            await alert({
                title: "Berhasil",
                message: "Pesanan penjualan telah dihapus.",
                type: "success"
            });
            window.location.reload();
        } catch (e: any) {
            await alert({
                title: "Gagal Menghapus",
                message: e.message || "Gagal menghapus pesanan.",
                type: "danger"
            });
        }
    };


    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    const filteredDeliveries = initialDeliveries.filter(d => {
        const dDate = new Date(d.createdAt);
        const matchesMonth = (dDate.getMonth() + 1) === selectedMonth;
        const matchesYear = dDate.getFullYear() === selectedYear;
        const matchesSearch = d.deliveryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             d.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             d.buyerName.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesMonth && matchesYear && matchesSearch;
    });

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
    
    const filteredOrders = initialSalesOrders.filter(o =>
        o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.buyerName.toLowerCase().includes(searchTerm.toLowerCase())
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
                const taxRate = Number(d.taxRate || 0);
                const itemTax = taxRate > 0 ? (itemTotalBrutto * 0.11) : 0;
                const itemNettoTotal = itemTotalBrutto - discLine - itemTax; // Following user's literal formula

                exportData.push({
                    'No. Surat Jalan': d.deliveryNumber,
                    'No. PO Buyer': d.poNumber || "-",
                    'Tanggal': format(new Date(d.createdAt), "MM/dd/yyyy"),
                    'Buyer / Customer': d.buyerName,
                    'Barcode / SKU': item.product?.sku || "-",
                    'Nama Barang': item.product?.name || "-",
                    'Qty': qty,
                    'Satuan': item.uom || item.product?.uom || "-",
                    'Harga Satuan': price,
                    'Total Harga': itemTotalBrutto,
                    'Potongan': discLine,
                    'Tgl SJ': format(new Date(d.createdAt), "MM/dd/yyyy"),
                    'Gudang': d.warehouse?.name || "-",
                    'Sales Person': d.salesPerson || "-",
                    '': '', // Empty separator
                    'Hasil PPN 11%': itemTax,
                    'Hasil Grand Total Netto': itemNettoTotal,
                    'Status': d.isVoid ? 'VOID' : (d.isVerified ? 'VERIFIED' : 'PENDING')
                });
            });
        });

        exportToExcel(exportData, `Laporan_Penjualan_Detail_${format(new Date(), "yyyyMMdd")}`, 'Penjualan');
    };

    const handleExportReturn = async () => {
        try {
            const response = await fetch('/api/reports/sales-return');
            if (!response.ok) throw new Error("Gagal mengambil data retur");
            const rawData = await response.json();
            
            const exportData = rawData.map((item: any) => ({
                'No. Retur': item.salesReturn.returnNumber,
                'Tanggal': format(new Date(item.salesReturn.date), "MM/dd/yyyy"),
                'Buyer': item.salesReturn.delivery?.buyerName || "-",
                'Ref. SJ': item.salesReturn.delivery?.deliveryNumber || "-",
                'SKU': item.product.sku,
                'Nama Barang': item.product.name,
                'Qty Retur': item.quantity,
                'Satuan': item.product.uom || "PCS",
                'Alasan': item.reason || "-",
                'Status': item.salesReturn.status
            }));

            exportToExcel(exportData, `Laporan_Retur_Penjualan_${format(new Date(), "yyyyMMdd")}`, 'Retur_Penjualan');
        } catch (err: any) {
            console.error("Export Return failed:", err);
            await alert({
                title: "Gagal Ekspor",
                message: "Gagal ekspor retur: " + (err.message || "Unknown error"),
                type: "danger"
            });
        }
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
        <>
            <div className="space-y-6 animate-fade-up">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 px-1 hide-print">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">Sales Operations</h1>
                    <div className="flex items-center gap-2 text-slate-500 text-[9px] md:text-xs font-bold uppercase tracking-widest opacity-80">
                        <span>PI (Draft)</span>
                        <ChevronRight className="h-3 w-3" />
                        <span>PO (Confirm)</span>
                        <ChevronRight className="h-3 w-3" />
                        <span className="text-primary">SJ (Shipment)</span>
                    </div>
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
                        <button
                            onClick={() => setActiveTab("PO")}
                            className={cn(
                                "flex-1 sm:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                activeTab === "PO" ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "text-slate-500 hover:bg-slate-50"
                            )}
                        >
                            PO Penjualan
                        </button>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            onClick={activeTab === "SJ" ? () => setShowSalesModal(true) : activeTab === "RETURNS" ? () => setShowReturnModal(true) : () => setShowManualModal(true)}
                            className={cn(
                                "flex-1 sm:flex-none px-8 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest",
                                activeTab === "SJ" ? "bg-primary text-white shadow-primary/20" : 
                                activeTab === "RETURNS" ? "bg-rose-600 text-white shadow-rose-200" :
                                "bg-indigo-600 text-white shadow-indigo-200"
                            )}
                        >
                            <Plus className="h-4 w-4" />
                            <span>{activeTab === "SJ" ? "Input Surat Jalan (SJ)" : activeTab === "RETURNS" ? "Input Retur" : "Input PI / PO Penjualan"}</span>
                        </button>
                        <div className="flex gap-2">
                           <button onClick={handlePreview} className="p-3 bg-white border border-slate-200 rounded-2xl hover:border-primary hover:text-primary transition-all shadow-sm group" title="Preview Report">
                               <Eye className="h-5 w-5 text-slate-400 group-hover:text-primary" />
                           </button>
                           <button onClick={activeTab === "SJ" ? handleExport : handleExportReturn} className="p-3 bg-white border border-slate-200 rounded-2xl hover:border-emerald-500 hover:text-emerald-500 transition-all shadow-sm group" title="Export Excel">
                               <Download className="h-5 w-5 text-slate-400 group-hover:text-emerald-500" />
                           </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="hide-print">
                <DashboardStats />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-[1400px]">
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
                                activeTab === "RETURNS" ? "text-rose-600 border-rose-600" : "text-slate-300 border-transparent hover:text-slate-400"
                            )}
                        >
                            Retur Penjualan
                        </button>
                        <button
                            onClick={() => setActiveTab("PO")}
                            className={cn(
                                "text-sm font-black uppercase tracking-widest transition-all border-b-4 pb-3 shrink-0",
                                activeTab === "PO" ? "text-indigo-600 border-indigo-600" : "text-slate-300 border-transparent hover:text-slate-400"
                            )}
                        >
                            PO Penjualan
                        </button>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <select 
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                className="w-full md:w-40 px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-black uppercase tracking-widest focus:outline-none focus:border-primary transition-all"
                            >
                                {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => (
                                    <option key={m} value={i + 1}>{m}</option>
                                ))}
                            </select>
                            <select 
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="w-full md:w-28 px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-black uppercase tracking-widest focus:outline-none focus:border-primary transition-all"
                            >
                                {[2024, 2025, 2026].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        <div className="relative w-full md:w-80 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                            <input
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Cari No. SJ / Buyer / Penerima..."
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary focus:bg-white transition-all ring-primary/5 focus:ring-4"
                            />
                        </div>
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
                                                <Link href={`/sales/print/sj/${d.id}`} className="p-2.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-xl transition-all" title="Cetak Modern">
                                                    <Eye className="h-4 w-4" />
                                                </Link>
                                                <Link href={`/sales/print/sj-dot/${d.id}`} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Cetak Dot Matrix (LX-310)">
                                                    <Truck className="h-4 w-4" />
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
                    ) : activeTab === "RETURNS" ? (
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
                                        <td data-label="No. Retur" className="font-mono text-rose-700 font-bold md:pl-6">{r.returnNumber}</td>
                                        <td data-label="No. SJ" className="font-mono text-slate-500">{r.delivery.deliveryNumber}</td>
                                        <td data-label="Buyer" className="font-bold">{r.delivery.buyerName}</td>
                                        <td data-label="Total" className="text-right font-black text-rose-600 md:pr-6">
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
                                                <Link href={`/sales/return/print/${r.id}`} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Cetak Retur">
                                                    <Eye className="h-4 w-4" />
                                                </Link>
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
                    ) : (
                        <table className="table-erp table-to-cards min-w-full md:min-w-[1000px]">
                            <thead className="hidden md:table-header-group">
                                <tr>
                                    <th className="w-48">No. PO Jual</th>
                                    <th>Buyer / Customer</th>
                                    <th className="w-40">Status</th>
                                    <th className="text-right w-40">Outstanding / Total</th>
                                    <th className="text-right w-40">Tgl PO</th>
                                    <th className="text-center w-32">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Array.isArray(filteredOrders) && filteredOrders.map((o: any) => (
                                    <tr key={o.id}>
                                        <td data-label="No. PO" className="font-mono text-indigo-700 font-bold md:pl-6">
                                            {o.orderNumber}
                                            {o.revision > 0 && (
                                                <span className="ml-2 text-[10px] text-amber-600 font-black italic bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                                                    R{o.revision}
                                                </span>
                                            )}
                                        </td>
                                        <td data-label="Buyer" className="font-bold">{o.buyerName}</td>
                                        <td data-label="Status" className="text-center md:text-left">
                                            <span className={cn(
                                                "px-3 py-1 text-[10px] font-black rounded-full border",
                                                o.status === "DRAFT" ? "bg-slate-100 text-slate-600 border-slate-200" :
                                                o.status === "CONFIRMED" ? "bg-blue-100 text-blue-700 border-blue-200" :
                                                "bg-emerald-100 text-emerald-700 border-emerald-200"
                                            )}>
                                                {o.status}
                                            </span>
                                        </td>
                                        <td data-label="Total Qty" className="text-right font-black text-slate-900 md:pr-6">
                                            {(() => {
                                                const total = o.items?.reduce((acc: number, item: any) => acc + (Number(item.quantity) || 0), 0) || 0;
                                                const shipped = o.items?.reduce((acc: number, item: any) => acc + (Number(item.shippedQuantity) || 0), 0) || 0;
                                                const remaining = total - shipped;
                                                
                                                if (shipped > 0) {
                                                    return (
                                                        <div className="flex flex-col items-end">
                                                            <span className={cn(remaining > 0 ? "text-indigo-600" : "text-slate-400")}>
                                                                {remaining.toLocaleString('id-ID')} <span className="text-[10px]">Sisa</span>
                                                            </span>
                                                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                                                                dari {total.toLocaleString('id-ID')} Pcs
                                                            </span>
                                                        </div>
                                                    );
                                                }
                                                return <span>{total.toLocaleString('id-ID')} <span className="text-[10px] text-slate-400">Pcs</span></span>;
                                            })()}
                                        </td>
                                        <td data-label="Tanggal" className="text-right text-xs text-slate-500 md:pr-6">
                                            {isClient ? format(new Date(o.date), "dd/MM/yyyy") : "..."}
                                        </td>
                                        <td data-label="Aksi" className="md:pr-6">
                                            <div className="flex items-center justify-end md:justify-center gap-1">
                                                <Link href={`/sales/order/print/${o.id}`} className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" title="Cetak PI/PO">
                                                    <FileText className="h-4 w-4" />
                                                </Link>
                                                <Link href={`/sales/order/view/${o.id}`} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Lihat Detail">
                                                    <Eye className="h-4 w-4" />
                                                </Link>
                                                <button onClick={() => { setEditData(o); setShowManualModal(true); }} className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all" title="Edit Order">
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                {(isAdmin || userRole === "SALES") && (
                                                    <button onClick={() => handleDeleteOrder(o.id)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Hapus Order">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
            {/* Modals outside animation container to escape stacking context */}
            {showSalesModal && (
                <SalesModal
                    products={products}
                    warehouses={warehouses}
                    customers={customers}
                    orders={initialSalesOrders}
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
                <SalesOrderModal
                    products={products}
                    customers={customers}
                    warehouses={warehouses}
                    initialData={editData}
                    onClose={() => {
                        setShowManualModal(false);
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
        </>
    );
}
