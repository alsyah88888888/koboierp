"use client";

import { useState } from "react";
import { format } from "date-fns";
import { FileText, Calculator, BarChart3, Scale, Search, Download } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { exportToExcel } from "@/lib/excel";

export function AccountingDashboard({ journals, accounts }: { journals: any[], accounts: any[] }) {
    const [activeTab, setActiveTab] = useState<"JOURNAL" | "LEDGER" | "PNL" | "BALANCE">("PNL");

    // JOURNAL STATE
    const [journalSearch, setJournalSearch] = useState("");
    const filteredJournals = journals.filter(j =>
        j.description.toLowerCase().includes(journalSearch.toLowerCase()) ||
        j.account?.name.toLowerCase().includes(journalSearch.toLowerCase())
    );

    // LEDGER STATE
    const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || "");
    const selectedAccount = accounts.find(a => a.id === selectedAccountId);
    const ledgerJournals = journals.filter(j => j.accountId === selectedAccountId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // CALCULATIONS: PNL
    const revenueAccounts = accounts.filter(a => a.type === "INCOME").map(a => {
        const accJournals = journals.filter(j => j.accountId === a.id);
        const credit = accJournals.filter(j => j.type === "CREDIT").reduce((sum, j) => sum + Number(j.amount), 0);
        const debit = accJournals.filter(j => j.type === "DEBIT").reduce((sum, j) => sum + Number(j.amount), 0);
        return { ...a, balance: credit - debit };
    });

    const expenseAccounts = accounts.filter(a => a.type === "EXPENSE").map(a => {
        const accJournals = journals.filter(j => j.accountId === a.id);
        const debit = accJournals.filter(j => j.type === "DEBIT").reduce((sum, j) => sum + Number(j.amount), 0);
        const credit = accJournals.filter(j => j.type === "CREDIT").reduce((sum, j) => sum + Number(j.amount), 0);
        return { ...a, balance: debit - credit };
    });

    const totalRevenue = revenueAccounts.reduce((sum, a) => sum + a.balance, 0);
    const totalExpense = expenseAccounts.reduce((sum, a) => sum + a.balance, 0);
    const netIncome = totalRevenue - totalExpense;

    // CALCULATIONS: BALANCE SHEET
    const assetAccounts = accounts.filter(a => a.type === "ASSET").map(a => {
        const accJournals = journals.filter(j => j.accountId === a.id);
        const debit = accJournals.filter(j => j.type === "DEBIT").reduce((sum, j) => sum + Number(j.amount), 0);
        const credit = accJournals.filter(j => j.type === "CREDIT").reduce((sum, j) => sum + Number(j.amount), 0);
        return { ...a, balance: debit - credit };
    });

    const liabilityAccounts = accounts.filter(a => a.type === "LIABILITY").map(a => {
        const accJournals = journals.filter(j => j.accountId === a.id);
        const credit = accJournals.filter(j => j.type === "CREDIT").reduce((sum, j) => sum + Number(j.amount), 0);
        const debit = accJournals.filter(j => j.type === "DEBIT").reduce((sum, j) => sum + Number(j.amount), 0);
        return { ...a, balance: credit - debit };
    });

    const equityAccounts = accounts.filter(a => a.type === "EQUITY").map(a => {
        const accJournals = journals.filter(j => j.accountId === a.id);
        const credit = accJournals.filter(j => j.type === "CREDIT").reduce((sum, j) => sum + Number(j.amount), 0);
        const debit = accJournals.filter(j => j.type === "DEBIT").reduce((sum, j) => sum + Number(j.amount), 0);
        return { ...a, balance: credit - debit };
    });

    const totalAsset = assetAccounts.reduce((sum, a) => sum + a.balance, 0);
    const totalLiability = liabilityAccounts.reduce((sum, a) => sum + a.balance, 0);
    const totalEquityRaw = equityAccounts.reduce((sum, a) => sum + a.balance, 0);
    const totalEquity = totalEquityRaw + netIncome; // Current year earnings added to equity

    const handleExport = () => {
        if (activeTab === "PNL") {
            const data = [
                ...revenueAccounts.map(a => ({ Tipe: 'Pendapatan', Akun: a.name, Saldo: a.balance })),
                { Tipe: 'TOTAL PENDAPATAN', Akun: '', Saldo: totalRevenue },
                ...expenseAccounts.map(a => ({ Tipe: 'Beban', Akun: a.name, Saldo: a.balance })),
                { Tipe: 'TOTAL BEBAN', Akun: '', Saldo: totalExpense },
                { Tipe: 'LABA/RUGI BERSIH', Akun: '', Saldo: netIncome },
            ];
            exportToExcel(data, "Laba_Rugi", "PNL");
        } else if (activeTab === "BALANCE") {
            const data = [
                ...assetAccounts.map(a => ({ Tipe: 'Aset', Akun: a.name, Saldo: a.balance })),
                { Tipe: 'TOTAL ASET', Akun: '', Saldo: totalAsset },
                ...liabilityAccounts.map(a => ({ Tipe: 'Kewajiban', Akun: a.name, Saldo: a.balance })),
                { Tipe: 'TOTAL KEWAJIBAN', Akun: '', Saldo: totalLiability },
                ...equityAccounts.map(a => ({ Tipe: 'Ekuitas', Akun: a.name, Saldo: a.balance })),
                { Tipe: 'Laba Tahun Berjalan', Akun: '', Saldo: netIncome },
                { Tipe: 'TOTAL EKUITAS & KEWAJIBAN', Akun: '', Saldo: totalLiability + totalEquity },
            ];
            exportToExcel(data, "Neraca_Keuangan", "Neraca");
        } else if (activeTab === "LEDGER") {
            let runningBal = 0;
            const data = ledgerJournals.map(j => {
                const amt = Number(j.amount);
                const isDebitIncrease = selectedAccount?.type === "ASSET" || selectedAccount?.type === "EXPENSE";

                if (j.type === "DEBIT") runningBal += isDebitIncrease ? amt : -amt;
                else runningBal += isDebitIncrease ? -amt : amt;

                return {
                    Tanggal: format(new Date(j.date), "dd/MM/yyyy HH:mm"),
                    Deskripsi: j.description,
                    Debit: j.type === "DEBIT" ? amt : 0,
                    Kredit: j.type === "CREDIT" ? amt : 0,
                    Saldo: runningBal
                };
            });
            exportToExcel(data, `Buku_Besar_${selectedAccount?.name}`, "Ledger");
        } else {
            const data = filteredJournals.map(j => ({
                Tanggal: format(new Date(j.date), "dd/MM/yyyy HH:mm"),
                Akun: j.account?.name,
                Tipe: j.type,
                Nominal: Number(j.amount),
                Deskripsi: j.description
            }));
            exportToExcel(data, "Jurnal_Umum", "Jurnal");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hide-print">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-primary">Akuntansi & Keuangan</h2>
                    <p className="text-muted-foreground tracking-tight">Pantau laporan laba rugi, neraca, buku besar, dan jurnal.</p>
                </div>
                <button
                    onClick={handleExport}
                    className="bg-emerald-600 text-white px-6 py-2 rounded-md flex items-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95 font-bold"
                >
                    <Download className="h-5 w-5" />
                    <span>Export {activeTab}</span>
                </button>
            </div>

            {/* TABS */}
            <div className="bg-white rounded-xl shadow-sm border p-2 flex flex-wrap gap-2 hide-print">
                {[
                    { id: "PNL", label: "Laba Rugi (P&L)", icon: BarChart3 },
                    { id: "BALANCE", label: "Neraca (Balance Sheet)", icon: Scale },
                    { id: "LEDGER", label: "Buku Besar (Ledger)", icon: Calculator },
                    { id: "JOURNAL", label: "Jurnal Umum", icon: FileText },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all",
                            activeTab === tab.id
                                ? "bg-primary text-white shadow-md shadow-primary/20"
                                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        )}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* TAB CONTENT: PNL */}
            {activeTab === "PNL" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-2xl p-6 border shadow-sm">
                            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Total Pendapatan</p>
                            <p className="text-3xl font-black text-emerald-600 tracking-tighter">{formatCurrency(totalRevenue)}</p>
                        </div>
                        <div className="bg-white rounded-2xl p-6 border shadow-sm">
                            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Total Beban (HPP & Op)</p>
                            <p className="text-3xl font-black text-rose-600 tracking-tighter">{formatCurrency(totalExpense)}</p>
                        </div>
                        <div className={cn("rounded-2xl p-6 border shadow-sm", netIncome >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200")}>
                            <p className={cn("text-sm font-bold uppercase tracking-wider mb-2", netIncome >= 0 ? "text-emerald-700" : "text-rose-700")}>Laba/Rugi Bersih</p>
                            <p className={cn("text-3xl font-black tracking-tighter", netIncome >= 0 ? "text-emerald-700" : "text-rose-700")}>{formatCurrency(netIncome)}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden text-sm">
                            <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100">
                                <h3 className="font-bold text-emerald-800 uppercase tracking-widest text-xs">Pendapatan (Revenue)</h3>
                            </div>
                            <div className="divide-y text-slate-600">
                                {revenueAccounts.map(a => (
                                    <div key={a.id} className="flex justify-between px-6 py-3 hover:bg-slate-50">
                                        <span>{a.code} - {a.name}</span>
                                        <span className="font-bold">{formatCurrency(a.balance)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden text-sm">
                            <div className="bg-rose-50 px-6 py-4 border-b border-rose-100">
                                <h3 className="font-bold text-rose-800 uppercase tracking-widest text-xs">Beban & Pengeluaran (Expense)</h3>
                            </div>
                            <div className="divide-y text-slate-600">
                                {expenseAccounts.map(a => (
                                    <div key={a.id} className="flex justify-between px-6 py-3 hover:bg-slate-50">
                                        <span>{a.code} - {a.name}</span>
                                        <span className="font-bold">{formatCurrency(a.balance)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: BALANCE SHEET */}
            {activeTab === "BALANCE" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden text-sm flex flex-col">
                            <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
                                <h3 className="font-bold text-blue-800 uppercase tracking-widest text-xs">Aset (Assets)</h3>
                            </div>
                            <div className="divide-y text-slate-600 flex-1">
                                {assetAccounts.map(a => (
                                    <div key={a.id} className="flex justify-between px-6 py-3 hover:bg-slate-50">
                                        <span>{a.code} - {a.name}</span>
                                        <span className="font-bold">{formatCurrency(a.balance)}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-slate-50 px-6 py-4 border-t flex justify-between font-black text-slate-800">
                                <span>TOTAL ASET</span>
                                <span>{formatCurrency(totalAsset)}</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-6">
                            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden text-sm">
                                <div className="bg-amber-50 px-6 py-4 border-b border-amber-100">
                                    <h3 className="font-bold text-amber-800 uppercase tracking-widest text-xs">Kewajiban (Liabilities)</h3>
                                </div>
                                <div className="divide-y text-slate-600">
                                    {liabilityAccounts.map(a => (
                                        <div key={a.id} className="flex justify-between px-6 py-3 hover:bg-slate-50">
                                            <span>{a.code} - {a.name}</span>
                                            <span className="font-bold">{formatCurrency(a.balance)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-slate-50 px-6 py-3 border-t flex justify-between font-bold text-slate-700">
                                    <span>Total Kewajiban</span>
                                    <span>{formatCurrency(totalLiability)}</span>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden text-sm">
                                <div className="bg-purple-50 px-6 py-4 border-b border-purple-100">
                                    <h3 className="font-bold text-purple-800 uppercase tracking-widest text-xs">Ekuitas & Modal (Equity)</h3>
                                </div>
                                <div className="divide-y text-slate-600">
                                    {equityAccounts.map(a => (
                                        <div key={a.id} className="flex justify-between px-6 py-3 hover:bg-slate-50">
                                            <span>{a.code} - {a.name}</span>
                                            <span className="font-bold">{formatCurrency(a.balance)}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between px-6 py-3 hover:bg-slate-50">
                                        <span>Laba Tahun Berjalan (Net Income)</span>
                                        <span className="font-bold">{formatCurrency(netIncome)}</span>
                                    </div>
                                </div>
                                <div className="bg-slate-50 px-6 py-3 border-t flex justify-between font-bold text-slate-700">
                                    <span>Total Ekuitas</span>
                                    <span>{formatCurrency(totalEquity)}</span>
                                </div>
                            </div>

                            <div className="bg-slate-900 text-white rounded-2xl px-6 py-4 flex justify-between font-black shadow-lg">
                                <span>TOTAL KEWAJIBAN & EKUITAS</span>
                                <span>{formatCurrency(totalLiability + totalEquity)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: LEDGER */}
            {activeTab === "LEDGER" && (
                <div className="bg-white rounded-2xl border shadow-sm animate-in fade-in duration-300">
                    <div className="p-6 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 rounded-t-2xl">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Buku Besar</h3>
                            <p className="text-xs text-muted-foreground mt-1">Pilih akun untuk melihat mutasi transaksi.</p>
                        </div>
                        <select
                            value={selectedAccountId}
                            onChange={(e) => setSelectedAccountId(e.target.value)}
                            className="w-full md:w-80 bg-white border border-slate-300 px-4 py-2 rounded-lg outline-none focus:border-primary font-bold text-slate-700"
                        >
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                        </select>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left min-w-[800px] table-fixed">
                            <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                                <tr>
                                    <th className="px-6 py-4 w-40">Tanggal</th>
                                    <th className="px-6 py-4">Deskripsi</th>
                                    <th className="px-6 py-4 text-right text-emerald-600 w-44">Debit</th>
                                    <th className="px-6 py-4 text-right text-rose-600 w-44">Kredit</th>
                                    <th className="px-6 py-4 text-right w-44">Saldo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-slate-700">
                                {(() => {
                                    let runningBalance = 0;
                                    const isDebitIncrease = selectedAccount?.type === "ASSET" || selectedAccount?.type === "EXPENSE";

                                    return ledgerJournals.map((j: any) => {
                                        const amt = Number(j.amount);
                                        if (j.type === "DEBIT") runningBalance += isDebitIncrease ? amt : -amt;
                                        else runningBalance += isDebitIncrease ? -amt : amt;

                                        return (
                                            <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                                                    {format(new Date(j.date), "dd/MM/yyyy HH:mm")}
                                                </td>
                                                <td className="px-6 py-4 font-medium truncate" title={j.description}>{j.description}</td>
                                                <td className="px-6 py-4 text-right font-black text-emerald-600">
                                                    {j.type === "DEBIT" ? formatCurrency(amt) : "-"}
                                                </td>
                                                <td className="px-6 py-4 text-right font-black text-rose-600">
                                                    {j.type === "CREDIT" ? formatCurrency(amt) : "-"}
                                                </td>
                                                <td className="px-6 py-4 text-right font-black text-slate-900 bg-slate-50/50">
                                                    {formatCurrency(runningBalance)}
                                                </td>
                                            </tr>
                                        );
                                    });
                                })()}
                                {ledgerJournals.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-medium">
                                            Tidak ada mutasi transaksi untuk akun ini.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: JOURNAL */}
            {activeTab === "JOURNAL" && (
                <div className="bg-white rounded-2xl border shadow-sm animate-in fade-in duration-300">
                    <div className="p-6 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 rounded-t-2xl">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Jurnal Umum</h3>
                            <p className="text-xs text-muted-foreground mt-1">Daftar seluruh jurnal double-entry.</p>
                        </div>
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                value={journalSearch}
                                onChange={e => setJournalSearch(e.target.value)}
                                placeholder="Cari deskripsi / nama akun..."
                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto h-[600px] overflow-y-auto relative">
                        <table className="w-full text-sm text-left relative table-fixed min-w-[1000px]">
                            <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10 shadow-sm border-b">
                                <tr>
                                    <th className="px-6 py-4 w-44">Tanggal & Waktu</th>
                                    <th className="px-6 py-4 w-72">Akun (COA)</th>
                                    <th className="px-6 py-4">Deskripsi</th>
                                    <th className="px-6 py-4 text-right w-44">Debit</th>
                                    <th className="px-6 py-4 text-right w-44">Kredit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-slate-700">
                                {filteredJournals.map(j => (
                                    <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap align-top pt-4">
                                            {format(new Date(j.date), "dd/MM/yyyy HH:mm:ss")}
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className={cn(
                                                "font-bold text-xs uppercase px-2 py-1 rounded inline-block truncate max-w-full",
                                                j.type === "DEBIT" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700 ml-6"
                                            )} title={`${j.account?.code} - ${j.account?.name}`}>
                                                {j.account?.code} - {j.account?.name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 font-medium text-xs align-top pt-4 truncate" title={j.description}>{j.description}</td>
                                        <td className="px-6 py-3 text-right font-black text-emerald-600 align-top pt-4">
                                            {j.type === "DEBIT" ? formatCurrency(Number(j.amount)) : ""}
                                        </td>
                                        <td className="px-6 py-3 text-right font-black text-rose-600 align-top pt-4">
                                            {j.type === "CREDIT" ? formatCurrency(Number(j.amount)) : ""}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
