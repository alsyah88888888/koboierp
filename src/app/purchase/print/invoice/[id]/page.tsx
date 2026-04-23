import { getPrisma } from "@/lib/prisma";

import { DocumentLayout } from "@/components/print/DocumentLayout";
import { format } from "date-fns";
import { formatCurrency, formatNumber, serializeDecimal } from "@/lib/utils";

import { headers } from "next/headers";

export default async function PurchaseInvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
    // Force dynamic rendering to skip build-time DB check
    await headers();
    
    const prisma = getPrisma();
    const { id } = await params;

    const receipt: any = await prisma.goodsReceipt.findUnique({
        where: { id },
        include: {
            items: { include: { product: true } },
            warehouse: true
        }
    }).then((res: any) => serializeDecimal(res));

    if (!receipt) return <div>Data not found</div>;

    const totalQty = receipt.items.reduce((acc: number, item: any) => acc + (Number(item.quantity) || 0), 0);
    const subTotal = Number(receipt.subtotal || 0);
    const totalDiscount = Number(receipt.totalDiscount || 0);
    const taxAmount = Number(receipt.taxAmount || 0);
    const taxRate = Number(receipt.taxRate || 0);
    const grandTotal = Math.round(subTotal - totalDiscount + taxAmount);

    const dpp = subTotal - totalDiscount;
    const isPPN12 = taxRate === 12;
    const dppNilaiLain = isPPN12 ? Math.round(dpp * (11 / 12)) : dpp;
    
    // Calculate cashback total from the new cashbacks JSON field
    const cashbacksArray = Array.isArray(receipt.cashbacks) ? receipt.cashbacks : [];
    const totalCashback = cashbacksArray.reduce((sum: number, cb: any) => {
        const rate = Number(cb.rate) || 0;
        return sum + Math.round(dpp * (rate / 100));
    }, 0);

    const netTransfer = grandTotal - totalCashback;

    return (
        <DocumentLayout
            isA5={true}
            title="FAKTUR PEMBELIAN"
            docNumber={receipt.formNumber}
            date={format(new Date(receipt.date || receipt.createdAt), "dd MMM yyyy")}
            headerInfo={
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs italic font-bold">
                    <div className="grid grid-cols-[100px_1fr] gap-x-4">
                        <span className="text-slate-400 uppercase">Dari:</span>
                        <span className="text-slate-900 uppercase tabular-nums">{receipt.receivedFrom}</span>
                        <span className="text-slate-400 uppercase">No. Ref:</span>
                        <span className="text-slate-600 uppercase tabular-nums">{receipt.receiptNumber}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] gap-x-4 text-right">
                        <span className="text-slate-400 uppercase">Gudang:</span>
                        <span className="text-slate-900 uppercase">{receipt.warehouse?.name || "-"}</span>
                        <span className="text-slate-400 uppercase">Sales / PIC:</span>
                        <span className="text-slate-600 font-black tracking-tighter">{receipt.salesPerson || "-"}</span>
                    </div>
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
                        <th className="border border-slate-900 p-2 text-right w-32">HARGA BELI</th>
                        <th className="border border-slate-900 p-2 text-right w-40">TOTAL HARGA</th>
                    </tr>
                </thead>
                <tbody className="text-[10px] font-bold text-slate-800">
                    {receipt.items.map((item: any, idx: number) => (
                        <tr key={idx}>
                            <td className="border border-slate-900 p-2.5 text-center font-black">{idx + 1}</td>
                            <td className="border border-slate-900 p-2.5 text-left font-mono tracking-tighter text-[9px]">{item.product.barcode || item.product.sku || "-"}</td>
                            <td className="border border-slate-900 p-2.5 uppercase">{item.product.name}</td>
                            <td className="border border-slate-900 p-2.5 text-center font-black">{formatNumber(item.quantity)}</td>
                            <td className="border border-slate-900 p-2.5 text-center uppercase tracking-tighter">{(item.uom || item.product.uom || "-").replace(/KARTOON/gi, 'KARTON')}</td>
                            <td className="border border-slate-900 p-2.5 text-right font-medium">{formatCurrency(Number(item.purchasePrice))}</td>
                            <td className="border border-slate-900 p-2.5 text-right font-black">{formatCurrency(Number(item.quantity) * Number(item.purchasePrice))}</td>
                        </tr>
                    ))}
                    {[...Array(Math.max(0, 5 - receipt.items.length))].map((_, i) => (
                        <tr key={`empty-${i}`} className="h-8">
                            <td className="border border-slate-900"></td><td className="border border-slate-900"></td>
                            <td className="border border-slate-900"></td><td className="border border-slate-900"></td>
                            <td className="border border-slate-900"></td><td className="border border-slate-900"></td>
                            <td className="border border-slate-900"></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="grid grid-cols-2 mt-4 gap-4">
                <div className="border border-slate-900 p-3 flex flex-col justify-between">
                    <div>
                        <h4 className="text-[10px] font-black uppercase mb-2 border-b border-slate-200">Keterangan / Catatan</h4>
                        <p className="text-[10px] italic text-slate-600 whitespace-pre-wrap">{receipt.notes || "-"}</p>
                    </div>
                    {cashbacksArray.length > 0 && (
                        <div className="mt-4 pt-2 border-t border-slate-900/10">
                            <h4 className="text-[9px] font-black uppercase mb-1 text-slate-400">Rincian Cashback</h4>
                            {cashbacksArray.map((cb: any, i: number) => (
                                <div key={i} className="flex justify-between text-[10px] font-bold italic">
                                    <span>{cb.label} ({cb.rate}%)</span>
                                    <span>{formatCurrency(Math.round(dpp * (Number(cb.rate) / 100)))}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-1.5 border border-slate-900 p-3 font-black bg-slate-50/50">
                    <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400 uppercase">Subtotal Brutto</span>
                        <span>{formatCurrency(subTotal)}</span>
                    </div>
                    {totalDiscount > 0 && (
                        <div className="flex justify-between text-[10px] text-orange-600 italic">
                            <span className="text-slate-400 uppercase">Total Diskon</span>
                            <span>- {formatCurrency(totalDiscount)}</span>
                        </div>
                    )}
                    
                    <div className="border-y border-slate-200 py-1 flex justify-between text-[11px] bg-slate-100/50 px-1">
                        <span className="text-slate-900 uppercase">DPP (DASAR PENGENAAN PAJAK)</span>
                        <span>{formatCurrency(dpp)}</span>
                    </div>

                    {isPPN12 && (
                        <div className="flex justify-between text-[9px] italic text-slate-500 px-1">
                            <span>DPP NILAI LAIN (11/12)</span>
                            <span>{formatCurrency(dppNilaiLain)}</span>
                        </div>
                    )}

                    {taxAmount > 0 && (
                        <div className="flex justify-between text-[10px] text-indigo-600">
                            <span className="text-slate-400 uppercase">PPN {taxRate}% {isPPN12 ? "(NILAI LAIN)" : ""}</span>
                            <span>+ {formatCurrency(taxAmount)}</span>
                        </div>
                    )}

                    <div className="border-t border-slate-900 pt-1 flex justify-between text-xs text-slate-900 uppercase">
                        <span>Total Faktur (NETTO)</span>
                        <span>{formatCurrency(grandTotal)}</span>
                    </div>

                    {totalCashback > 0 && (
                        <div className="flex justify-between text-xs text-rose-600 border-t border-slate-300 pt-1">
                            <span className="uppercase">TOTAL CASHBACK</span>
                            <span>- {formatCurrency(totalCashback)}</span>
                        </div>
                    )}

                    <div className="border-t-2 border-slate-900 mt-2 pt-2 flex justify-between text-lg text-primary font-black bg-white px-2 rounded-lg border-x shadow-sm">
                        <span className="uppercase text-sm mt-1">TOTAL NETTO PEMBAYARAN</span>
                        <span>{formatCurrency(netTransfer)}</span>
                    </div>
                </div>
            </div>
        </DocumentLayout >
    );
}
