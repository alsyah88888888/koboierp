import { getPrisma } from "@/lib/prisma";

import { DocumentLayout } from "@/components/print/DocumentLayout";
import { format } from "date-fns";
import { formatCurrency, formatNumber, serializeDecimal } from "@/lib/utils";

import { headers } from "next/headers";

export default async function ReceiptPrintPage({ params }: { params: Promise<{ id: string }> }) {
    // Force dynamic rendering to skip build-time DB check
    await headers();
    
    const prisma = getPrisma();
    const { id } = await params;

    const receipt = await prisma.goodsReceipt.findUnique({
        where: { id },
        include: {
            items: { include: { product: true } },
            warehouse: true
        }
    }).then((res: any) => serializeDecimal(res));

    if (!receipt) return <div>Data not found</div>;

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
            
            title="SURAT JALAN MASUK (LPB)"
            docNumber={receipt.formNumber}
            date={format(new Date(receipt.date || receipt.createdAt), "dd MMM yyyy")}
            headerInfo={
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs font-bold">
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                        <span className="text-slate-400 uppercase">Supplier:</span>
                        <span className="text-slate-900 uppercase tabular-nums">{receipt.receivedFrom}</span>
                        <span className="text-slate-400 uppercase">No. SJ/Receipt:</span>
                        <span className="text-slate-600 uppercase tabular-nums">{receipt.receiptNumber}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] gap-2 text-right">
                        <span className="text-slate-400 uppercase">Sales / PIC:</span>
                        <span className="text-slate-900 font-black italic">{receipt.salesPerson || "-"}</span>
                        <span className="text-slate-400 uppercase">Gudang:</span>
                        <span className="text-slate-600 uppercase">{receipt.warehouse?.name || "-"}</span>
                    </div>
                </div>
            }
        >
            <table className="w-full border-collapse border border-slate-900 mb-4">
                <thead>
                    <tr className="uppercase text-[10px] font-black tracking-widest">
                        <th className="border border-slate-900 p-2 text-center w-8">No</th>
                        <th className="border border-slate-900 p-2 text-left w-32">Barcode</th>
                        <th className="border border-slate-900 p-2 text-left">Nama Barang</th>
                        <th className="border border-slate-900 p-2 text-center w-20">Qty</th>
                        <th className="border border-slate-900 p-2 text-center w-20">Satuan</th>
                        <th className="border border-slate-900 p-2 text-right w-32">Harga Beli (@)</th>
                        <th className="border border-slate-900 p-2 text-right w-40">Total</th>
                    </tr>
                </thead>
                <tbody className="text-[10px] font-bold text-slate-800">
                    {receipt.items.map((item: any, idx: number) => (
                        <tr key={idx}>
                            <td className="border border-slate-900 p-2.5 text-center font-black">{idx + 1}</td>
                            <td className="border border-slate-900 p-2.5 text-left font-mono tracking-tighter text-[9px]">{item.product.barcode || item.product.sku || "-"}</td>
                            <td className="border border-slate-900 p-2.5 uppercase">{item.product.name}</td>
                            <td className="border border-slate-900 p-2.5 text-center">{formatNumber(item.quantity)}</td>
                            <td className="border border-slate-900 p-2.5 text-center uppercase">{(item.uom || item.product.uom || "-").replace(/KARTOON/gi, 'KARTON')}</td>
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
                <div className="border border-slate-900 p-3">
                    <h4 className="text-[10px] font-black uppercase mb-1 border-b border-slate-200">Keterangan</h4>
                    <p className="text-[10px] italic text-slate-600 mb-2">{receipt.notes || "-"}</p>
                    {cashbacksArray.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-200">
                            <h4 className="text-[9px] font-black uppercase mb-1 text-slate-400 italic">Rincian Cashback</h4>
                            {cashbacksArray.map((cb: any, i: number) => (
                                <div key={i} className="flex justify-between text-[10px] font-bold italic">
                                    <span>{cb.label} ({cb.rate}%)</span>
                                    <span>{formatCurrency(Math.round(dpp * (Number(cb.rate) / 100)))}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="border border-slate-900 p-3 bg-slate-50 space-y-1.5 font-black">
                    <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400 uppercase font-bold">Total Brutto</span>
                        <span className="text-slate-900">{formatCurrency(subTotal)}</span>
                    </div>
                    {totalDiscount > 0 && (
                        <div className="flex justify-between items-center text-[10px] text-orange-600 italic">
                            <span className="text-slate-400 uppercase font-bold">Total Diskon</span>
                            <span>- {formatCurrency(totalDiscount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center text-[10px] border-y border-slate-200 py-1">
                        <span className="text-slate-900 uppercase">DPP</span>
                        <span>{formatCurrency(dpp)}</span>
                    </div>
                    {taxAmount > 0 && (
                        <div className="flex justify-between items-center text-[10px] text-indigo-600">
                            <span className="text-slate-400 uppercase font-bold">PPN {taxRate}% {isPPN12 ? "(Nilai Lain)" : ""}</span>
                            <span>+ {formatCurrency(taxAmount)}</span>
                        </div>
                    )}
                    <div className="border-t border-slate-300 pt-1 flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-slate-600">Total Faktur</span>
                        <span className="text-sm font-black text-slate-900">{formatCurrency(grandTotal)}</span>
                    </div>
                    {totalCashback > 0 && (
                        <div className="flex justify-between text-xs text-rose-600 border-t border-slate-300 pt-1 italic">
                            <span className="uppercase">Total Cashback</span>
                            <span>- {formatCurrency(totalCashback)}</span>
                        </div>
                    )}
                    <div className="border-t-2 border-slate-900 mt-2 pt-2 flex justify-between items-center bg-white px-2 py-1 shadow-sm border-x">
                        <span className="text-xs font-black uppercase text-primary">TOTAL NETTO PEMBAYARAN</span>
                        <span className="text-xl font-black text-primary">{formatCurrency(netTransfer)}</span>
                    </div>
                </div>
            </div>
        </DocumentLayout>
    );
}
