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

        const maxRows = Math.max(12, incomingItems.length, outgoingItems.length);
        
        // Fill with empty rows to match maxRows
        const displayIncoming = [...incomingItems];
        while(displayIncoming.length < maxRows) { displayIncoming.push({ empty: true } as any); }
        
        const displayOutgoing = [...outgoingItems];
        while(displayOutgoing.length < maxRows) { displayOutgoing.push({ empty: true } as any); }

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

                <div className="no-print p-4 flex justify-between items-center bg-slate-100 border-b mb-4">
                    <div className="flex items-center gap-4">
                        <span className="font-bold">Pilih Tanggal:</span>
                        <form method="GET" className="flex items-center gap-2">
                            <input type="date" name="date" defaultValue={selectedDateStr} className="border p-2 rounded" />
                            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded font-bold">Tampilkan</button>
                        </form>
                    </div>
                    <PrintButton />
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
                                <span>: .............................</span>
                            </div>
                            <div className="grid grid-cols-[100px_1fr]">
                                <span>Hari Tanggal</span>
                                <span>: {format(selectedDate, "EEEE, dd MMMM yyyy")}</span>
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
                                {displayIncoming.map((item: any, i: number) => (
                                    <tr key={i} className="h-6">
                                        <td className="text-center">{!item.empty ? i + 1 : (i === 0 ? '1' : '.')}</td>
                                        <td className="text-xs uppercase font-semibold">{!item.empty ? item.supplier : ''}</td>
                                        <td className="text-xs uppercase">{!item.empty ? item.productName : ''}</td>
                                        <td className="text-center font-bold">{!item.empty && item.qty != null ? formatNumber(Number(item.qty)) : ''}</td>
                                        <td className="text-xs truncate max-w-[120px]">{!item.empty ? item.notes : ''}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="flex justify-between text-xs mt-12 px-4 break-inside-avoid">
                            <div className="flex flex-col justify-between h-24 text-center">
                                <div>Diterima Oleh</div>
                                <div>Kepala Gudang</div>
                            </div>
                            <div className="flex flex-col justify-between h-24 text-center">
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
                                <span>: .............................</span>
                            </div>
                            <div className="grid grid-cols-[100px_1fr]">
                                <span>Hari Tanggal</span>
                                <span>: {format(selectedDate, "EEEE, dd MMMM yyyy")}</span>
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
                                {displayOutgoing.map((item: any, i: number) => (
                                    <tr key={i} className="h-6">
                                        <td className="text-center">{!item.empty ? i + 1 : (i === 0 ? '1' : '.')}</td>
                                        <td className="text-xs uppercase font-semibold">{!item.empty ? item.buyer : ''}</td>
                                        <td className="text-xs uppercase">{!item.empty ? item.productName : ''}</td>
                                        <td className="text-center font-bold">{!item.empty && item.qty != null ? formatNumber(Number(item.qty)) : ''}</td>
                                        <td className="text-xs truncate max-w-[120px]">{!item.empty ? item.notes : ''}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="flex justify-between text-xs mt-12 px-4 break-inside-avoid">
                            <div className="flex flex-col justify-between h-24 text-center">
                                <div>Diterima Oleh</div>
                                <div>Kepala Gudang</div>
                            </div>
                            <div className="flex flex-col justify-between h-24 text-center">
                                <div>Mengetahui</div>
                                <div>PIC Admint</div>
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
