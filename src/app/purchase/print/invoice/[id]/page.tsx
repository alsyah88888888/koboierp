import prisma from "@/lib/prisma";
import { DocumentLayout } from "@/components/print/DocumentLayout";
import { format } from "date-fns";
import { formatCurrency, serializeDecimal } from "@/lib/utils";

export default async function PurchaseInvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const receipt: any = await prisma.goodsReceipt.findUnique({
        where: { id },
        include: {
            items: { include: { product: true } },
            warehouse: true
        }
    }).then(res => serializeDecimal(res));

    if (!receipt) return <div>Data not found</div>;

    const totalQty = receipt.items.reduce((acc: number, item: any) => acc + item.quantity, 0);
    const subTotal = Number(receipt.subtotal || 0);
    const totalDiscount = Number(receipt.totalDiscount || 0);
    const taxAmount = Number(receipt.taxAmount || 0);
    const taxRate = Number(receipt.taxRate || 0);
    const grandTotal = Number(receipt.grandTotal || 0);

    return (
        <DocumentLayout
            isA5={true}
            title="PURCHASE ORDER"
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
                            <td className="border border-slate-900 p-2.5 text-center font-black">{item.quantity}</td>
                            <td className="border border-slate-900 p-2.5 text-center uppercase tracking-tighter">{(item.uom || item.product.uom || "-").replace(/KARTOON/gi, 'KARTON')}</td>
                            <td className="border border-slate-900 p-2.5 text-right font-medium">{formatCurrency(Number(item.purchasePrice))}</td>
                            <td className="border border-slate-900 p-2.5 text-right font-black">{formatCurrency(item.quantity * Number(item.purchasePrice))}</td>
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

            <div className="flex justify-end mt-4">
                <div className="w-80 space-y-2 border border-slate-900 p-3 font-black">
                    <div className="flex justify-between text-xs pb-2 border-b-2 border-slate-200">
                        <span className="text-slate-400 uppercase">JUMLAH QTY</span>
                        <span className="tabular-nums">{totalQty.toLocaleString()}</span>
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
