import React from 'react';
import { getPrisma } from "@/lib/prisma";
import { format } from "date-fns";
import { formatNumber } from "@/lib/utils";
import { PrintButton } from "./PrintButton";

export const dynamic = 'force-dynamic';

export default async function PrintFormHarianPage({ searchParams }: { searchParams: any }) {
    try {
        const params = await searchParams;
        const prisma = getPrisma();
        
        // Safely extract date string
        let rawDate = params?.date;
        if (Array.isArray(rawDate)) rawDate = rawDate[0];
        
        const selectedDateStr = rawDate || format(new Date(), 'yyyy-MM-dd');
        const selectedDate = new Date(selectedDateStr);
        
        if (isNaN(selectedDate.getTime())) {
            throw new Error(`Invalid date format provided: ${selectedDateStr}`);
        }
        
        const dateStart = new Date(selectedDateStr + 'T00:00:00.000Z');
        const dateEnd = new Date(selectedDateStr + 'T23:59:59.999Z');

        // Fetch Incoming Goods (GoodsReceipt)
        const incomingReceipts = await prisma.goodsReceipt.findMany({
            where: {
                date: { gte: dateStart, lte: dateEnd },
                isVoid: false
            },
            include: { items: { include: { product: true } } },
            orderBy: { createdAt: 'asc' }
        });

        // Fetch Outgoing Goods (SalesDelivery)
        const outgoingDeliveries = await prisma.salesDelivery.findMany({
            where: {
                date: { gte: dateStart, lte: dateEnd },
                isVoid: false
            },
            include: { items: { include: { product: true } } },
            orderBy: { createdAt: 'asc' }
        });

        // Flatten items
        const incomingItems = incomingReceipts.flatMap(gr => 
            gr.items.map(item => ({
                supplier: gr.receivedFrom,
                productName: item.product?.name || 'Unknown Product',
                qty: item.quantity,
                uom: item.uom || item.product?.uom || '',
                notes: gr.receiptNumber
            }))
        );

        const outgoingItems = outgoingDeliveries.flatMap(sd => 
            sd.items.map(item => ({
                buyer: sd.buyerName,
                productName: item.product?.name || 'Unknown Product',
                qty: item.quantity,
                uom: item.uom || item.product?.uom || '',
                notes: sd.deliveryNumber
            }))
        );

        const maxRowsIncoming = Math.max(12, incomingItems.length);
        const displayIncoming = [...incomingItems];
        while(displayIncoming.length < maxRowsIncoming) { displayIncoming.push({ empty: true } as any); }
        
        const maxRowsOutgoing = Math.max(12, outgoingItems.length);
        const displayOutgoing = [...outgoingItems];
        while(displayOutgoing.length < maxRowsOutgoing) { displayOutgoing.push({ empty: true } as any); }

        return (
            <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans print:p-0 print:bg-white text-black">
                <style dangerouslySetInnerHTML={{__html: `
                    @media print {
                        @page { size: A4 portrait; margin: 10mm; }
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .no-print { display: none !important; }
                    }
                    .form-table th, .form-table td {
                        border: 1px solid black;
                        padding: 6px 10px;
                        font-size: 11px;
                    }
                    .form-table th {
                        background-color: #DDEBF7;
                        font-weight: normal;
                        text-align: center;
                    }
                `}} />

                <div className="no-print max-w-[210mm] mx-auto mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between gap-4 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-100 p-3 rounded-xl text-blue-700">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">Rekap Harian Gudang</h1>
                            <p className="text-slate-500 text-sm mt-0.5">Cetak & validasi penerimaan dan pengeluaran barang.</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4">
                        <form method="GET" className="flex items-center bg-slate-50 p-1.5 rounded-xl border border-slate-200 shadow-inner flex-1">
                            <input type="date" name="date" defaultValue={selectedDateStr} className="bg-transparent border-none outline-none text-sm px-3 py-1.5 text-slate-700 font-medium cursor-pointer w-full" />
                            <button type="submit" className="bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-blue-600 transition-colors px-4 py-1.5 rounded-lg text-sm font-semibold shadow-sm ml-2 flex items-center gap-2 whitespace-nowrap">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                                Tampilkan
                            </button>
                        </form>
                        <PrintButton />
                    </div>
                </div>

                {/* PAGE 1: BARANG DATANG */}
                <div className="w-full bg-white mx-auto print:shadow-none shadow-2xl border border-slate-200 print:border-none rounded-sm print:rounded-none mb-12 print:mb-0" style={{ maxWidth: '210mm', minHeight: '297mm', pageBreakAfter: 'always' }}>
                    <div className="flex flex-col w-full p-8 print:p-0">
                        <div className="text-center font-bold text-lg mb-8 uppercase border-b-2 border-black pb-2">
                            BUKTI PENERIMAAN BARANG DATANG
                        </div>
                        
                        <div className="mb-6 text-sm space-y-1">
                            <div className="grid grid-cols-[120px_1fr]">
                                <span>No Bukti</span>
                                <span className="font-bold">: RHG-IN-{format(selectedDate, "ddMMyyyy")}</span>
                            </div>
                            <div className="grid grid-cols-[120px_1fr]">
                                <span>Hari Tanggal</span>
                                <span>: {format(selectedDate, "EEEE, dd MMMM yyyy")}</span>
                            </div>
                        </div>

                        <table className="w-full border-collapse form-table mb-12">
                            <thead>
                                <tr>
                                    <th className="w-8">NO</th>
                                    <th className="w-48">Nama Suplayer</th>
                                    <th>Item Name</th>
                                    <th className="w-16">QTY</th>
                                    <th className="w-40">KETERANGAN</th>
                                    <th className="w-24">TTD</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayIncoming.map((item: any, i: number) => (
                                    <tr key={i} className="h-8">
                                        <td className="text-center outline-none focus:bg-blue-50" contentEditable={true} suppressContentEditableWarning={true}>{!item.empty ? i + 1 : (i === 0 ? '1' : '.')}</td>
                                        <td className="text-xs uppercase font-semibold outline-none focus:bg-blue-50" contentEditable={true} suppressContentEditableWarning={true}>{!item.empty ? item.supplier : ''}</td>
                                        <td className="text-xs uppercase outline-none focus:bg-blue-50" contentEditable={true} suppressContentEditableWarning={true}>{!item.empty ? item.productName : ''}</td>
                                        <td className="text-center font-bold outline-none focus:bg-blue-50" contentEditable={true} suppressContentEditableWarning={true}>{!item.empty && item.qty != null ? formatNumber(Number(item.qty)) : ''}</td>
                                        <td className="text-[11px] break-words leading-tight outline-none focus:bg-blue-50" contentEditable={true} suppressContentEditableWarning={true}>{!item.empty ? item.notes : ''}</td>
                                        <td className="outline-none focus:bg-blue-50" contentEditable={true} suppressContentEditableWarning={true}></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="flex justify-between text-sm mt-12 px-8 break-inside-avoid">
                            <div className="flex flex-col justify-between h-32 text-center">
                                <div>Diterima Oleh</div>
                                <div>( Kepala Gudang )</div>
                            </div>
                            <div className="flex flex-col justify-between h-32 text-center">
                                <div>Mengetahui</div>
                                <div>( PIC Admin )</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* PAGE 2: BARANG KELUAR */}
                <div className="w-full bg-white mx-auto print:shadow-none shadow-2xl border border-slate-200 print:border-none rounded-sm print:rounded-none" style={{ maxWidth: '210mm', minHeight: '297mm' }}>
                    <div className="flex flex-col w-full p-8 print:p-0">
                        <div className="text-center font-bold text-lg mb-8 uppercase border-b-2 border-black pb-2">
                            BUKTI PENGIRIMAN BARANG KELUAR
                        </div>
                        
                        <div className="mb-6 text-sm space-y-1">
                            <div className="grid grid-cols-[120px_1fr]">
                                <span>No Bukti</span>
                                <span className="font-bold">: RHG-OUT-{format(selectedDate, "ddMMyyyy")}</span>
                            </div>
                            <div className="grid grid-cols-[120px_1fr]">
                                <span>Hari Tanggal</span>
                                <span>: {format(selectedDate, "EEEE, dd MMMM yyyy")}</span>
                            </div>
                        </div>

                        <table className="w-full border-collapse form-table mb-12">
                            <thead>
                                <tr>
                                    <th className="w-8">NO</th>
                                    <th className="w-48">Nama Buyer</th>
                                    <th>Item Name</th>
                                    <th className="w-16">QTY</th>
                                    <th className="w-40">KETERANGAN</th>
                                    <th className="w-24">CEK FISIK</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayOutgoing.map((item: any, i: number) => (
                                    <tr key={i} className="h-8">
                                        <td className="text-center outline-none focus:bg-blue-50" contentEditable={true} suppressContentEditableWarning={true}>{!item.empty ? i + 1 : (i === 0 ? '1' : '.')}</td>
                                        <td className="text-xs uppercase font-semibold outline-none focus:bg-blue-50" contentEditable={true} suppressContentEditableWarning={true}>{!item.empty ? item.buyer : ''}</td>
                                        <td className="text-xs uppercase outline-none focus:bg-blue-50" contentEditable={true} suppressContentEditableWarning={true}>{!item.empty ? item.productName : ''}</td>
                                        <td className="text-center font-bold outline-none focus:bg-blue-50" contentEditable={true} suppressContentEditableWarning={true}>{!item.empty && item.qty != null ? formatNumber(Number(item.qty)) : ''}</td>
                                        <td className="text-[11px] break-words leading-tight outline-none focus:bg-blue-50" contentEditable={true} suppressContentEditableWarning={true}>{!item.empty ? item.notes : ''}</td>
                                        <td className="outline-none focus:bg-blue-50" contentEditable={true} suppressContentEditableWarning={true}></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="flex justify-between text-sm mt-12 px-8 break-inside-avoid">
                            <div className="flex flex-col justify-between h-32 text-center">
                                <div>Disiapkan Oleh</div>
                                <div>( Kepala Gudang )</div>
                            </div>
                            <div className="flex flex-col justify-between h-32 text-center">
                                <div>Mengetahui</div>
                                <div>( PIC Admin )</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    } catch (error: any) {
        return (
            <div className="p-8">
                <h1 className="text-red-600 font-bold text-2xl mb-4">Server Error Occurred</h1>
                <pre className="bg-slate-100 p-4 rounded text-sm text-black whitespace-pre-wrap">{error.stack || error.message || String(error)}</pre>
            </div>
        );
    }
}
