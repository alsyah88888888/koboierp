"use client";

import { Printer, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface DocumentLayoutProps {
    title: string;
    docNumber: string;
    date: string;
    children: React.ReactNode;
    headerInfo?: React.ReactNode;
    isA5?: boolean;
}

export function DocumentLayout({ title, docNumber, date, children, headerInfo, isA5 }: DocumentLayoutProps) {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8 flex flex-col items-center print:bg-white print:p-0 print:block">
            {/* Toolbar - No Print */}
            <div className={`w-full ${isA5 ? 'max-w-[210mm]' : 'max-w-[210mm]'} bg-white border-2 border-slate-200 rounded-2xl p-4 mb-6 flex justify-between items-center shadow-sm no-print`}>
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-slate-600 font-bold hover:text-slate-900 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                    Kembali
                </button>
                <div className="flex gap-3">
                    <button
                        onClick={() => window.print()}
                        className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                    >
                        <Printer className="h-5 w-5" />
                        Cetak Dokumen
                    </button>
                </div>
            </div>

            {/* Document Container */}
            <div className={`w-full ${isA5 ? 'max-w-[210mm] min-h-[148.5mm] p-[10mm]' : 'max-w-[210mm] min-h-[297mm] p-[20mm]'} bg-white shadow-2xl printable-area overflow-hidden flex flex-col font-sans text-slate-900`}>
                {/* Header */}
                <div className={`flex justify-between items-start border-b-4 border-slate-900 ${isA5 ? 'pb-4 mb-6' : 'pb-8 mb-10'}`}>
                    <div>
                        <h1 className={`${isA5 ? 'text-2xl' : 'text-3xl'} font-black tracking-tighter text-slate-900`}>PT KOLA BORASI INDONESIA</h1>
                        <p className={`${isA5 ? 'text-[10px]' : 'text-sm'} font-bold text-slate-500 italic`}>Trading and Distribution</p>
                        <p className={`${isA5 ? 'text-[9px]' : 'text-xs'} font-medium text-slate-400 mt-1`}>Jl. Industri Raya No. 12, Jakarta</p>
                        <p className={`${isA5 ? 'text-[9px]' : 'text-xs'} font-medium text-slate-400`}>Telp: 0857-7444-4805</p>
                    </div>
                    <div className="text-right">
                        <div className={`bg-slate-900 text-white ${isA5 ? 'px-4 py-1.5 text-lg' : 'px-6 py-2 text-2xl'} rounded-lg font-black mb-2`}>
                            {title.toUpperCase()}
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-end gap-4 text-[10px]">
                                <span className="font-bold text-slate-400 uppercase tracking-widest">No. Dokumen</span>
                                <span className="font-black text-slate-900">{docNumber}</span>
                            </div>
                            <div className="flex justify-end gap-4 text-[10px]">
                                <span className="font-bold text-slate-400 uppercase tracking-widest">Tanggal</span>
                                <span className="font-black text-slate-900">{date}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sub-Header / Billing Info */}
                <div className={`${isA5 ? 'mb-6' : 'mb-10'}`}>
                    {headerInfo}
                </div>

                {/* Main Content */}
                <div className="flex-1">
                    {children}
                </div>

                {/* Footer Signature */}
                <div className={`${isA5 ? 'mt-8' : 'mt-20'}`}>
                    <div className={`grid grid-cols-3 gap-12 text-center ${isA5 ? 'text-[10px]' : 'text-xs'} font-black uppercase tracking-widest text-slate-900`}>
                        <div className={`${isA5 ? 'space-y-12' : 'space-y-20'}`}>
                            <p>Tanda Terima,</p>
                            <div className="border-b-2 border-slate-900 w-full mx-auto"></div>
                            <p>( ________________ )</p>
                        </div>
                        <div className={`${isA5 ? 'space-y-12' : 'space-y-20'}`}>
                            <p>Hormat Kami,</p>
                            <div className="border-b-2 border-slate-900 w-full mx-auto"></div>
                            <p>( ________________ )</p>
                        </div>
                        <div className={`${isA5 ? 'space-y-12' : 'space-y-20'}`}>
                            <p>Pengirim,</p>
                            <div className="border-b-2 border-slate-900 w-full mx-auto"></div>
                            <p>( ________________ )</p>
                        </div>
                    </div>

                    <div className={`mt-8 pt-4 border-t border-slate-100 ${isA5 ? 'text-[8px]' : 'text-[10px]'} font-bold text-slate-400 flex justify-between uppercase tracking-widest`}>
                        <span>Pembayaran: BCA 682-5671718 a.n PT KOLA BORASI INDONESIA</span>
                        <span>Doc Ref: {docNumber}</span>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; padding: 0 !important; }
                    .printable-area { 
                        box-shadow: none !important; 
                        margin: 0 !important; 
                        width: 100% !important;
                        max-width: ${isA5 ? '210mm' : '100%'} !important;
                        min-height: ${isA5 ? '148.5mm' : 'auto'} !important;
                        height: ${isA5 ? '148.5mm' : 'auto'} !important;
                        padding: ${isA5 ? '10mm' : '20mm'} !important;
                    }
                    @page {
                        size: ${isA5 ? 'A5 landscape' : 'A4 portrait'};
                        margin: 0;
                    }
                }
            `}</style>
        </div>
    );
}
