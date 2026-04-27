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
                        orientation: ${isContinuous || isA5 ? 'landscape' : 'portrait'};
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
            <div 
                className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 mb-6 flex justify-between items-center shadow-sm no-print"
                style={{ maxWidth: pageWidth }}
            >
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
            <div 
                className="w-full bg-white shadow-2xl printable-area flex flex-col font-sans text-slate-900 border-t-[16px] border-slate-900 relative overflow-hidden"
                style={{ 
                    maxWidth: pageWidth, 
                    minHeight: isContinuous ? '139mm' : (isA5 ? '148mm' : '297mm')
                }}
            >
                {/* Decorative Accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 -mr-16 -mt-16 rotate-45 pointer-events-none no-print"></div>

                {/* Header Branding */}
                <div className={`flex justify-between items-start ${(isA5 || isContinuous) ? 'p-4 mb-2' : 'p-8 mb-4'} border-b border-slate-100`}>
                    <div className="flex items-center gap-5">
                        <div className="shrink-0 bg-white p-1 rounded-lg border border-slate-50 shadow-sm">
                            <img src="/logo.png" alt="Logo Kola Borasi" className={`${(isA5 || isContinuous) ? 'h-12' : 'h-24'} w-auto object-contain`} />
                        </div>
                        <div className="space-y-1">
                            <h1 className={`${(isA5 || isContinuous) ? 'text-xl' : 'text-4xl'} font-black tracking-tighter text-slate-900 uppercase leading-none`}>
                                PT KOLA BORASI <span className="text-indigo-600">INDONESIA</span>
                            </h1>
                            <div className="flex items-center gap-2">
                                <span className="bg-slate-900 text-white px-2 py-0.5 rounded-sm text-[8px] font-black uppercase tracking-widest">OFFICIAL DOCUMENT</span>
                                <div className="h-1 w-1 rounded-full bg-slate-300"></div>
                                <p className={`${(isA5 || isContinuous) ? 'text-[8px]' : 'text-[11px]'} font-bold text-slate-400 italic tracking-tight`}>
                                    Trading & Distribution ERP System
                                </p>
                            </div>
                            <div className={`${(isA5 || isContinuous) ? 'mt-1' : 'mt-4'} space-y-1`}>
                                <p className={`${(isA5 || isContinuous) ? 'text-[7px]' : 'text-[10px]'} font-bold text-slate-500 leading-tight max-w-md`}>
                                    Jl. Arjuna IV Green Kartika Residence Blok EE NO.2, CIBINONG, KAB. BOGOR - JAWA BARAT, 16911
                                </p>
                                <div className="flex items-center gap-3 text-[8pt] font-black text-slate-400 uppercase tracking-widest">
                                    <div className="flex items-center gap-1">
                                        <span className="text-indigo-500">P.</span> <span className="text-slate-600">0857-7444-4805</span>
                                    </div>
                                    <div className="h-3 w-[1px] bg-slate-200"></div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-indigo-500">W.</span> <span className="text-slate-600">www.kolaborasi.id</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="text-right flex flex-col items-end">
                        <div className={`relative group`}>
                            <div className={`bg-slate-900 text-white font-black tracking-[0.15em] uppercase ${(isA5 || isContinuous) ? 'px-4 py-1.5 text-lg rounded-sm' : 'px-8 py-3 text-3xl rounded-md'} shadow-lg shadow-slate-200 relative z-10`}>
                                {title}
                            </div>
                            <div className="absolute inset-0 bg-indigo-600 translate-x-1 translate-y-1 rounded-md opacity-20 no-print"></div>
                        </div>

                        <div className="flex flex-col gap-1 items-end mt-4">
                            <div className={`${(isA5 || isContinuous) ? 'text-[11px]' : 'text-xl'} flex gap-3 items-center justify-end w-full`}>
                                <span className="font-bold text-slate-300 uppercase tracking-[0.2em] text-[10px]">Reference No.</span>
                                <span className="font-black text-slate-900 bg-slate-50 px-3 py-1 rounded border border-slate-200 font-mono tracking-tighter shadow-sm">#{docNumber}</span>
                            </div>
                            <div className={`${(isA5 || isContinuous) ? 'text-[9px]' : 'text-[13px]'} flex gap-3 items-center justify-end w-full`}>
                                <span className="font-bold text-slate-200 uppercase tracking-[0.2em] text-[9px]">Document Date</span>
                                <span className="font-black text-slate-700">{date}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`flex justify-end ${(isA5 || isContinuous) ? 'px-4 mb-2' : 'px-8 mb-4'} opacity-60 hover:opacity-100 transition-opacity`}>
                    <Barcode value={docNumber} format="CODE128" width={0.9} height={25} displayValue={false} margin={0} background="transparent" />
                </div>

                {/* Sub-Header / Billing Info */}
                <div className={`${(isA5 || isContinuous) ? 'px-4 mb-4' : 'px-8 mb-10'}`}>
                    {headerInfo}
                </div>

                {/* Main Content */}
                <div className={`flex-1 ${(isA5 || isContinuous) ? 'px-4' : 'px-8'}`}>
                    {children}
                </div>

                {/* Footer Signature */}
                <div className={`${(isA5 || isContinuous) ? 'p-4 mt-4' : 'p-8 mt-20'}`}>
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
                        padding: 0mm !important;
                    }
                    @page {
                        size: ${pageWidth} ${pageHeight};
                        orientation: ${isContinuous || isA5 ? 'landscape' : 'portrait'};
                        margin: 0;
                    }
                }
            `}</style>
        </div>
    );
}
