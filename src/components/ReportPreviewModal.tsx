"use client";

import { X, Table as TableIcon } from "lucide-react";

interface ReportPreviewModalProps {
    title: string;
    data: any[];
    onClose: () => void;
    onExport: () => void;
}

export function ReportPreviewModal({ title, data, onClose, onExport }: ReportPreviewModalProps) {
    if (!data || data.length === 0) return null;

    const headers = Object.keys(data[0]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 md:p-6 border-b flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-3 pr-2">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                            <TableIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm md:text-xl font-black text-slate-800 truncate">Preview: {title}</h3>
                            <p className="text-[10px] md:text-xs text-slate-500 font-medium italic truncate">Pratinjau data sebelum di-export.</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600 shrink-0 border border-slate-100 bg-white"
                    >
                        <X className="h-5 w-5 md:h-6 md:w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4 md:p-6 custom-scrollbar">
                    <div className="border border-slate-100 rounded-xl overflow-x-auto shadow-sm custom-scrollbar scrollbar-hide">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-50 text-slate-500 border-b uppercase text-[10px] font-black tracking-widest sticky top-0 z-10">
                                <tr>
                                    {headers.map((header) => (
                                        <th key={header} className="px-4 py-3 border-r last:border-0 whitespace-nowrap bg-slate-50">
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((row, i) => (
                                    <tr key={i} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                                        {headers.map((header) => (
                                            <td key={header} className="px-4 py-3 border-r last:border-0 text-slate-700 font-medium whitespace-nowrap">
                                                {typeof row[header] === 'number' ? row[header].toLocaleString('id-ID') : String(row[header])}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 md:p-6 border-t bg-slate-50 flex flex-col sm:flex-row justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-6 py-2.5 border-2 border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all active:scale-95 text-sm"
                    >
                        Batal
                    </button>
                    <button
                        onClick={() => {
                            onExport();
                            onClose();
                        }}
                        className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 border-2 border-emerald-600 text-white rounded-xl font-black uppercase tracking-wider text-[10px] md:text-xs shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95"
                    >
                        Download Excel Sekarang
                    </button>
                </div>
            </div>
        </div>
    );
}
