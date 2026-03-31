export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { DocumentLayout } from "@/components/print/DocumentLayout";
import { format } from "date-fns";
import { formatCurrency, formatNumber, serializeDecimal } from "@/lib/utils";

import { headers } from "next/headers";

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
    // Force dynamic rendering to skip build-time DB check
    await headers();
    
    const { id } = await params;
    
    const delivery: any = await prisma.salesDelivery.findUnique({
        where: { id },
        include: {
            items: { include: { product: true } },
            warehouse: true
        }
    }).then(res => serializeDecimal(res));

    if (!delivery) return <div>Data not found</div>;

    const totalQty = delivery.items.reduce((acc: number, item: any) => acc + (Number(item.quantity) || 0), 0);
    const subTotal = Number(delivery.subtotal || 0);
    const totalDiscount = Number(delivery.totalDiscount || 0);
    const taxAmount = Number(delivery.taxAmount || 0);
    const taxRate = Number(delivery.taxRate || 0);
    const grandTotal = Math.round(subTotal - totalDiscount + taxAmount);

    return (
        <DocumentLayout
            isA5={true}
            title="Faktur Penjualan"
            docNumber={delivery.deliveryNumber}
            date={format(new Date(delivery.createdAt), "dd MMM yyyy")}
            headerInfo={
                <div className="flex justify-between items-start gap-8 text-xs font-bold uppercase italic border-2 border-slate-100 p-4 rounded-xl bg-slate-50/20">
                    <div className="flex-1 space-y-1">
                        <span className="text-[9px] text-slate-400 tracking-widest not-italic block mb-1">DITUJUKAN KEPADA</span>
                        <div className="text-slate-900 text-sm leading-tight font-black tabular-nums">{delivery.buyerName}</div>
                    </div>
                    <div className="flex-[1.5] space-y-1 border-l-2 border-slate-200 pl-8">
                        <span className="text-[9px] text-slate-400 tracking-widest not-italic block mb-1">ALAMAT PENGIRIMAN</span>
                        <div className="text-slate-600 leading-relaxed font-semibold normal-case italic">{delivery.recipient}</div>
                    </div>
                    {delivery.salesPerson && (
                        <div className="flex-none space-y-1 border-l-2 border-slate-200 pl-8 text-center min-w-[60px]">
                            <span className="text-[9px] text-slate-400 tracking-widest not-italic block mb-1">SALES</span>
                            <div className="text-primary text-sm font-black italic">{delivery.salesPerson}</div>
                        </div>
                    )}
                </div>
            }
        >
            <table className="w-full border-collapse border border-slate-900">
                <thead>
                    <tr className="uppercase text-[10px] font-black tracking-widest bg-slate-50">
                        <th className="border border-slate-900 p-2 text-center w-8">No</th>
                        <th className="border border-slate-900 p-2 text-left w-32">Barcode</th>
                        <th className="border border-slate-900 p-2 text-left">Nama Barang</th>
                        <th className="border border-slate-900 p-2 text-center w-16">QTY</th>
                        <th className="border border-slate-900 p-2 text-center w-20">SATUAN</th>
                        <th className="border border-slate-900 p-2 text-right w-32">HARGA SATUAN</th>
                        <th className="border border-slate-900 p-2 text-right w-40">TOTAL HARGA</th>
                    </tr>
                </thead>
                <tbody className="text-[10px] font-bold text-slate-800">
                    {delivery.items.map((item: any, idx: number) => (
                        <tr key={idx}>
                            <td className="border border-slate-900 p-2.5 text-center font-black">{idx + 1}</td>
                            <td className="border border-slate-900 p-2.5 text-left font-mono tracking-tighter text-[9px]">{item.product.barcode || item.product.sku || "-"}</td>
                            <td className="border border-slate-900 p-2.5 uppercase">{item.product.name}</td>
                            <td className="border border-slate-900 p-2.5 text-center font-black">{formatNumber(item.quantity)}</td>
                            <td className="border border-slate-900 p-2.5 text-center uppercase tracking-tighter">{(item.uom || item.product.uom || "-").replace(/KARTOON/gi, 'KARTON')}</td>
                            <td className="border border-slate-900 p-2.5 text-right font-medium">{formatCurrency(Number(item.salesPrice))}</td>
                            <td className="border border-slate-900 p-2.5 text-right font-black">{formatCurrency(Number(item.quantity) * Number(item.salesPrice))}</td>
                        </tr>
                    ))}
                    {[...Array(Math.max(0, 5 - delivery.items.length))].map((_, i) => (
                        <tr key={`empty-${i}`} className="h-8">
                            <td className="border border-slate-900"></td><td className="border border-slate-900"></td>
                            <td className="border border-slate-900"></td><td className="border border-slate-900"></td>
                            <td className="border border-slate-900"></td><td className="border border-slate-900"></td>
                            <td className="border border-slate-900"></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="flex justify-end mt-4">
                <div className="w-80 space-y-2 border border-slate-900 p-3 font-black">
                    <div className="flex justify-between text-xs pb-2 border-b-2 border-slate-200">
                        <span className="text-slate-400 uppercase">JUMLAH QTY</span>
                        <span className="tabular-nums">{formatNumber(totalQty)}</span>
                    </div>
                    <div className="flex justify-between text-xs pt-1">
                        <span className="text-slate-400 uppercase">Total Brutto</span>
                        <span>{formatCurrency(subTotal)}</span>
                    </div>
                    {totalDiscount > 0 && (
                        <div className="flex justify-between text-xs text-orange-600 italic">
                            <span className="text-slate-400 uppercase font-black tracking-widest">Total Potongan</span>
                            <span>- {formatCurrency(totalDiscount)}</span>
                        </div>
                    )}
                    {taxAmount > 0 && (
                        <div className="flex justify-between text-xs text-indigo-600">
                            <span className="text-slate-400 uppercase">PPN {taxRate}%</span>
                            <span>+ {formatCurrency(taxAmount)}</span>
                        </div>
                    )}
                    <div className="border-t-2 border-slate-900 pt-2 flex justify-between text-lg text-primary">
                        <span className="uppercase">Grand Total Netto</span>
                        <span>{formatCurrency(grandTotal)}</span>
                    </div>
                </div>
            </div>
        </DocumentLayout >
    );
}
