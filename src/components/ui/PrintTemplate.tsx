"use client";

import { useRef } from "react";
import { Printer } from "lucide-react";

interface PrintTemplateProps {
    title: string;
    children: React.ReactNode;
}

export function PrintTemplate({ title, children }: PrintTemplateProps) {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="max-w-4xl mx-auto bg-white p-8">
            <div className="flex justify-between items-center mb-8 no-print">
                <h1 className="text-2xl font-black">{title}</h1>
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-slate-800 transition-all"
                >
                    <Printer className="h-5 w-5" />
                    Print Document
                </button>
            </div>

            <div className="border shadow-sm p-12 printable-content">
                {/* Header Section */}
                <div className="flex justify-between items-start mb-12 border-b-2 border-slate-900 pb-8">
                    <div className="flex items-start gap-4">
                        <img src="/logo.png" alt="Logo Kola Borasi" className="h-24 w-auto object-contain shrink-0" />
                        <div>
                            <h2 className="text-3xl font-black text-slate-900">PT. KOLA BORASI INDONESIA</h2>
                            <p className="text-sm text-slate-500 font-medium pb-1 mt-1">Jl. Arjuna IV Green Kartika Residence Blok EE NO.2, CIBINONG, KAB. BOGOR - JAWA BARAT, 16911</p>
                            <p className="text-sm text-slate-500 font-medium">NPWP: 01.234.567.8-012.000</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="bg-slate-900 text-white px-4 py-2 text-xl font-black rounded-lg">
                            {title.toUpperCase()}
                        </div>
                    </div>
                </div>

                {children}

                {/* Footer Section */}
                <div className="mt-24 grid grid-cols-3 gap-8 text-center text-sm font-bold">
                    <div>
                        <p className="mb-16">Dibuat Oleh,</p>
                        <div className="border-b border-black w-32 mx-auto"></div>
                        <p className="mt-2">( ________________ )</p>
                    </div>
                    <div>
                        <p className="mb-16">Disetujui Oleh,</p>
                        <div className="border-b border-black w-32 mx-auto"></div>
                        <p className="mt-2">( ________________ )</p>
                    </div>
                    <div>
                        <p className="mb-16">Penerima,</p>
                        <div className="border-b border-black w-32 mx-auto"></div>
                        <p className="mt-2">( ________________ )</p>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    .no-print {
                        display: none !important;
                    }
                    .printable-content {
                        border: none !important;
                        box-shadow: none !important;
                        padding: 0 !important;
                    }
                    body {
                        background: white !important;
                    }
                }
            `}</style>
        </div>
    );
}
