"use client";

import { useState } from "react";
import { Plus, Search, Wallet, ArrowUpCircle, ArrowDownCircle, FileText, Trash2, Download, Eye, FileCode2 } from "lucide-react";
import { ReportPreviewModal } from "@/components/ReportPreviewModal";
import { formatCurrency, cn } from "@/lib/utils";
import { format } from "date-fns";
import { FinanceModal } from "./FinanceModal";
import { useSession } from "next-auth/react";
import { updatePaymentStatusAction, deleteFinanceTransactionAction, deleteJournalEntryAction, getCortexXmlContentAction, verifyPurchaseReturnAction, verifySalesReturnAction, updatePurchaseRequestStatusAction } from "@/app/actions";
import { DashboardStats } from "../components/DashboardStats";
import { CheckCircle2, Clock } from "lucide-react";
import { exportToExcel } from "@/lib/excel";
import { useRouter } from "next/navigation";

export function FinanceDashboard({ accounts, ledger, vendors, customers, pendingPurchases, pendingSales, unverifiedReceipts, pendingReturns, pendingSalesReturns, pendingPurchaseRequests, transactions }: {
    accounts: any[],
    ledger: any[],
    vendors: any[],
    customers: any[],
    pendingPurchases: any[],
    pendingSales: any[],
    unverifiedReceipts: any[],
    pendingReturns: any[],
    pendingSalesReturns: any[],
    pendingPurchaseRequests: any[],
    transactions: any[]
}) {
    const { data: session } = useSession() as any;
    const userRole = session?.user?.role?.toUpperCase() || "";
    const isAdmin = userRole === "ADMIN";
    const isAdminOrFinance = isAdmin || userRole === "FINANCE";
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState<"ledger" | "ap" | "ar" | "checker" | "purchase_requests" | "history">("ledger");
    const [loading, setLoading] = useState<string | null>(null);
    const router = useRouter();

    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [previewTitle, setPreviewTitle] = useState("");

    const handlePrint = () => {
        window.print();
    };

    const handleVerifyPayment = async (type: "PURCHASE" | "SALE", id: string, status: "PAID" | "CREDIT" | "PARTIAL", partialAmount?: number) => {
        let msg = status === "PAID"
            ? "Konfirmasi pelunasan transaksi ini? Saldo Kas/Bank BCA akan otomatis terupdate."
            : status === "PARTIAL"
                ? `Konfirmasi pembayaran DP / Sebagian sebesar ${formatCurrency(partialAmount || 0)}?`
                : `Konfirmasi pencatatan sebagai ${type === "PURCHASE" ? "Hutang" : "Piutang"}?`;

        if (!confirm(msg)) return;
        setLoading(id);
        try {
            await updatePaymentStatusAction(type, id, status, partialAmount);
            alert("Verifikasi berhasil.");
            router.refresh();
        } catch (e) {
            alert("Gagal memverifikasi.");
        } finally {
            setLoading(null);
        }
    };

    const handlePartialPayment = (type: "PURCHASE" | "SALE", id: string, total: number, alreadyPaid: number) => {
        const remaining = total - alreadyPaid;
        const input = prompt(`Masukkan jumlah pembayaran (Sisa: ${formatCurrency(remaining)}):`, remaining.toString());
        if (!input) return;
        const amount = Number(input);
        if (isNaN(amount) || amount <= 0 || amount > remaining) {
            alert("Jumlah tidak valid atau melebihi sisa pembayaran.");
            return;
        }
        handleVerifyPayment(type, id, amount === remaining ? "PAID" : "PARTIAL", amount);
    };

    const handleDelete = async (id: string, isManual: boolean) => {
        const msg = isManual ? "Hapus entry jurnal manual ini?" : "Hapus transaksi ini? Seluruh jurnal terkait akan dihapus.";
        if (!confirm(msg)) return;
        try {
            if (isManual) await deleteJournalEntryAction(id);
            else await deleteFinanceTransactionAction(id);
            alert("Berhasil dihapus");
            router.refresh();
        } catch (e) {
            alert("Gagal menghapus.");
        }
    };

    const filteredLedger = ledger.filter(tx =>
        tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.account?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredPurchases = pendingPurchases.filter(p =>
        p.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.receivedFrom.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredSales = pendingSales.filter(s =>
        s.deliveryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.buyerName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredReturns = pendingReturns.filter(r =>
        r.returnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.receipt?.receivedFrom.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredSalesReturns = pendingSalesReturns.filter(r =>
        r.returnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.delivery?.buyerName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExport = () => {
        if (activeTab === "ledger") {
            const data = filteredLedger.map(tx => ({
                'Tanggal': format(new Date(tx.date), "dd/MM/yyyy"),
                'Deskripsi': tx.description,
                'Ref': tx.transaction?.referenceNumber || '-',
                'Akun': tx.account?.name,
                'Tipe': tx.type,
                'Nominal': Number(tx.amount)
            }));
            exportToExcel(data, 'Laporan_Jurnal_Keuangan', 'Ledger');
        } else if (activeTab === "ap") {
            const data = filteredPurchases.map(p => ({
                'Tanggal': format(new Date(p.createdAt), "dd/MM/yyyy"),
                'No. Terima': p.receiptNumber,
                'Supplier': p.receivedFrom,
                'Total': Number(p.total),
                'Status Pembayaran': p.paymentStatus,
                'Status Gudang': p.isVerified ? 'VERIFIED' : 'PENDING'
            }));
            exportToExcel(data, 'Laporan_Hutang_Dagang', 'AP');
        } else if (activeTab === "ar") {
            const data = filteredSales.map(s => ({
                'Tanggal': format(new Date(s.createdAt), "dd/MM/yyyy"),
                'No. SJ': s.deliveryNumber,
                'Pelanggan': s.buyerName,
                'Total': Number(s.total),
                'Status Pembayaran': s.paymentStatus
            }));
            exportToExcel(data, 'Laporan_Piutang_Dagang', 'AR');
        } else if (activeTab === "checker") {
            const data = unverifiedReceipts.map(r => ({
                'Tanggal': format(new Date(r.createdAt), "dd/MM/yyyy"),
                'No. Terima': r.receiptNumber,
                'Supplier': r.receivedFrom,
                'Gudang': r.warehouse?.name,
                'Item Count': r.items.length
            }));
            exportToExcel(data, 'Laporan_Penerimaan_Pending_Gudang', 'Pending');
        }
    };

    const handleExportCortex = async () => {
        if (activeTab !== "ar") return;
        try {
            const xml = await getCortexXmlContentAction();
            const blob = new Blob([xml], { type: "application/xml" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Cortex_Sales_Export_${format(new Date(), "yyyyMMdd_HHmm")}.xml`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to generate Cortex XML:", error);
            alert("Gagal melakukan export XML Cortex.");
        }
    };

    const handleVerifyReturn = async (id: string, vendorName: string) => {
        if (!confirm(`Verifikasi retur ini? Saldo Hutang (AP) ke ${vendorName} akan otomatis dikurangi!`)) return;
        setLoading(id);
        try {
            await verifyPurchaseReturnAction(id);
            alert("Retur berhasil diverifikasi, hutang vendor berkurang.");
            router.refresh();
        } catch (e: any) {
            alert(e.message || "Gagal memverifikasi retur.");
        } finally {
            setLoading(null);
        }
    };

    const handleVerifySalesReturn = async (id: string, buyerName: string) => {
        if (!confirm(`Verifikasi retur penjualan ini? Saldo Piutang (AR) dari ${buyerName} akan otomatis dikurangi!`)) return;
        setLoading(id);
        try {
            await verifySalesReturnAction(id);
            alert("Retur berhasil diverifikasi, piutang buyer berkurang.");
            router.refresh();
        } catch (e: any) {
            alert(e.message || "Gagal memverifikasi retur penjualan.");
        } finally {
            setLoading(null);
        }
    };

    const handleVerifyPurchaseRequest = async (id: string, reqNumber: string) => {
        if (!confirm(`Verifikasi pengajuan ${reqNumber}? Saldo Kas/Bank BCA dan Biaya Operasional akan dicatat otomatis.`)) return;
        setLoading(id);
        try {
            await updatePurchaseRequestStatusAction(id, "VERIFIED_BY_FINANCE");
            alert("Pengajuan berhasil diverifikasi.");
            router.refresh();
        } catch (e: any) {
            alert(e.message || "Gagal memverifikasi pengajuan.");
        } finally {
            setLoading(null);
        }
    };

    const filteredPurchaseRequests = pendingPurchaseRequests.filter(r =>
        r.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.requestedBy?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handlePreview = () => {
        if (activeTab === "ledger") {
            const data = filteredLedger.map(tx => ({
                'Tanggal': format(new Date(tx.date), "dd/MM/yyyy"),
                'Deskripsi': tx.description,
                'Ref': tx.transaction?.referenceNumber || '-',
                'Akun': tx.account?.name,
                'Tipe': tx.type,
                'Nominal': Number(tx.amount)
            }));
            setPreviewData(data);
            setPreviewTitle("Laporan Jurnal Keuangan (Ledger)");
        } else if (activeTab === "ap") {
            const data = filteredPurchases.map(p => ({
                'Tanggal': format(new Date(p.createdAt), "dd/MM/yyyy"),
                'No. Terima': p.receiptNumber,
                'Supplier': p.receivedFrom,
                'Total': Number(p.total),
                'Status': p.paymentStatus,
                'Gudang': p.isVerified ? 'VERIFIED' : 'PENDING'
            }));
            setPreviewData(data);
            setPreviewTitle("Buku Pembantu Hutang (AP)");
        } else if (activeTab === "ar") {
            const data = filteredSales.map(s => ({
                'Tanggal': format(new Date(s.createdAt), "dd/MM/yyyy"),
                'No. SJ': s.deliveryNumber,
                'Pelanggan': s.buyerName,
                'Total': Number(s.total),
                'Status': s.paymentStatus
            }));
            setPreviewData(data);
            setPreviewTitle("Buku Pembantu Piutang (AR)");
        } else if (activeTab === "checker") {
            const data = unverifiedReceipts.map(r => ({
                'Tanggal': format(new Date(r.createdAt), "dd/MM/yyyy"),
                'No. Terima': r.receiptNumber,
                'Supplier': r.receivedFrom,
                'Gudang': r.warehouse?.name,
                'Item Count': r.items.length
            }));
            setPreviewData(data);
            setPreviewTitle("Daftar Penerimaan Menunggu Checker");
        }
        setShowPreview(true);
    };

    const apAccount = accounts.find((a: any) => a.code === '201');
    const arAccount = accounts.find((a: any) => a.code === '105');

    // We display absolute numeric value from the ledger (GL balances). Liability is technically credit-normal so it is positive in our UI since we handle subtraction under the hood or we Math.abs it, same for AR.
    const totalHutang = Math.abs(apAccount ? apAccount.balance : 0);
    const totalPiutang = Math.abs(arAccount ? arAccount.balance : 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-end gap-4 hide-print mb-4">
                <div className="flex flex-wrap gap-2 justify-center md:justify-end">
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
                    {activeTab === "ar" && (
                        <button
                            onClick={handleExportCortex}
                            className="bg-orange-600 text-white px-6 py-2 rounded-md flex items-center gap-2 hover:bg-orange-700 shadow-lg shadow-orange-200 transition-all active:scale-95 font-bold animate-in fade-in"
                        >
                            <FileCode2 className="h-5 w-5" />
                            <span>Export Cortex (XML)</span>
                        </button>
                    )}
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-primary text-white px-6 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95 font-bold"
                    >
                        <Plus className="h-5 w-5 text-white" />
                        <span className="text-white">Input Transaksi</span>
                    </button>
                </div>
            </div>

            <div className="hide-print">
                <DashboardStats />
            </div>

            {/* Quick Stats Hutang/Piutang */}
            <div className="grid gap-4 md:grid-cols-2 hide-print">
                <div className="p-6 rounded-xl border bg-card shadow-sm border-l-4 border-l-red-500">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Total Hutang (AP)</p>
                    <p className="text-2xl font-black mt-1 text-red-600">{formatCurrency(totalHutang)}</p>
                </div>
                <div className="p-6 rounded-xl border bg-card shadow-sm border-l-4 border-l-emerald-500">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Total Piutang (AR)</p>
                    <p className="text-2xl font-black mt-1 text-emerald-600">{formatCurrency(totalPiutang)}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b hide-print">
                <button
                    onClick={() => setActiveTab("ledger")}
                    className={cn(
                        "px-6 py-3 text-sm font-bold transition-all border-b-2",
                        activeTab === "ledger" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
                    )}
                >
                    Jurnal & Ledger
                </button>
                <button
                    onClick={() => setActiveTab("ap")}
                    className={cn(
                        "px-6 py-3 text-sm font-bold transition-all border-b-2",
                        activeTab === "ap" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
                    )}
                >
                    Hutang & Verifikasi (AP)
                </button>
                <button
                    onClick={() => setActiveTab("ar")}
                    className={cn(
                        "px-6 py-3 text-sm font-bold transition-all border-b-2",
                        activeTab === "ar" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
                    )}
                >
                    Piutang & Verifikasi (AR)
                </button>
                <button
                    onClick={() => setActiveTab("checker")}
                    className={cn(
                        "px-6 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2",
                        activeTab === "checker" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
                    )}
                >
                    Penerimaan (Gudang)
                    {unverifiedReceipts.length > 0 && <span className="bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{unverifiedReceipts.length}</span>}
                </button>
                <button
                    onClick={() => setActiveTab("purchase_requests")}
                    className={cn(
                        "px-6 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2",
                        activeTab === "purchase_requests" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
                    )}
                >
                    Pengajuan Pembelian
                    {pendingPurchaseRequests.length > 0 && <span className="bg-orange-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{pendingPurchaseRequests.length}</span>}
                </button>
                <button
                    onClick={() => setActiveTab("history")}
                    className={cn(
                        "px-6 py-3 text-sm font-bold transition-all border-b-2",
                        activeTab === "history" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
                    )}
                >
                    Riwayat Transaksi
                </button>
            </div>

            {/* Tab Content */}
            <div className="rounded-xl border bg-card shadow-sm">
                <div className="p-6 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h3 className="text-lg font-semibold text-primary capitalize">
                        {activeTab === "ledger" ? "Data Jurnal & Ledger" :
                            activeTab === "ap" ? "Buku Pembantu Hutang & Pelunasan" :
                                activeTab === "ar" ? "Buku Pembantu Piutang & Pelunasan" :
                                    activeTab === "checker" ? "Penerimaan Menunggu Checker" :
                                        activeTab === "purchase_requests" ? "Pengajuan Pembelian (Menunggu Finance)" :
                                            "Riwayat Input Transaksi Keuangan"}
                    </h3>
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

                {activeTab === "ledger" && (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-sm text-left min-w-[1000px]">
                            <thead className="bg-muted/30 text-muted-foreground border-b text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Tanggal</th>
                                    <th className="px-6 py-4">Deskripsi / Ref</th>
                                    <th className="px-6 py-4">Akun</th>
                                    <th className="px-6 py-4">Tipe</th>
                                    <th className="px-6 py-4 text-right">Nominal</th>
                                    {isAdminOrFinance && <th className="px-6 py-4 text-center w-10">Aksi</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredLedger.map((tx: any) => (
                                    <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                                        <td className="px-6 py-4 text-muted-foreground">
                                            {format(new Date(tx.date), "dd/MM/yyyy")}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium">{tx.description}</div>
                                            {tx.transaction && (
                                                <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1 font-mono uppercase">
                                                    <FileText className="h-3 w-3" /> {tx.transaction.bank} | {tx.transaction.referenceNumber || 'Cash'}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-xs">
                                            <span className="bg-muted px-2 py-0.5 rounded uppercase font-bold text-[10px]">
                                                {tx.account?.name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${tx.type === "DEBIT" ? "bg-emerald-500/10 text-emerald-600" : "bg-blue-500/10 text-blue-600"}`}>
                                                {tx.type}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 text-right font-bold ${tx.type === "DEBIT" ? "text-emerald-600" : "text-blue-600"}`}>
                                            {formatCurrency(Number(tx.amount))}
                                        </td>
                                        {isAdminOrFinance && (
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleDelete(tx.transactionId || tx.id, !tx.transactionId)}
                                                    className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title={tx.transactionId ? "Hapus Transaksi" : "Hapus Entry Jurnal"}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === "ap" && (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/30 text-muted-foreground border-b text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Tgl / Ref</th>
                                        <th className="px-6 py-4">Supplier</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Nominal</th>
                                        <th className="px-6 py-4 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredPurchases.map((p: any) => (
                                        <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="text-xs text-muted-foreground">{format(new Date(p.createdAt), "dd/MM/yy")}</div>
                                                <div className="font-mono text-[10px]">{p.receiptNumber}</div>
                                            </td>
                                            <td className="px-6 py-4 font-bold">{p.receivedFrom}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="flex items-center gap-1.5 text-amber-600 font-bold text-xs uppercase">
                                                        <Clock className="h-3 w-3" /> {p.paymentStatus}
                                                    </span>
                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded w-fit uppercase ${p.isVerified ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                                        {p.isVerified ? "Gudang: Check OK" : "Gudang: Pending"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="font-black text-red-600">{formatCurrency(p.total)}</div>
                                                {Number(p.paidAmount || 0) > 0 && (
                                                    <div className="text-[10px] text-emerald-600 font-bold mt-1">
                                                        Dibayar: {formatCurrency(Number(p.paidAmount))}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col gap-2 items-center justify-center">
                                                    {p.paymentStatus === 'PENDING' && (
                                                        <button
                                                            disabled={loading === p.id || (!p.isVerified && !isAdmin)}
                                                            onClick={() => handleVerifyPayment("PURCHASE", p.id, "CREDIT")}
                                                            className="bg-amber-100 text-amber-700 hover:bg-amber-200 w-full px-3 py-1 rounded text-[10px] font-bold transition-all disabled:opacity-50"
                                                            title={!p.isVerified ? (isAdmin ? "Bypass verifikasi gudang (Admin)" : "Mohon tunggu verifikasi stok gudang") : "Catat sebagai Hutang Tempo"}
                                                        >
                                                            {loading === p.id ? "..." : "SET HUTANG"}
                                                        </button>
                                                    )}
                                                    {(p.paymentStatus === 'CREDIT' || p.paymentStatus === 'PARTIAL') && (
                                                        <button
                                                            disabled={loading === p.id}
                                                            onClick={() => handlePartialPayment("PURCHASE", p.id, Number(p.total), Number(p.paidAmount || 0))}
                                                            className="bg-blue-100 text-blue-700 hover:bg-blue-200 w-full px-3 py-1 rounded text-[10px] font-bold transition-all disabled:opacity-50"
                                                        >
                                                            DP / SEBAGIAN
                                                        </button>
                                                    )}
                                                    <button
                                                        disabled={loading === p.id || (!p.isVerified && !isAdmin)}
                                                        onClick={() => handleVerifyPayment("PURCHASE", p.id, "PAID")}
                                                        className="bg-emerald-500 w-full text-white px-3 py-1 rounded text-[10px] font-bold hover:bg-emerald-600 transition-all disabled:opacity-50 shadow-sm"
                                                        title={!p.isVerified ? (isAdmin ? "Bypass verifikasi gudang (Admin)" : "Mohon tunggu verifikasi stok gudang") : "Lunas Kas/Bank"}
                                                    >
                                                        {loading === p.id ? "..." : (p.paymentStatus === 'PENDING' ? "LUNAS TUNAI" : "PELUNASAN")}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredPurchases.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                                                Tidak ada pembelian yang butuh verifikasi (Lunas).
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-8 border-t pt-6">
                            <h3 className="text-lg font-bold text-rose-800 mb-4 capitalize">Pengajuan Retur Pembelian (Pending)</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-rose-50 border-b border-rose-100 text-rose-800 text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4">No. Retur</th>
                                            <th className="px-6 py-4">Tanggal Pengajuan</th>
                                            <th className="px-6 py-4">Ref. LPB</th>
                                            <th className="px-6 py-4">Vendor</th>
                                            <th className="px-6 py-4 text-center">Qty Diretur</th>
                                            <th className="px-6 py-4 text-center">Aksi</th>
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
                                                    <button
                                                        disabled={loading === r.id}
                                                        onClick={() => handleVerifyReturn(r.id, r.receipt?.receivedFrom)}
                                                        className="bg-rose-600 text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-rose-700 shadow-sm transition-all disabled:opacity-50"
                                                    >
                                                        {loading === r.id ? "..." : "Verifikasi Retur"}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredReturns.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-rose-400 italic">
                                                    Tidak ada pengajuan retur pembelian yang pending.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === "ar" && (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/30 text-muted-foreground border-b text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Tgl / Ref</th>
                                        <th className="px-6 py-4">Pelanggan</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Nominal</th>
                                        <th className="px-6 py-4 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredSales.map((s: any) => (
                                        <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="text-xs text-muted-foreground">{format(new Date(s.createdAt), "dd/MM/yy")}</div>
                                                <div className="font-mono text-[10px]">{s.deliveryNumber}</div>
                                            </td>
                                            <td className="px-6 py-4 font-bold">{s.buyerName}</td>
                                            <td className="px-6 py-4">
                                                <span className="flex items-center gap-1.5 text-blue-600 font-bold text-xs">
                                                    <Clock className="h-3 w-3" /> {s.paymentStatus}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="font-black text-emerald-600">{formatCurrency(s.total)}</div>
                                                {Number(s.paidAmount || 0) > 0 && (
                                                    <div className="text-[10px] text-blue-600 font-bold mt-1">
                                                        Diterima: {formatCurrency(Number(s.paidAmount))}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col gap-2 items-center justify-center">
                                                    {s.paymentStatus === 'PENDING' && (
                                                        <button
                                                            disabled={loading === s.id}
                                                            onClick={() => handleVerifyPayment("SALE", s.id, "CREDIT")}
                                                            className="bg-blue-100 text-blue-700 hover:bg-blue-200 w-full px-3 py-1 rounded text-[10px] font-bold transition-all disabled:opacity-50"
                                                            title="Catat sebagai Piutang Tempo"
                                                        >
                                                            {loading === s.id ? "..." : "SET PIUTANG"}
                                                        </button>
                                                    )}
                                                    {(s.paymentStatus === 'CREDIT' || s.paymentStatus === 'PARTIAL') && (
                                                        <button
                                                            disabled={loading === s.id}
                                                            onClick={() => handlePartialPayment("SALE", s.id, Number(s.total), Number(s.paidAmount || 0))}
                                                            className="bg-blue-100 text-blue-700 hover:bg-blue-200 w-full px-3 py-1 rounded text-[10px] font-bold transition-all disabled:opacity-50"
                                                        >
                                                            DP / SEBAGIAN
                                                        </button>
                                                    )}
                                                    <button
                                                        disabled={loading === s.id}
                                                        onClick={() => handleVerifyPayment("SALE", s.id, "PAID")}
                                                        className="bg-emerald-500 w-full text-white px-3 py-1 rounded text-[10px] font-bold hover:bg-emerald-600 transition-all disabled:opacity-50 shadow-sm"
                                                        title="Lunas Kas/Bank"
                                                    >
                                                        {loading === s.id ? "..." : (s.paymentStatus === 'PENDING' ? "LUNAS TUNAI" : "PELUNASAN")}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredSales.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                                                Tidak ada penjualan yang butuh verifikasi (Lunas).
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-8 border-t pt-6">
                            <h3 className="text-lg font-bold text-blue-800 mb-4 capitalize">Pengajuan Retur Penjualan (Pending)</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-blue-50 border-b border-blue-100 text-blue-800 text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4">No. Retur</th>
                                            <th className="px-6 py-4">Tanggal Pengajuan</th>
                                            <th className="px-6 py-4">Ref. SJ</th>
                                            <th className="px-6 py-4 text-right">Qty Diretur</th>
                                            <th className="px-6 py-4 text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-blue-50">
                                        {filteredSalesReturns.map((r: any) => (
                                            <tr key={r.id} className="hover:bg-blue-50/50 transition-colors">
                                                <td className="px-6 py-4 font-mono font-bold text-blue-600">
                                                    <div>{r.returnNumber}</div>
                                                    <div className="text-[10px] text-slate-500 font-normal">{r.delivery?.buyerName}</div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500">{format(new Date(r.date || r.createdAt), "dd/MM/yyyy")}</td>
                                                <td className="px-6 py-4 text-slate-600">{r.delivery?.deliveryNumber}</td>
                                                <td className="px-6 py-4 text-right font-bold text-blue-600">
                                                    {r.items?.reduce((acc: number, i: any) => acc + i.quantity, 0)} Items
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        disabled={loading === r.id}
                                                        onClick={() => handleVerifySalesReturn(r.id, r.delivery?.buyerName)}
                                                        className="bg-blue-600 text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50"
                                                    >
                                                        {loading === r.id ? "..." : "Verifikasi Retur"}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredSalesReturns.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-blue-400 italic">
                                                    Tidak ada pengajuan retur penjualan yang pending.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === "checker" && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/30 text-muted-foreground border-b text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Tgl / No. Terima</th>
                                    <th className="px-6 py-4">Supplier</th>
                                    <th className="px-6 py-4">Barang</th>
                                    <th className="px-6 py-4">Gudang</th>
                                    <th className="px-6 py-4 text-center">Status Gudang</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {unverifiedReceipts.map((r: any) => (
                                    <tr key={r.id}>
                                        <td className="px-6 py-4">
                                            <div className="text-xs text-muted-foreground">{format(new Date(r.createdAt), "dd/MM/yy")}</div>
                                            <div className="font-mono text-[10px]">{r.receiptNumber}</div>
                                        </td>
                                        <td className="px-6 py-4 font-bold">{r.receivedFrom}</td>
                                        <td className="px-6 py-4 text-xs">
                                            {r.items.length} Item
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{r.warehouse?.name}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
                                                Menunggu Cek
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {unverifiedReceipts.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                                            Semua penerimaan barang telah dicek fisik oleh gudang.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === "purchase_requests" && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/30 text-muted-foreground border-b text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Tgl / No. Pengajuan</th>
                                    <th className="px-6 py-4">Pemohon</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Estimasi Biaya</th>
                                    <th className="px-6 py-4 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredPurchaseRequests.map((r: any) => {
                                    const totalEst = r.items.reduce((acc: number, item: any) => acc + (item.quantity * Number(item.estimatedPrice)), 0);
                                    return (
                                        <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="text-xs text-muted-foreground">{format(new Date(r.createdAt), "dd/MM/yy")}</div>
                                                <div className="font-mono text-[10px] font-bold text-orange-600">{r.number}</div>
                                            </td>
                                            <td className="px-6 py-4 font-bold">{r.requestedBy?.name}</td>
                                            <td className="px-6 py-4">
                                                <span className="flex items-center gap-1.5 text-orange-600 font-bold text-xs uppercase">
                                                    <Clock className="h-3 w-3" /> {r.status === "APPROVED_BY_ADMIN" ? "MENUNGGU FINANCE" : r.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-rose-600">
                                                {formatCurrency(totalEst)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    disabled={loading === r.id}
                                                    onClick={() => handleVerifyPurchaseRequest(r.id, r.number)}
                                                    className="bg-orange-500 w-full text-white px-3 py-1.5 rounded text-[10px] font-bold hover:bg-orange-600 transition-all disabled:opacity-50 uppercase shadow-sm"
                                                    title="Verifikasi dan Catat Pengeluaran Bank"
                                                >
                                                    {loading === r.id ? "..." : "Selesai / Lunas"}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredPurchaseRequests.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                                            Tidak ada pengajuan pembelian yang menunggu verifikasi Finance.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === "history" && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/30 text-muted-foreground border-b text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Waktu Input</th>
                                    <th className="px-6 py-4">Tipe</th>
                                    <th className="px-6 py-4">Bank / Metode</th>
                                    <th className="px-6 py-4">Deskripsi</th>
                                    <th className="px-6 py-4 text-right">Nominal</th>
                                    {isAdminOrFinance && <th className="px-6 py-4 text-center w-10">Aksi</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {transactions.map((tx: any) => (
                                    <tr key={tx.id} className="hover:bg-muted/20 transition-colors text-xs">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900">{format(new Date(tx.date), "dd/MM/yyyy")}</div>
                                            <div className="text-[10px] text-muted-foreground">{format(new Date(tx.date), "HH:mm:ss")}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${tx.transactionType === "PAYMENT" ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-600"}`}>
                                                {tx.transactionType === "PAYMENT" ? "KELUAR" : "MASUK"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium uppercase tracking-tighter">{tx.bank}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium line-clamp-1" title={tx.description}>{tx.description}</div>
                                            {tx.referenceNumber && <div className="text-[10px] text-muted-foreground">Ref: {tx.referenceNumber}</div>}
                                        </td>
                                        <td className={`px-6 py-4 text-right font-black ${tx.transactionType === "PAYMENT" ? "text-red-600" : "text-emerald-600"}`}>
                                            {formatCurrency(Number(tx.amount))}
                                        </td>
                                        {isAdminOrFinance && (
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleDelete(tx.id, false)}
                                                    className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {transactions.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">
                                            Belum ada riwayat transaksi.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Partner Summaries (Only shown when relevant) */}
            {
                (activeTab === "ap" || activeTab === "ar") && (
                    <div className="rounded-xl border bg-card shadow-sm mt-6">
                        <div className="p-6 border-b">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                                {activeTab === "ap" ? "Ringkasan Saldo Hutang Supplier" : "Ringkasan Saldo Piutang Buyer"}
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/10 text-muted-foreground border-b text-[10px] uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Nama</th>
                                        <th className="px-6 py-4 text-right">Total Saldo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {(activeTab === "ap" ? vendors : customers).map((v: any) => (
                                        <tr key={v.id}>
                                            <td className="px-6 py-3 font-medium">{v.name}</td>
                                            <td className={`px-6 py-3 text-right font-bold ${activeTab === "ap" ? "text-red-600" : "text-emerald-600"}`}>
                                                {formatCurrency(v.balance)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            {/* Account Summary Cards */}
            {
                activeTab === "ledger" && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 hide-print">
                        {accounts.map((account: any) => (
                            <div key={account.id} className="p-6 rounded-xl border bg-card hover:border-primary/50 transition-colors shadow-sm">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">{account.code}</p>
                                        <h3 className="text-sm font-bold mt-1 leading-tight">{account.name}</h3>
                                    </div>
                                    <Wallet className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <p className="text-xl font-bold mt-4 tracking-tight">{formatCurrency(account.balance)}</p>
                            </div>
                        ))}
                    </div>
                )
            }

            {
                showModal && (
                    <FinanceModal
                        accounts={accounts}
                        onClose={() => setShowModal(false)}
                    />
                )
            }

            {
                showPreview && (
                    <ReportPreviewModal
                        title={previewTitle}
                        data={previewData}
                        onClose={() => setShowPreview(false)}
                        onExport={handleExport}
                    />
                )
            }
        </div >
    );
}
