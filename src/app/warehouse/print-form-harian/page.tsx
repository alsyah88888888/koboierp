"use client";

import React, { useEffect } from 'react';

export default function PrintFormHarianPage() {
    const rows = 12; // Adjusted to match the visual length of the example

    return (
        <div className="w-full bg-white text-black font-sans print:m-0 print:p-0 mx-auto" style={{ maxWidth: '297mm', minHeight: '210mm' }}>
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page { size: A4 landscape; margin: 10mm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .no-print { display: none !important; }
                }
                .form-table th, .form-table td {
                    border: 1px solid black;
                    padding: 4px 8px;
                    font-size: 11px;
                }
                .form-table th {
                    background-color: #DDEBF7;
                    font-weight: normal;
                    text-align: center;
                }
            `}} />

            <div className="no-print p-4 flex justify-end">
                <button onClick={() => window.print()} className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-800 shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    Print Blank Form
                </button>
            </div>

            <div className="flex w-full gap-8 p-4">
                {/* LEFT SIDE: BARANG DATANG */}
                <div className="flex-1 border-r border-dashed border-gray-300 pr-8">
                    <div className="text-center font-bold text-sm mb-6 uppercase">
                        BUKTI PENERIMAAN BARANG DATANG
                    </div>
                    
                    <div className="mb-4 text-xs space-y-1">
                        <div className="grid grid-cols-[100px_1fr]">
                            <span>No Bukti</span>
                            <span>:</span>
                        </div>
                        <div className="grid grid-cols-[100px_1fr]">
                            <span>Hari Tanggal</span>
                            <span>:</span>
                        </div>
                    </div>

                    <table className="w-full border-collapse form-table mb-12">
                        <thead>
                            <tr>
                                <th className="w-8">NO</th>
                                <th className="w-40">Nama Suplayer</th>
                                <th>Item Name</th>
                                <th className="w-16">QTY</th>
                                <th className="w-32">KETERANGAN</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="h-6">
                                <td className="text-center">1</td><td></td><td></td><td></td><td></td>
                            </tr>
                            {[...Array(rows - 1)].map((_, i) => (
                                <tr key={i} className="h-6">
                                    <td className="text-center text-xs">.</td><td></td><td></td><td></td><td></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="flex justify-between text-xs mt-12 px-4">
                        <div className="flex flex-col justify-between h-24">
                            <div>Diterima Oleh</div>
                            <div>Kepala Gudang</div>
                        </div>
                        <div className="flex flex-col justify-between h-24">
                            <div>Mengetahui</div>
                            <div>PIC Admint</div>
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDE: BARANG KELUAR */}
                <div className="flex-1 pl-4">
                    <div className="text-center font-bold text-sm mb-6 uppercase">
                        BUKTI PENERIMAAN BARANG KELUAR
                    </div>
                    
                    <div className="mb-4 text-xs space-y-1">
                        <div className="grid grid-cols-[100px_1fr]">
                            <span>No Bukti</span>
                            <span>:</span>
                        </div>
                        <div className="grid grid-cols-[100px_1fr]">
                            <span>Hari Tanggal</span>
                            <span>:</span>
                        </div>
                    </div>

                    <table className="w-full border-collapse form-table mb-12">
                        <thead>
                            <tr>
                                <th className="w-8">NO</th>
                                <th className="w-40">Nama Buyer</th>
                                <th>Item Name</th>
                                <th className="w-16">QTY</th>
                                <th className="w-32">KETERANGAN</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="h-6">
                                <td className="text-center">1</td><td></td><td></td><td></td><td></td>
                            </tr>
                            {[...Array(rows - 1)].map((_, i) => (
                                <tr key={i} className="h-6">
                                    <td className="text-center text-xs">.</td><td></td><td></td><td></td><td></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="flex justify-between text-xs mt-12 px-4">
                        <div className="flex flex-col justify-between h-24">
                            <div>Diterima Oleh</div>
                            <div>Kepala Gudang</div>
                        </div>
                        <div className="flex flex-col justify-between h-24">
                            <div>Mengetahui</div>
                            <div>PIC Admint</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
