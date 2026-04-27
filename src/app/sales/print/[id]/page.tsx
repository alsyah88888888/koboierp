import { getPrisma } from "@/lib/prisma";

import { DocumentLayout } from "@/components/print/DocumentLayout";
import { format } from "date-fns";
import { formatCurrency, formatNumber, serializeDecimal } from "@/lib/utils";

import { headers } from "next/headers";

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
    // Force dynamic rendering to skip build-time DB check
    await headers();
    
    const prisma = getPrisma();
    const { id } = await params;

    
    const delivery: any = await prisma.salesDelivery.findUnique({
        where: { id },
        include: {
            items: { include: { product: true } },
            warehouse: true
        }
    }).then((res: any) => serializeDecimal(res));

    if (!delivery) return <div>Data not found</div>;

    const totalQty = delivery.items.reduce((acc: number, item: any) => acc + (Number(item.quantity) || 0), 0);
    const subTotal = Number(delivery.subtotal || 0);
    const totalDiscount = Number(delivery.totalDiscount || 0);
    const taxAmount = Number(delivery.taxAmount || 0);
    const taxRate = Number(delivery.taxRate || 0);
    const grandTotal = Math.round(subTotal - totalDiscount + taxAmount);

    // Tax and Financial Logic
    const dpp = subTotal - totalDiscount;
    const isPPN12 = taxRate === 12;
    const dppNilaiLain = isPPN12 ? Math.round(dpp * (11 / 12)) : dpp;
    const netTransfer = grandTotal; 

    return (
        <DocumentLayout
            title="FAKTUR PENJUALAN"
            docNumber={delivery.deliveryNumber}
            date={format(new Date(delivery.date || delivery.createdAt), "dd MMM yyyy")}
            headerInfo={
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-start gap-4 text-[10px] font-bold uppercase italic border border-slate-900 p-3 bg-slate-50/20">
                        <div className="flex-1 space-y-0.5">
                            <span className="text-[8px] text-slate-400 tracking-widest not-italic block">PEMBELI / TOKO:</span>
                            <div className="text-slate-900 text-xs leading-tight font-black tabular-nums">{delivery.buyerName}</div>
                        </div>
                        <div className="flex-[1.5] space-y-0.5 border-l border-slate-300 pl-4">
                            <span className="text-[8px] text-slate-400 tracking-widest not-italic block">ALAMAT PENGIRIMAN:</span>
                            <div className="text-slate-600 leading-tight font-semibold normal-case italic text-[9px]">{delivery.recipient}</div>
                        </div>
                        {delivery.salesPerson && (
                            <div className="flex-none space-y-0.5 border-l border-slate-300 pl-4 text-center">
                                <span className="text-[8px] text-slate-400 tracking-widest not-italic block">SALES</span>
                                <div className="text-primary text-[10px] font-black italic">{delivery.salesPerson}</div>
                            </div>
                        )}
                    </div>
                </div>
            }
        >
            <table className="w-full border-collapse border border-slate-900">
                <thead>
                    <tr className="uppercase text-[9px] font-black bg-slate-900 text-white tracking-widest">
                        <th className="border border-slate-900 p-2 text-center w-8">NO</th>
                        <th className="border border-slate-900 p-2 text-left w-24">BARCODE</th>
                        <th className="border border-slate-900 p-2 text-left">NAMA / DESKRIPSI BARANG</th>
                        <th className="border border-slate-900 p-2 text-center w-12">QTY</th>
                        <th className="border border-slate-900 p-2 text-center w-16">SATUAN</th>
                        <th className="border border-slate-900 p-2 text-right w-28">HARGA</th>
                        <th className="border border-slate-900 p-2 text-right w-32">TOTAL</th>
                    </tr>
                </thead>
                <tbody className="text-[9px] font-bold text-slate-800">
                    {delivery.items.map((item: any, idx: number) => (
                        <tr key={idx}>
                            <td className="border border-slate-900 p-1.5 text-center font-black">{idx + 1}</td>
                            <td className="border border-slate-900 p-1.5 text-left font-mono tracking-tighter text-[8px]">{item.product.barcode || item.product.sku || "-"}</td>
                            <td className="border border-slate-900 p-1.5 uppercase truncate max-w-[150px]">{item.product.name}</td>
                            <td className="border border-slate-900 p-1.5 text-center font-black">{formatNumber(item.quantity)}</td>
                            <td className="border border-slate-900 p-1.5 text-center uppercase tracking-tighter">{(item.uom || item.product.uom || "-").replace(/KARTOON/gi, 'KARTON')}</td>
                            <td className="border border-slate-900 p-1.5 text-right font-medium">{formatCurrency(Number(item.salesPrice))}</td>
                            <td className="border border-slate-900 p-1.5 text-right font-black">{formatCurrency(Number(item.quantity) * Number(item.salesPrice))}</td>
                        </tr>
                    ))}
                    {[...Array(Math.max(0, 4 - delivery.items.length))].map((_, i) => (
                        <tr key={`empty-${i}`} className="h-6">
                            <td className="border border-slate-900"></td><td className="border border-slate-900"></td>
                            <td className="border border-slate-900"></td><td className="border border-slate-900"></td>
                            <td className="border border-slate-900"></td><td className="border border-slate-900"></td>
                            <td className="border border-slate-900"></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="grid grid-cols-2 mt-2 gap-4">
                <div className="border border-slate-900 p-2 flex flex-col justify-between bg-slate-50/20">
                    <div>
                        <h4 className="text-[8px] font-black uppercase mb-1 border-b border-slate-200">Keterangan / Catatan</h4>
                        <p className="text-[9px] italic text-slate-600 leading-tight">
                            Barang yang sudah dibeli tidak dapat ditukar/dikembalikan kecuali ada perjanjian sebelumnya.
                        </p>
                    </div>
                    {delivery.poNumber && (
                        <div className="mt-2 text-[9px] font-black">
                            <span className="text-slate-400 uppercase tracking-tighter">PO BUYER: </span>
                            <span className="text-slate-900">#{delivery.poNumber}</span>
                        </div>
                    )}
                </div>

                <div className="space-y-1 border border-slate-900 p-2 font-black bg-slate-50/50">
                    <div className="flex justify-between text-[9px]">
                        <span className="text-slate-400 uppercase">Subtotal Brutto</span>
                        <span>{formatCurrency(subTotal)}</span>
                    </div>
                    {totalDiscount > 0 && (
                        <div className="flex justify-between text-[9px] text-orange-600 italic">
                            <span className="text-slate-400 uppercase">Potongan</span>
                            <span>- {formatCurrency(totalDiscount)}</span>
                        </div>
                    )}
                    
                    <div className="border-y border-slate-200 py-0.5 flex justify-between text-[10px] bg-slate-100/50 px-1">
                        <span className="text-slate-900 uppercase">DPP</span>
                        <span>{formatCurrency(dpp)}</span>
                    </div>

                    {isPPN12 && (
                        <div className="flex justify-between text-[8px] italic text-slate-500 px-1">
                            <span>DPP NILAI LAIN (11/12)</span>
                            <span>{formatCurrency(dppNilaiLain)}</span>
                        </div>
                    )}

                    {taxAmount > 0 && (
                        <div className="flex justify-between text-[9px] text-indigo-600">
                            <span className="text-slate-400 uppercase">PPN {taxRate}% {isPPN12 ? "(N. LAIN)" : ""}</span>
                            <span>+ {formatCurrency(taxAmount)}</span>
                        </div>
                    )}

                    <div className="border-t border-slate-900 pt-1 flex justify-between text-xs text-slate-900 uppercase">
                        <span>Total Tagihan (NETTO)</span>
                        <span>{formatCurrency(grandTotal)}</span>
                    </div>

                    <div className="border-t-2 border-slate-900 mt-1 pt-1 flex justify-between text-sm text-primary font-black bg-white px-2 rounded border-x shadow-sm">
                        <span className="uppercase text-[10px] mt-0.5">TOTAL NETTO PEMBAYARAN</span>
                        <span>{formatCurrency(netTransfer)}</span>
                    </div>
                </div>
            </div>
        </DocumentLayout >
    );
}
