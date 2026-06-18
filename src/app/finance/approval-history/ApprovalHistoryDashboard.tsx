"use client";

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { getApprovalHistoryAction } from '@/actions/finance';
import { formatCurrency } from '@/lib/utils';
import { Calendar as CalendarIcon, ArrowUpRight, ArrowDownRight, RefreshCw, FileSpreadsheet, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ApprovalHistoryDashboard() {
    const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
    const [targetDate, setTargetDate] = useState<string>(new Date().toISOString());
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            setErrorMsg(null);
            const result = await getApprovalHistoryAction(period, targetDate);
            if (result && result.error) {
                setErrorMsg(result.error);
            } else {
                setData(result);
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Terjadi kesalahan');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [period, targetDate]);

    const handleDateChange = (days: number) => {
        const d = new Date(targetDate);
        if (period === 'monthly') {
            d.setMonth(d.getMonth() + (days > 0 ? 1 : -1));
        } else if (period === 'weekly') {
            d.setDate(d.getDate() + (days > 0 ? 7 : -7));
        } else {
            d.setDate(d.getDate() + days);
        }
        setTargetDate(d.toISOString());
    };

    const getPeriodDisplay = () => {
        const d = new Date(targetDate);
        if (period === 'daily') return format(d, 'dd MMMM yyyy', { locale: localeId });
        if (period === 'monthly') return format(d, 'MMMM yyyy', { locale: localeId });
        
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const start = new Date(d.setDate(diff));
        const end = new Date(d.setDate(diff + 6));
        return `${format(start, 'dd MMM', { locale: localeId })} - ${format(end, 'dd MMM yyyy', { locale: localeId })}`;
    };

    const handleExportExcel = () => {
        if (!data?.transactions) return;
        
        const exportData = data.transactions.map((t: any) => ({
            'Tanggal Approve': format(new Date(t.date), 'dd/MM/yyyy HH:mm'),
            'Tipe': t.type === 'AP' ? 'Hutang (Pembelian)' : 'Piutang (Penjualan)',
            'Nomor Dokumen': t.documentNumber,
            'Nama Rekanan': t.entityName,
            'Deskripsi': t.description,
            'Total Tagihan': t.documentTotal,
            'Nominal Dibayar (Lunas/Parsial)': t.paidAmount,
            'Rekening/Kas': t.bank,
            'Admin/Sales': t.salesPerson
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Approval History");
        XLSX.writeFile(wb, `Riwayat_Approval_${period}_${format(new Date(targetDate), 'yyyyMMdd')}.xlsx`);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Riwayat Approval Hutang & Piutang</h1>
                    <p className="text-sm text-slate-500">Pantau transaksi pembayaran yang sudah disetujui tim Keuangan</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex bg-white rounded-lg shadow-sm border border-slate-200 p-1">
                        <button
                            onClick={() => setPeriod('daily')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${period === 'daily' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                            Harian
                        </button>
                        <button
                            onClick={() => setPeriod('weekly')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${period === 'weekly' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                            Mingguan
                        </button>
                        <button
                            onClick={() => setPeriod('monthly')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${period === 'monthly' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                            Bulanan
                        </button>
                    </div>

                    <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border border-slate-200 p-1">
                        <button className="p-2 hover:bg-slate-100 rounded-md transition-colors text-slate-600" onClick={() => handleDateChange(-1)}>
                            &lt;
                        </button>
                        <div className="flex items-center gap-2 px-2 min-w-[140px] justify-center text-slate-700">
                            <CalendarIcon className="w-4 h-4 text-slate-500" />
                            <span className="text-sm font-medium">{getPeriodDisplay()}</span>
                        </div>
                        <button className="p-2 hover:bg-slate-100 rounded-md transition-colors text-slate-600" onClick={() => handleDateChange(1)}>
                            &gt;
                        </button>
                    </div>

                    <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors shadow-sm">
                        <FileSpreadsheet className="w-4 h-4" />
                        Ekspor Excel
                    </button>
                </div>
            </div>

            {errorMsg && (
                <div className="bg-rose-50 text-rose-700 border border-rose-200 p-4 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-sm">Gagal memuat data</h4>
                        <p className="text-sm opacity-90">{errorMsg}</p>
                    </div>
                </div>
            )}

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/50 backdrop-blur-sm border border-blue-100 shadow-sm rounded-2xl p-6 relative overflow-hidden">
                    <div className="flex flex-row items-center justify-between pb-2 relative z-10">
                        <h3 className="text-sm font-medium text-slate-600">Total Piutang Diterima (AR)</h3>
                        <div className="p-2 bg-blue-100 rounded-full">
                            <ArrowDownRight className="w-4 h-4 text-blue-600" />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <div className="text-2xl font-bold text-blue-700 tabular-nums">
                            {formatCurrency(data?.summary?.totalApprovedAR || 0)}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Uang masuk dari pelanggan</p>
                    </div>
                </div>

                <div className="bg-white/50 backdrop-blur-sm border border-red-100 shadow-sm rounded-2xl p-6 relative overflow-hidden">
                    <div className="flex flex-row items-center justify-between pb-2 relative z-10">
                        <h3 className="text-sm font-medium text-slate-600">Total Hutang Dibayar (AP)</h3>
                        <div className="p-2 bg-red-100 rounded-full">
                            <ArrowUpRight className="w-4 h-4 text-red-600" />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <div className="text-2xl font-bold text-red-700 tabular-nums">
                            {formatCurrency(data?.summary?.totalApprovedAP || 0)}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Uang keluar ke supplier</p>
                    </div>
                </div>

                <div className={`bg-white/50 backdrop-blur-sm border shadow-sm rounded-2xl p-6 relative overflow-hidden ${data?.summary?.netCashflow >= 0 ? 'border-green-100' : 'border-orange-100'}`}>
                    <div className="flex flex-row items-center justify-between pb-2 relative z-10">
                        <h3 className="text-sm font-medium text-slate-600">Net Arus Kas (Disetujui)</h3>
                        <div className={`p-2 rounded-full ${data?.summary?.netCashflow >= 0 ? 'bg-green-100' : 'bg-orange-100'}`}>
                            <RefreshCw className={`w-4 h-4 ${data?.summary?.netCashflow >= 0 ? 'text-green-600' : 'text-orange-600'}`} />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <div className={`text-2xl font-bold tabular-nums ${data?.summary?.netCashflow >= 0 ? 'text-green-700' : 'text-orange-700'}`}>
                            {formatCurrency(data?.summary?.netCashflow || 0)}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Selisih Piutang - Hutang</p>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold whitespace-nowrap">Tgl Approval</th>
                                <th className="px-6 py-4 font-semibold whitespace-nowrap">Tipe</th>
                                <th className="px-6 py-4 font-semibold whitespace-nowrap">Nomor Dokumen</th>
                                <th className="px-6 py-4 font-semibold whitespace-nowrap">Nama Rekanan</th>
                                <th className="px-6 py-4 font-semibold text-right whitespace-nowrap">Total Tagihan</th>
                                <th className="px-6 py-4 font-semibold text-right whitespace-nowrap">Nominal Dibayar</th>
                                <th className="px-6 py-4 font-semibold whitespace-nowrap">Rekening/Kas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                                        Memuat data riwayat...
                                    </td>
                                </tr>
                            ) : !data?.transactions || data.transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                                        Tidak ada transaksi persetujuan pada periode ini.
                                    </td>
                                </tr>
                            ) : (
                                data.transactions.map((t: any) => (
                                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                            {format(new Date(t.date), 'dd/MM/yyyy HH:mm')}
                                        </td>
                                        <td className="px-6 py-4">
                                            {t.type === 'AP' ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
                                                    Hutang
                                                </span>
                                            ) : t.type === 'AR' ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                                    Piutang
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                                    Lainnya
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-900">{t.documentNumber}</td>
                                        <td className="px-6 py-4 text-slate-700">{t.entityName}</td>
                                        <td className="px-6 py-4 text-right tabular-nums text-slate-600">{formatCurrency(t.documentTotal)}</td>
                                        <td className="px-6 py-4 text-right font-bold tabular-nums text-slate-900">{formatCurrency(t.paidAmount)}</td>
                                        <td className="px-6 py-4 text-slate-600">{t.bank}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
