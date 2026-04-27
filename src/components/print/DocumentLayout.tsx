"use client";

import { useEffect } from "react";
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
    isContinuous?: boolean; // New prop for LX-310 Support
}

export function DocumentLayout({ title, docNumber, date, children, headerInfo, isA5, isContinuous }: DocumentLayoutProps) {
    const router = useRouter();

    useEffect(() => {
        if (docNumber) {
            document.title = docNumber;
        }
    }, [docNumber]);

    // Dimensions for Documents
    const pageWidth = isContinuous ? "241mm" : (isA5 ? "210mm" : "210mm");
    const pageHeight = isContinuous ? "139mm" : (isA5 ? "148mm" : "297mm");

    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8 flex flex-col items-center print:bg-white print:p-0 print:block">
            <style type="text/css">
                {`
                @media print {
                    @page {
                        size: ${pageWidth} ${pageHeight};
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
            <div className={`w-full max-w-[${pageWidth}] bg-white border-2 border-slate-200 rounded-2xl p-4 mb-6 flex justify-between items-center shadow-sm no-print`}>
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-slate-600 font-bold hover:text-slate-900 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                    Kembali
                </button>
                <div className="flex gap-3 text-xs font-bold text-slate-400">
                    {isContinuous ? "Mode: LX-310 Continuous Form" : (isA5 ? "Mode: A5 Landscape" : "Mode: Full Page")}
                    <button
                        onClick={() => window.print()}
                        className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 ml-4"
                    >
                        <Printer className="h-5 w-5" />
                        Cetak Dokumen
                    </button>
                </div>
            </div>

            {/* Document Container */}
            <div className={`w-full max-w-[${pageWidth}] ${isContinuous ? 'min-h-[139mm]' : (isA5 ? 'min-h-[148mm]' : 'min-h-[270mm]')} p-[8mm] bg-white shadow-2xl printable-area flex flex-col font-sans text-slate-900 border-t-[16px] border-slate-900`}>
                {/* Header Branding */}
                <div className={`flex justify-between items-start ${(isA5 || isContinuous) ? 'pb-1 mb-1' : 'pb-4 mb-6'}`}>
                    <div className="flex items-center gap-4">
                        <div className="shrink-0">
                            <img src="/logo.png" alt="Logo Kola Borasi" className={`${(isA5 || isContinuous) ? 'h-12' : 'h-24'} w-auto object-contain`} />
                        </div>
                        <div>
                            <h1 className={`${(isA5 || isContinuous) ? 'text-lg' : 'text-3xl'} font-black tracking-tight text-slate-900 uppercase`}>PT KOLA BORASI INDONESIA</h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[7px] font-black text-slate-500 uppercase tracking-widest border border-slate-200">OFFICIAL DOCUMENT</span>
                                <p className={`${(isA5 || isContinuous) ? 'text-[8px]' : 'text-xs'} font-bold text-slate-400 italic`}>Trading & Distribution ERP</p>
                            </div>
                            <div className={`${(isA5 || isContinuous) ? 'mt-1' : 'mt-3'} space-y-0.5`}>
                                <p className={`${(isA5 || isContinuous) ? 'text-[7px]' : 'text-[10px]'} font-bold text-slate-500 leading-tight max-w-sm`}>
                                    Jl. Arjuna IV Green Kartika Residence Blok EE NO.2, CIBINONG, KAB. BOGOR - JAWA BARAT, 16911
                                </p>
                                <p className="text-[7pt] font-bold text-slate-400 uppercase tracking-widest">
                                    PHONE: <span className="text-slate-500">0857-7444-4805</span> | WEB: <span className="text-slate-500">www.kolaborasi.id</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="text-right flex flex-col items-end">
                        <div className={`bg-slate-900 text-white font-black tracking-[0.1em] uppercase ${(isA5 || isContinuous) ? 'px-3 py-1 text-base rounded' : 'px-6 py-2.5 text-3xl rounded-lg'}`}>
                            {title}
                        </div>

                        <div className="flex flex-col gap-0.5 items-end mt-2">
                            <div className={`${(isA5 || isContinuous) ? 'text-[10px]' : 'text-lg'} flex gap-2 items-center justify-end w-full`}>
                                <span className="font-bold text-slate-400 uppercase tracking-[0.1em]">No. Ref</span>
                                <span className="font-black text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 font-mono tracking-tighter">#{docNumber}</span>
                            </div>
                            <div className={`${(isA5 || isContinuous) ? 'text-[8px]' : 'text-xs'} flex gap-2 items-center justify-end w-full`}>
                                <span className="font-bold text-slate-300 uppercase tracking-[0.1em]">Date</span>
                                <span className="font-black text-slate-900">{date}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`flex justify-end ${(isA5 || isContinuous) ? 'mb-1' : 'mb-2'} opacity-80`}>
                    <Barcode value={docNumber} format="CODE128" width={0.8} height={20} displayValue={false} margin={0} background="transparent" />
                </div>

                <div className={`relative ${(isA5 || isContinuous) ? 'mb-2' : 'mb-6'}`}>
                    <div className="border-b-[2px] border-slate-900"></div>
                </div>

                {/* Sub-Header / Billing Info */}
                <div className={`${(isA5 || isContinuous) ? 'mb-2' : 'mb-8'}`}>
                    {headerInfo}
                </div>

                {/* Main Content */}
                <div className="flex-1">
                    {children}
                </div>

                {/* Footer Signature */}
                <div className={`${(isA5 || isContinuous) ? 'mt-4' : 'mt-20'}`}>
                    <div className={`grid grid-cols-3 gap-8 text-center ${(isA5 || isContinuous) ? 'text-[9px]' : 'text-xs'} font-black uppercase tracking-widest text-slate-900`}>
                        <div className={`${(isA5 || isContinuous) ? 'space-y-8' : 'space-y-20'}`}>
                            <p>TANDA TERIMA,</p>
                            <div className="border-b-2 border-slate-900 w-full mx-auto"></div>
                            <p>( ________________ )</p>
                        </div>
                        <div className={`${(isA5 || isContinuous) ? 'space-y-8' : 'space-y-20'}`}>
                            <p>HORMAT KAMI,</p>
                            <div className="border-b-2 border-slate-900 w-full mx-auto"></div>
                            <p>( ________________ )</p>
                        </div>
                        <div className={`${(isA5 || isContinuous) ? 'space-y-8' : 'space-y-20'}`}>
                            <p>PENGIRIM,</p>
                            <div className="border-b-2 border-slate-900 w-full mx-auto"></div>
                            <p>( ________________ )</p>
                        </div>
                    </div>

                    <div className={`mt-4 pt-2 border-t border-slate-100 ${(isA5 || isContinuous) ? 'text-[7px]' : 'text-[10px]'} font-bold text-slate-400 flex justify-between uppercase tracking-widest`}>
                        <span>BCA 682-5671718 a.n PT KOLA BORASI INDONESIA</span>
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
                        width: ${pageWidth} !important;
                        max-width: ${pageWidth} !important;
                        min-height: ${pageHeight} !important;
                        height: ${pageHeight} !important;
                        padding: 6mm !important;
                    }
                    @page {
                        size: ${pageWidth} ${pageHeight};
                        margin: 0;
                    }
                }
            `}</style>
        </div>
    );
}
