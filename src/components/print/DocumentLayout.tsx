"use client";

import { Printer, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { ClientBarcode as Barcode } from "@/components/print/ClientBarcode";

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
            <style type="text/css">
                {`
                @media print {
                    @page {
                        size: 23cm 27cm;
                        margin: 0;
                    }
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
                `}
            </style>
            {/* Toolbar - No Print */}
            <div className={`w-full max-w-[230mm] bg-white border-2 border-slate-200 rounded-2xl p-4 mb-6 flex justify-between items-center shadow-sm no-print`}>
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
            <div className={`w-full max-w-[230mm] min-h-[270mm] p-[10mm] bg-white shadow-2xl printable-area flex flex-col font-sans text-slate-900 border-t-[8px] border-slate-900`}>
                {/* Header Branding */}
                <div className={`flex justify-between items-start ${isA5 ? 'pb-2 mb-2' : 'pb-4 mb-6'}`}>
                    <div className="flex items-start gap-5">
                        <div className="shrink-0">
                            <img src="/logo.png" alt="Logo Kola Borasi" className={`${isA5 ? 'h-16' : 'h-24'} w-auto object-contain`} />
                        </div>
                        <div>
                            <h1 className={`${isA5 ? 'text-2xl' : 'text-3xl'} font-black tracking-tight text-slate-900 uppercase`}>PT KOLA BORASI INDONESIA</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="bg-slate-100 px-2 py-0.5 rounded text-[8px] font-black text-slate-500 uppercase tracking-widest border border-slate-200">Official Document</span>
                                <p className={`${isA5 ? 'text-[9px]' : 'text-xs'} font-bold text-slate-400 italic`}>Trading & Distribution ERP</p>
                            </div>
                            <div className="mt-3 space-y-0.5">
                                <p className={`${isA5 ? 'text-[8px]' : 'text-[10px]'} font-bold text-slate-500 leading-tight max-w-sm`}>
                                    Jl. Arjuna IV Green Kartika Residence Blok EE NO.2, CIBINONG, KAB. BOGOR - JAWA BARAT, 16911
                                </p>
                                <div className="flex gap-4 items-center">
                                    <p className={`${isA5 ? 'text-[8px]' : 'text-[10px]'} font-bold text-slate-400`}>
                                        <span className="text-slate-300 mr-1 uppercase text-[7px] tracking-tighter">Phone</span> 0857-7444-4805
                                    </p>
                                    <p className={`${isA5 ? 'text-[8px]' : 'text-[10px]'} font-bold text-slate-400`}>
                                        <span className="text-slate-300 mr-1 uppercase text-[7px] tracking-tighter">Web</span> www.kolaborasi.id
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="text-right flex flex-col items-end">
                        <div className={`bg-slate-900 text-white font-black tracking-[0.15em] shadow-lg shadow-slate-200 uppercase ${isA5 ? 'px-4 py-1.5 text-xl rounded' : 'px-6 py-2.5 text-3xl rounded-lg'}`}>
                            {title}
                        </div>

                        <div className="flex flex-col gap-1 items-end mt-4">
                            <div className={`${isA5 ? 'text-xs' : 'text-lg'} flex gap-3 items-center justify-end w-full`}>
                                <span className="font-bold text-slate-400 uppercase tracking-[0.15em]">No. Ref</span>
                                <span className="font-black text-slate-900 bg-slate-50 px-2.5 py-0.5 rounded-lg border-2 border-slate-200 font-mono tracking-tighter">#{docNumber}</span>
                            </div>
                            <div className={`${isA5 ? 'text-[8px]' : 'text-xs'} flex gap-3 items-center justify-end w-full mt-0.5`}>
                                <span className="font-bold text-slate-300 uppercase tracking-[0.15em]">Date</span>
                                <span className="font-black text-slate-900">{date}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end mb-2 opacity-80">
                    <Barcode value={docNumber} format="CODE128" width={1.0} height={30} displayValue={false} margin={0} background="transparent" />
                </div>

                <div className="relative mb-6">
                    <div className="border-b-[4px] border-slate-900"></div>
                    <div className="absolute -bottom-1 left-0 right-0 border-b border-slate-300"></div>
                </div>

                {/* Sub-Header / Billing Info */}
                <div className={`${isA5 ? 'mb-4' : 'mb-8'}`}>
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
                        max-width: 230mm !important;
                        min-height: 270mm !important;
                        height: 270mm !important;
                        padding: 10mm !important;
                    }
                    @page {
                        size: 230mm 270mm;
                        margin: 0;
                    }
                }
            `}</style>
        </div>
    );
}
