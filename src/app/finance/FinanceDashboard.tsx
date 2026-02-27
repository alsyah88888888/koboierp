"use client";

import { useState } from "react";
import { Plus, Search, Wallet, ArrowUpCircle, ArrowDownCircle, FileText, Trash2 } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { format } from "date-fns";
import { FinanceModal } from "./FinanceModal";
import { useSession } from "next-auth/react";
import { updatePaymentStatusAction, deleteFinanceTransactionAction, deleteJournalEntryAction } from "@/app/actions";
import { DashboardStats } from "../components/DashboardStats";
import { CheckCircle2, Clock } from "lucide-react";

export function FinanceDashboard({ accounts, ledger, vendors, customers, pendingPurchases, pendingSales, unverifiedReceipts }: {
    accounts: any[],
    ledger: any[],
    vendors: any[],
    customers: any[],
    pendingPurchases: any[],
    pendingSales: any[],
    unverifiedReceipts: any[]
}) {
    const { data: session } = useSession() as any;
    const userRole = session?.user?.role?.toUpperCase() || "";
    const isAdminOrFinance = userRole === "ADMIN" || userRole === "FINANCE";
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState<"ledger" | "ap" | "ar" | "checker">("ledger");
    const [loading, setLoading] = useState<string | null>(null);

    const handlePrint = () => {
        window.print();
    };

    const handleVerifyPayment = async (type: "PURCHASE" | "SALE", id: string) => {
        if (!confirm("Konfirmasi pelunasan transaksi ini? Saldo Bank BCA akan otomatis terupdate.")) return;
        setLoading(id);
        try {
            await updatePaymentStatusAction(type, id, "PAID");
            alert("Pembayaran berhasil diverifikasi.");
        } catch (e) {
            alert("Gagal memverifikasi pembayaran.");
        } finally {
            setLoading(null);
        }
    };

    const handleDelete = async (id: string, isManual: boolean) => {
        const msg = isManual ? "Hapus entry jurnal manual ini?" : "Hapus transaksi ini? Seluruh jurnal terkait akan dihapus.";
        if (!confirm(msg)) return;
        try {
            if (isManual) await deleteJournalEntryAction(id);
            else await deleteFinanceTransactionAction(id);
            alert("Berhasil dihapus");
        } catch (e) {
            alert("Gagal menghapus");
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

    const totalHutang = vendors.reduce((sum, v) => sum + v.balance, 0);
    const totalPiutang = customers.reduce((sum, c) => sum + c.balance, 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center hide-print">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-primary">Manajemen Keuangan</h2>
                    <p className="text-muted-foreground">Verifikasi Pelunasan dan Monitoring Arus Kas.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handlePrint}
                        className="bg-white border-2 border-slate-200 text-slate-700 px-6 py-2 rounded-md flex items-center gap-2 hover:bg-slate-50 transition-all font-bold"
                    >
                        <FileText className="h-5 w-5" />
                        <span>Cetak Laporan</span>
                    </button>
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
            </div>

            {/* Tab Content */}
            <div className="rounded-xl border bg-card shadow-sm">
                <div className="p-6 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h3 className="text-lg font-semibold text-primary capitalize">
                        {activeTab === "ledger" ? "Data Jurnal & Ledger" : activeTab === "ap" ? "Buku Pembantu Hutang & Pelunasan" : "Buku Pembantu Piutang & Pelunasan"}
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
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
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
                                        <td className="px-6 py-4 text-right font-black text-red-600">
                                            {formatCurrency(p.total)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                disabled={loading === p.id || !p.isVerified}
                                                onClick={() => handleVerifyPayment("PURCHASE", p.id)}
                                                className="bg-emerald-500 text-white px-3 py-1 rounded text-[10px] font-bold hover:bg-emerald-600 transition-all disabled:opacity-50"
                                                title={!p.isVerified ? "Mohon tunggu verifikasi stok gudang" : ""}
                                            >
                                                {loading === p.id ? "..." : "Set LUNAS"}
                                            </button>
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
                )}

                {activeTab === "ar" && (
                    // ... (Sales table remains same)
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
                                        <td className="px-6 py-4 text-right font-black text-emerald-600">
                                            {formatCurrency(s.total)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                disabled={loading === s.id}
                                                onClick={() => handleVerifyPayment("SALE", s.id)}
                                                className="bg-emerald-500 text-white px-3 py-1 rounded text-[10px] font-bold hover:bg-emerald-600 transition-all disabled:opacity-50"
                                            >
                                                {loading === s.id ? "..." : "Set LUNAS"}
                                            </button>
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
            </div>

            {/* Partner Summaries (Only shown when relevant) */}
            {(activeTab === "ap" || activeTab === "ar") && (
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
            )}

            {/* Account Summary Cards */}
            {activeTab === "ledger" && (
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
            )}

            {showModal && (
                <FinanceModal
                    accounts={accounts}
                    onClose={() => setShowModal(false)}
                />
            )}
        </div>
    );
}
