"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Trash2, Edit2, Eye, Download, FileText, ChevronRight, PackagePlus, History } from "lucide-react";
import { ReportPreviewModal } from "@/components/ReportPreviewModal";
import { format } from "date-fns";
import { ReceiptModal } from "./ReceiptModal";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { callAction } from "@/proxy";
import { useDialog } from "@/components/ui/DialogProvider";

import { DashboardStats } from "../components/DashboardStats";
import Link from "next/link";
import { XCircle } from "lucide-react";
import { VoidReasonModal } from "@/components/VoidReasonModal";
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
    const { confirm, alert } = useDialog();
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
    const [showVoidModal, setShowVoidModal] = useState(false);
    const [voidId, setVoidId] = useState<string | null>(null);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Quick Add Modals States
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [showBuyerModal, setShowBuyerModal] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);

    const handleVoid = async (id: string) => {
        setVoidId(id);
        setShowVoidModal(true);
    };

    const onVoidConfirm = async (reason: string) => {
        if (!voidId) return;
        try {
            await callAction("voidGoodsReceipt", voidId, reason);
            setShowVoidModal(false);
            setVoidId(null);
            await alert({
                title: "Berhasil Dibatalkan",
                message: "Penerimaan barang telah dibatalkan (VOID) dan stok telah disesuaikan.",
                type: "success"
            });
            window.location.reload();
        } catch (e: any) {
            await alert({
                title: "Gagal Membatalkan",
                message: e.message || "Gagal membatalkan penerimaan barang.",
                type: "danger"
            });
        }
    };

    const handleDeleteReturn = async (id: string) => {
        const ok = await confirm({
            title: "Hapus Retur?",
            message: "Hapus retur ini? Stok akan dikembalikan (revert) dan dampak finansial akan dibatalkan secara permanen.",
            confirmText: "Hapus Sekarang",
            type: "danger",
            hasCountdown: true
        });
        if (!ok) return;

        try {
            await callAction("deletePurchaseReturn", id);
            await alert({
                title: "Berhasil",
                message: "Data retur pembelian telah dihapus.",
                type: "success"
            });
        } catch (e: any) {
            await alert({
                title: "Gagal Menghapus",
                message: e.message || "Gagal menghapus retur. Silakan cek koneksi.",
                type: "danger"
            });
        }
    };

    const filteredReceipts = initialReceipts.filter(r =>
        r.receiptNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.receivedFrom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.formNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExport = () => {
        const exportData: any[] = [];
        
        (Array.isArray(filteredReceipts) ? filteredReceipts : []).forEach(r => {
            const items = r.items || [];
            items.forEach((item: any) => {
                const qty = Number(item.quantity) || 0;
                const buyPrice = Number(item.purchasePrice || 0);
                const discLine = Number(item.discount || 0);
                const taxRate = Number(r.taxRate || 0);

                const itemTotalBrutto = qty * buyPrice;
                const itemNettoBeforeTax = itemTotalBrutto - discLine;
                const itemTax = itemNettoBeforeTax * taxRate;
                const itemNettoTotal = itemNettoBeforeTax + itemTax;

                exportData.push({
                    'No. Terima': r.receiptNumber,
                    'No. Form': r.formNumber || "-",
                    'Tanggal': format(new Date(r.date || r.createdAt), "dd/MM/yyyy HH:mm"),
                    'Terima Dari': r.receivedFrom,
                    'Barcode': item.product?.barcode || item.product?.sku || "-",
                    'SKU': item.product?.sku || "-",
                    'Nama Barang': item.product?.name || "-",
                    'Qty': qty,
                    'Satuan': item.uom || item.product?.uom || "-",
                    'Harga Beli': buyPrice,
                    'Potongan Item': discLine,
                    'Total Brutto (Row)': itemTotalBrutto,
                    'PPN 11% (Row)': itemTax,
                    'Grand Total Netto (Row)': itemNettoTotal,
                    'Gudang': r.warehouse?.name || "-",
                    'Sales Person': r.salesPerson || "-",
                    'Total Dokumen (Brutto)': Number(r.subtotal || 0),
                    'Total Dokumen (PPN)': Number(r.taxAmount || 0),
                    'Total Dokumen (Netto)': Number(r.grandTotal || 0),
                    'Status': r.isVoid ? 'VOID' : (r.isVerified ? 'VERIFIED' : 'PENDING')
                });
            });
        });
        
        exportToExcel(exportData, `Laporan_Penerimaan_Barang_Detail_${format(new Date(), "yyyyMMdd")}`, 'Penerimaan');
    };


    const handlePreview = () => {
        const data = (Array.isArray(filteredReceipts) ? filteredReceipts : []).map(r => ({
            'No. Form': r.formNumber,
            'Tanggal': format(new Date(r.date || r.createdAt), "dd/MM/yyyy"),
            'Terima Dari': r.receivedFrom,
            'No. Terima': r.receiptNumber,
            'Gudang': r.warehouse?.name || "-",
            'Sales Person': r.salesPerson,
            'Qty': r.items?.reduce((acc: number, i: any) => acc + (Number(i.quantity) || 0), 0) || 0,
            'Total Harga': Number(r.items?.reduce((acc: number, i: any) => acc + (Number(i.quantity) * Number(i.purchasePrice || 0)), 0) || 0),
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
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 px-1">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">Product Procurement</h1>
                    <p className="text-slate-500 text-[10px] md:text-sm font-bold uppercase tracking-widest opacity-70">Logistics & Goods Receipt Management</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-full sm:w-auto">
                        <button
                            onClick={() => setActiveTab("LPB")}
                            className={cn(
                                "flex-1 sm:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                activeTab === "LPB" ? "bg-primary text-white shadow-md shadow-primary/20" : "text-slate-500 hover:bg-slate-50"
                            )}
                        >
                            Pembelian
                        </button>
                        <button
                            onClick={() => setActiveTab("RETUR")}
                            className={cn(
                                "flex-1 sm:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                activeTab === "RETUR" ? "bg-rose-600 text-white shadow-md shadow-rose-200" : "text-slate-500 hover:bg-slate-50"
                            )}
                        >
                            Retur
                        </button>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            onClick={activeTab === "LPB" ? () => setShowReceiptModal(true) : () => setShowReturnModal(true)}
                            className={cn(
                                "flex-1 sm:flex-none px-6 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest",
                                activeTab === "LPB" ? "bg-primary text-white shadow-primary/20" : "bg-rose-600 text-white shadow-rose-200"
                            )}
                        >
                            <Plus className="h-4 w-4" />
                            <span>{activeTab === "LPB" ? "Input LPB" : "Input Retur"}</span>
                        </button>
                        <button
                            onClick={handleExport}
                            className="p-3 bg-white border-2 border-slate-100 rounded-2xl hover:border-primary hover:text-primary transition-all shadow-sm group"
                            title="Export Excel"
                        >
                            <Download className="h-5 w-5 text-slate-400 group-hover:text-primary" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Actions & Stats Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3">
                    <DashboardStats />
                </div>
                <div className="erp-card bg-slate-900 border-none p-7 text-white flex flex-col justify-between overflow-hidden relative group">
                    {/* Background Decoration */}
                    <div className="absolute -right-8 -top-8 bg-white/5 h-32 w-32 rounded-full blur-2xl group-hover:bg-primary/20 transition-all duration-700" />
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Quick Entry</h4>
                        </div>
                        
                        <div className="space-y-3">
                            <button onClick={() => setShowSupplierModal(true)} className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 group/btn">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400 group-hover/btn:scale-110 transition-transform"><Plus className="h-3 w-3" /></div>
                                    <span className="text-xs font-bold">Supplier Baru</span>
                                </div>
                                <ChevronRight className="h-3 w-3 text-slate-600" />
                            </button>
                            <button onClick={() => setShowProductModal(true)} className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 group/btn">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 group-hover/btn:scale-110 transition-transform"><Plus className="h-3 w-3" /></div>
                                    <span className="text-xs font-bold">Barang Baru</span>
                                </div>
                                <ChevronRight className="h-3 w-3 text-slate-600" />
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Master Shortcuts</span>
                        <div className="flex -space-x-2">
                            <div className="h-6 w-6 rounded-full border-2 border-slate-900 bg-slate-800" />
                            <div className="h-6 w-6 rounded-full border-2 border-slate-900 bg-slate-700" />
                        </div>
                    </div>
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

                <div className="overflow-x-auto w-full">
                    <table className="table-erp min-w-[1000px]">
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
                                    Array.isArray(filteredReceipts) && filteredReceipts.map((r: any, idx: number) => (
                                        <tr 
                                            key={r.id}
                                            className={cn(r.isVoid && "bg-slate-50/80 opacity-60")}
                                        >
                                            <td className="text-center text-slate-400">{idx + 1}</td>
                                            <td className="font-mono text-primary font-black text-xs uppercase tracking-tight">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(r.isVoid && "line-through text-slate-400")}>{r.formNumber}</span>
                                                    {r.isVoid && (
                                                        <span className="bg-rose-100 text-rose-600 text-[8px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter">BATAL</span>
                                                    )}
                                                </div>
                                            </td>
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
                                                    {(isAdmin || userRole === "PURCHASE") && !r.isVoid && (
                                                        <button
                                                            onClick={() => handleVoid(r.id)}
                                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                                                            title="Void Receipt"
                                                        >
                                                            <XCircle className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                    {r.isVoid && (
                                                        <div className="px-3 py-1 bg-slate-100 text-slate-400 text-[8px] font-black italic rounded-lg" title={r.voidReason}>
                                                            VOIDED: {r.voidReason}
                                                        </div>
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
                                    Array.isArray(filteredReturns) && filteredReturns.map((r: any, idx: number) => (
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
                    isOpen={showReceiptModal}
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

            <VoidReasonModal 
                isOpen={showVoidModal}
                onClose={() => {
                    setShowVoidModal(false);
                    setVoidId(null);
                }}
                onConfirm={onVoidConfirm}
                title="Batalkan Penerimaan (VOID)"
                message="Membatalkan penerimaan barang ini akan mengurangi stok barang secara otomatis. Tindakan ini tidak dapat dibatalkan."
            />
        </div>
    );
}
