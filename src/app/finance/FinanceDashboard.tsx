"use client";

import { useState } from "react";
import { Plus, Search, Wallet, ArrowUpCircle, ArrowDownCircle, FileText, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { FinanceModal } from "./FinanceModal";
import { useSession } from "next-auth/react";
import { deleteFinanceTransactionAction, deleteJournalEntryAction } from "@/app/actions";
import { DashboardStats } from "../components/DashboardStats";

export function FinanceDashboard({ accounts, ledger }: { accounts: any[], ledger: any[] }) {
    const { data: session } = useSession() as any;
    const isAdmin = session?.user?.role === "ADMIN";
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const handlePrint = () => {
        window.print();
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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center hide-print">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-primary">Manajemen Keuangan</h2>
                    <p className="text-muted-foreground">Input Pembayaran, Penerimaan, dan Monitoring Kas/Bank.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handlePrint}
                        className="bg-white border-2 border-slate-200 text-slate-700 px-6 py-2 rounded-md flex items-center gap-2 hover:bg-slate-50 transition-all font-bold"
                    >
                        <FileText className="h-5 w-5" />
                        <span>Cetak Ledger</span>
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

            {/* Account Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

            {/* Transactions Table */}
            <div className="rounded-xl border bg-card shadow-sm">
                <div className="p-6 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h3 className="text-lg font-semibold text-primary">Data Jurnal & Ledger</h3>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Cari deskripsi / akun..."
                            className="w-full pl-10 pr-4 py-2 bg-muted/50 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/30 text-muted-foreground border-b text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Tanggal</th>
                                <th className="px-6 py-4">Deskripsi / Ref</th>
                                <th className="px-6 py-4">Akun</th>
                                <th className="px-6 py-4">Tipe</th>
                                <th className="px-6 py-4 text-right">Nominal</th>
                                {isAdmin && <th className="px-6 py-4 text-center w-10">Aksi</th>}
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
                                    {isAdmin && (
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
                            {filteredLedger.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                                        Belum ada data transaksi keuangan.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <FinanceModal
                    accounts={accounts}
                    onClose={() => setShowModal(false)}
                />
            )}
        </div>
    );
}
