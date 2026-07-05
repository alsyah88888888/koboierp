import React from 'react';
import { ShoppingBag, ArrowRightLeft, Download, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

function KPICard({ label, value, sub, color, icon, trend }: { label: string, value: string, sub: string, color: string, icon: any, trend?: 'up' | 'down' }) {
    return (
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-50 shadow-sm relative overflow-hidden group hover:border-slate-200 transition-colors">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110`} />
            <div className="relative">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-2.5 bg-${color}-100 text-${color}-600 rounded-xl`}>
                        {icon}
                    </div>
                    {trend && (
                        <span className={cn("text-[10px] font-black px-2 py-1 rounded-md", trend === 'up' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                            {trend === 'up' ? '+' : '-'}
                        </span>
                    )}
                </div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</h4>
                <p className={`text-2xl font-black tabular-nums tracking-tighter text-${color}-600`}>{value}</p>
                <p className="text-[10px] text-slate-500 font-bold mt-2 truncate">{sub}</p>
            </div>
        </div>
    );
}

function ReportTable({ title, count, totalLabel, totalValue, headers, rows, onExport, icon }: any) {
    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">{icon}</div>
                    <div>
                        <h4 className="font-black text-slate-900 uppercase tracking-tight text-sm">{title}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{count} Transaksi</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {totalLabel && (
                        <div className="text-right">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{totalLabel}</p>
                            <p className="font-black text-slate-800 tracking-tighter">{totalValue}</p>
                        </div>
                    )}
                    {onExport && (
                        <button onClick={onExport} className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors" title="Export Table Excel">
                            <Download className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                        <tr className="bg-slate-50/50 text-slate-500 text-[10px] uppercase tracking-widest">
                            {headers.map((h: string, i: number) => (
                                <th key={i} className="px-4 py-3 font-black border-b border-slate-100">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {rows.map((row: any[], i: number) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                {row.map((cell: any, j: number) => (
                                    <td key={j} className="px-4 py-3 text-slate-600 font-medium text-xs">{cell}</td>
                                ))}
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={headers.length} className="px-4 py-8 text-center text-slate-400 font-medium text-xs">
                                    Tidak ada data untuk periode ini.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export function CrossDivisionTab({ data, isClient, fmtDate }: { data: any, isClient: boolean, fmtDate: (d: any) => string }) {
    if (!data) return null;
    if (data.error) {
        return (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-2xl flex items-center gap-3">
                <AlertCircle className="h-6 w-6" />
                <div>
                    <h3 className="font-black text-sm uppercase tracking-wider">Error Fetching Cross Division Data</h3>
                    <p className="text-xs mt-1">{data.error}</p>
                </div>
            </div>
        );
    }

    const { pfToBc = [], bcToPf = [], pfToBcAmount = 0, bcToPfAmount = 0 } = data;

    const handleExport = (title: string, list: any[]) => {
        if (!list || list.length === 0) return;
        
        const wb = XLSX.utils.book_new();
        const exportRows = list.map((r, i) => ({
            'No': i + 1,
            'Barang': r.product,
            'SKU': r.sku,
            'Qty Terjual': r.qty,
            'No. LPB (Pembelian)': r.lpb,
            'Tgl LPB': fmtDate(r.lpbDate),
            'No. SJ (Penjualan)': r.sj,
            'Tgl SJ': fmtDate(r.sjDate),
            'Harga Beli Satuan': r.price,
            'Total Nilai HPP (Modal)': r.cost
        }));
        
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows), title.substring(0, 31));
        XLSX.writeFile(wb, `Cross_Division_${title}_${new Date().getTime()}.xlsx`);
    };

    return (
        <div className="space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-indigo-50 rounded-[1.5rem] text-indigo-500">
                        <ArrowRightLeft className="h-8 w-8" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Transaksi Silang Divisi</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Laporan Khusus Admin (Cross-Selling)</p>
                    </div>
                </div>
                <div className="text-right hidden md:block">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total HPP Tersilang</p>
                    <p className="text-3xl font-black text-slate-900 tracking-tighter tabular-nums">
                        {isClient ? formatCurrency(pfToBcAmount + bcToPfAmount) : '...'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* PF To BC */}
                <div className="space-y-6">
                    <KPICard 
                        label="PF Dipakai Oleh BC" 
                        value={isClient ? formatCurrency(pfToBcAmount) : '...'} 
                        sub={`${pfToBc.length} Transaksi Silang Ditemukan`} 
                        color="blue" 
                        icon={<ShoppingBag className="h-5 w-5" />} 
                    />
                    
                    <ReportTable
                        title="Daftar Modal PF Dipakai BC" 
                        icon={<FileSpreadsheet className="h-4 w-4 text-blue-500" />}
                        count={pfToBc.length}
                        headers={['Barang', 'Qty', 'No. LPB (Modal)', 'No. SJ (Jual)', 'Total HPP']}
                        onExport={() => handleExport("PF_Dipakai_BC", pfToBc)}
                        rows={pfToBc.map((r: any) => [
                            <span className="truncate max-w-[150px] block font-bold" title={r.product}>{r.product}</span>,
                            <span className="font-mono">{r.qty}</span>,
                            <span className="text-[10px] font-black text-slate-500">{r.lpb}</span>,
                            <span className="text-[10px] font-black text-blue-600">{r.sj}</span>,
                            <span className="font-black tabular-nums">{formatCurrency(r.cost)}</span>
                        ])}
                    />
                </div>

                {/* BC To PF */}
                <div className="space-y-6">
                    <KPICard 
                        label="BC Dipakai Oleh PF" 
                        value={isClient ? formatCurrency(bcToPfAmount) : '...'} 
                        sub={`${bcToPf.length} Transaksi Silang Ditemukan`} 
                        color="emerald" 
                        icon={<ShoppingBag className="h-5 w-5" />} 
                    />
                    
                    <ReportTable
                        title="Daftar Modal BC Dipakai PF" 
                        icon={<FileSpreadsheet className="h-4 w-4 text-emerald-500" />}
                        count={bcToPf.length}
                        headers={['Barang', 'Qty', 'No. LPB (Modal)', 'No. SJ (Jual)', 'Total HPP']}
                        onExport={() => handleExport("BC_Dipakai_PF", bcToPf)}
                        rows={bcToPf.map((r: any) => [
                            <span className="truncate max-w-[150px] block font-bold" title={r.product}>{r.product}</span>,
                            <span className="font-mono">{r.qty}</span>,
                            <span className="text-[10px] font-black text-slate-500">{r.lpb}</span>,
                            <span className="text-[10px] font-black text-emerald-600">{r.sj}</span>,
                            <span className="font-black tabular-nums">{formatCurrency(r.cost)}</span>
                        ])}
                    />
                </div>
            </div>
        </div>
    );
}
