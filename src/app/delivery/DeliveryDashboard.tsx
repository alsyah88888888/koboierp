"use client";

import { useState, useEffect } from "react";
import { Plus, FileText, Search, Truck, Eye, Edit2, Download, XCircle, ChevronRight, Calendar, Landmark, HelpCircle, Printer } from "lucide-react";
import { format } from "date-fns";
import SalesModal from "@/app/sales/SalesModal";
import { useSession } from "next-auth/react";
import { callAction } from "@/proxy";
import { useDialog } from "@/components/ui/DialogProvider";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { exportToExcel } from "@/lib/excel";
import { VoidReasonModal } from "@/components/VoidReasonModal";

interface DeliveryDashboardProps {
    initialDeliveries: any[];
    initialSalesOrders?: any[];
    products: any[];
    warehouses: any[];
    customers: any[];
    systemSettings?: any;
}

export default function DeliveryDashboard({
    initialDeliveries,
    initialSalesOrders = [],
    products,
    warehouses,
    customers,
    systemSettings
}: DeliveryDashboardProps) {
    const { confirm, alert } = useDialog();
    const { data: session } = useSession() as any;
    const isAdmin = session?.user?.role?.toUpperCase() === "ADMIN";
    const userRole = session?.user?.role?.toUpperCase() || "";

    const [showSalesModal, setShowSalesModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [editData, setEditData] = useState<any>(null);
    const [isClient, setIsClient] = useState(false);
    const [showVoidModal, setShowVoidModal] = useState(false);
    const [voidId, setVoidId] = useState<string | null>(null);

    const [selectedDate, setSelectedDate] = useState<string>("");
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    useEffect(() => {
        setIsClient(true);
    }, []);

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
                title: "Berhasil Batalkan",
                message: "Transaksi telah dibatalkan (VOID) dan stok telah dikembalikan.",
                type: "success"
            });
        } catch (e: any) {
            await alert({
                title: "Gagal Membatalkan",
                message: e.message || "Terjadi kesalahan.",
                type: "danger"
            });
        }
    };

    // Filter deliveries
    const filteredDeliveries = initialDeliveries.filter(d => {
        const dDate = new Date(d.createdAt);
        const matchesMonth = selectedDate ? true : (dDate.getMonth() + 1) === selectedMonth;
        const matchesYear = selectedDate ? true : dDate.getFullYear() === selectedYear;
        const matchesDate = selectedDate ? format(dDate, 'yyyy-MM-dd') === selectedDate : true;
        const matchesSearch = d.deliveryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             d.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             d.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (d.poNumber && d.poNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
                             (d.invoiceNumber && d.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesMonth && matchesYear && matchesDate && matchesSearch;
    });

    // Stats calculations
    const activeDeliveries = filteredDeliveries.filter(d => !d.isVoid);
    const totalSjCount = filteredDeliveries.length;
    const voidSjCount = filteredDeliveries.filter(d => d.isVoid).length;
    const totalPcsShipped = activeDeliveries.reduce(
        (acc, d) => acc + d.items.reduce((sum: number, i: any) => sum + i.quantity, 0),
        0
    );
    const uniqueVehicles = new Set(activeDeliveries.map(d => d.vehicleNumber).filter(Boolean)).size;

    const handleExport = () => {
        const exportData: any[] = [];
        const activeOnly = filteredDeliveries.filter(d => !d.isVoid);

        activeOnly.forEach(d => {
            const items = d.items || [];
            items.forEach((item: any) => {
                const qty = Number(item.quantity) || 0;
                const price = Number(item.salesPrice) || 0;
                const discLine = Number(item.discount || 0);
                const taxRate = Number(d.taxRate || 0);

                // Terapkan logika pembulatan yang persis SAMA dengan fungsi formatCurrency di print document
                const round100 = (val: number) => Math.round(val / 100) * 100;

                const printedPrice = round100(price);
                const printedTotalBrutto = round100(qty * price);
                const printedDiscLine = round100(discLine);
                const itemNettoBeforeTax = (qty * price) - discLine;
                const printedTax = round100(itemNettoBeforeTax * (taxRate > 0 ? 0.11 : 0));
                const printedNettoTotal = round100(itemNettoBeforeTax * (taxRate > 0 ? 1.11 : 1));

                exportData.push({
                    'No. Surat Jalan': d.deliveryNumber,
                    'No. PO Buyer': d.poNumber || "-",
                    'No. Invoice': d.invoiceNumber || "-",
                    'Tanggal': format(new Date(d.createdAt), "yyyy-MM-dd"),
                    'Buyer / Customer': d.buyerName,
                    'SKU': item.product?.sku || "-",
                    'Nama Barang': item.product?.name || "-",
                    'Qty': qty,
                    'Satuan': item.uom || item.product?.uom || "-",
                    'Harga Satuan': printedPrice,
                    'Total Harga': printedTotalBrutto,
                    'Potongan Item': printedDiscLine,
                    'Gudang': d.warehouse?.name || "-",
                    'Sopir / Kendaraan': d.vehicleNumber || "-",
                    'Sales Person': d.salesPerson || "-",
                    'Hasil PPN 11%': printedTax,
                    'Hasil Grand Total Netto': printedNettoTotal,
                    'Status Pembayaran': d.paymentStatus === 'PAID' ? 'LUNAS' : 'PENDING'
                });
            });
        });

        exportToExcel(exportData, `Laporan_Surat_Jalan_${format(new Date(), "yyyyMMdd")}`, 'Surat Jalan');
    };

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

    return (
        <div className="p-4 md:p-8 space-y-6 bg-slate-50/50 min-h-screen">
            {/* Header Title */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight uppercase">Modul Surat Jalan (Logistik)</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        Kelola pengiriman fisik barang, kendaraan, dan pencetakan dokumen Surat Jalan.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={handleExport}
                        className="p-3 bg-white border border-slate-200 rounded-2xl hover:border-emerald-500 hover:text-emerald-500 transition-all shadow-sm flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"
                        title="Ekspor Excel"
                    >
                        <Download className="h-4 w-4" /> Excel
                    </button>
                    <button
                        onClick={handleExportXMLCoretax}
                        className="p-3 bg-white border border-slate-200 rounded-2xl hover:border-indigo-500 hover:text-indigo-500 transition-all shadow-sm flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"
                        title="Ekspor Coretax XML"
                    >
                        <FileText className="h-4 w-4" /> Coretax XML
                    </button>
                    <button
                        onClick={() => { setEditData(null); setShowSalesModal(true); }}
                        className="px-4 py-3 bg-primary text-white hover:bg-slate-900 rounded-2xl shadow-md shadow-primary/10 transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
                    >
                        <Plus className="h-4 w-4" /> Input Surat Jalan (SJ)
                    </button>
                </div>
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden flex items-center gap-4">
                    <div className="p-3.5 bg-primary/5 text-primary rounded-2xl">
                        <Truck className="h-6 w-6" />
                    </div>
                    <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Surat Jalan</span>
                        <h4 className="text-xl font-black text-slate-800 leading-tight mt-0.5">{totalSjCount} <span className="text-xs font-medium text-slate-400">Dokumen</span></h4>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden flex items-center gap-4">
                    <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                        <FileText className="h-6 w-6" />
                    </div>
                    <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Barang Terkirim</span>
                        <h4 className="text-xl font-black text-slate-800 leading-tight mt-0.5">{totalPcsShipped.toLocaleString('id-ID')} <span className="text-xs font-medium text-slate-400">Pcs</span></h4>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden flex items-center gap-4">
                    <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl">
                        <Calendar className="h-6 w-6" />
                    </div>
                    <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bulan Aktif</span>
                        <h4 className="text-xl font-black text-slate-800 leading-tight mt-0.5">{format(new Date(selectedYear, selectedMonth - 1, 1), "MMMM yyyy")}</h4>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden flex items-center gap-4">
                    <div className="p-3.5 bg-rose-50 text-rose-600 rounded-2xl">
                        <XCircle className="h-6 w-6" />
                    </div>
                    <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">SJ Dibatalkan (Void)</span>
                        <h4 className="text-xl font-black text-slate-800 leading-tight mt-0.5">{voidSjCount} <span className="text-xs font-medium text-slate-400">Transaksi</span></h4>
                    </div>
                </div>
            </div>

            {/* Filter Section */}
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari No. SJ, Invoice, PO, Customer..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-2xl text-xs font-medium focus:bg-white focus:border-primary outline-none transition-all"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <input 
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest outline-none focus:bg-white focus:border-primary transition-all text-slate-500"
                    />
                    <select
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(Number(e.target.value))}
                        className="bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-2xl text-xs font-black outline-none focus:bg-white focus:border-primary"
                    >
                        {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                                {format(new Date(2026, i, 1), "MMMM")}
                            </option>
                        ))}
                    </select>

                    <select
                        value={selectedYear}
                        onChange={e => setSelectedYear(Number(e.target.value))}
                        className="bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-2xl text-xs font-black outline-none focus:bg-white focus:border-primary"
                    >
                        {[2024, 2025, 2026, 2027, 2028].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="table-responsive">
                    <table className="table-erp table-to-cards min-w-full md:min-w-[1000px]">
                        <thead className="hidden md:table-header-group">
                            <tr>
                                <th className="w-48 md:pl-6">No. Surat Jalan</th>
                                <th className="w-52">No. Invoice & PO</th>
                                <th className="w-56">Buyer / Customer</th>
                                <th>Alamat Pengiriman</th>
                                <th className="w-36">Kendaraan</th>
                                <th className="text-right w-36">Total Qty</th>
                                <th className="text-right w-40">Tanggal Kirim</th>
                                <th className="text-center w-40">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDeliveries.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-12 text-slate-400 font-bold uppercase tracking-widest text-xs">
                                        Tidak ada Surat Jalan ditemukan untuk periode ini.
                                    </td>
                                </tr>
                            ) : (
                                filteredDeliveries.map((d: any) => (
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
                                        <td data-label="Invoice / PO">
                                            <div className="text-xs font-black text-indigo-600">{d.invoiceNumber || "-"}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">PO: {d.poNumber || "-"}</div>
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
                                        <td data-label="Kendaraan">
                                            {d.vehicleNumber ? (
                                                <span className="bg-slate-100 px-2 py-1 rounded text-[10px] font-black uppercase text-slate-600">
                                                    {d.vehicleNumber}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 font-bold italic text-xs">-</span>
                                            )}
                                        </td>
                                        <td data-label="Total Qty" className="text-right font-bold text-slate-900">
                                            {d.items.reduce((acc: number, i: any) => acc + i.quantity, 0)} <span className="text-[10px] text-slate-400">Pcs</span>
                                        </td>
                                        <td data-label="Tanggal" className="text-right text-xs text-slate-500 md:pr-4">
                                            {isClient ? format(new Date(d.createdAt), "dd/MM/yyyy HH:mm") : "..."}
                                        </td>
                                        <td data-label="Aksi" className="md:pr-6">
                                            <div className="flex items-center justify-end md:justify-center gap-1">
                                                <Link href={`/sales/print/sj/${d.id}`} className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-xl transition-all" title="Cetak Surat Jalan">
                                                    <Printer className="h-4 w-4" />
                                                </Link>
                                                <button onClick={() => { setEditData(d); setShowSalesModal(true); }} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all" title="Edit">
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                {(isAdmin || userRole === "SALES") && !d.isVoid && (
                                                    <button onClick={() => handleVoid(d.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Batalkan (Void)">
                                                        <XCircle className="h-4 w-4" />
                                                    </button>
                                                )}
                                                {d.isVoid && (
                                                    <div className="px-2 py-0.5 bg-slate-100 text-slate-400 text-[8px] font-black italic rounded-md" title={d.voidReason}>
                                                        VOID
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Sales Modal for Creating/Editing Deliveries */}
            {showSalesModal && (
                <SalesModal
                    products={products}
                    warehouses={warehouses}
                    customers={customers}
                    orders={initialSalesOrders}
                    onClose={() => {
                        setShowSalesModal(false);
                        setEditData(null);
                    }}
                    initialData={editData}
                />
            )}

            {/* Void Reason Modal */}
            <VoidReasonModal
                isOpen={showVoidModal}
                onClose={() => {
                    setShowVoidModal(false);
                    setVoidId(null);
                }}
                onConfirm={onVoidConfirm}
                title="Batalkan Surat Jalan (VOID)"
            />
        </div>
    );
}
