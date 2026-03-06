import prisma from "@/lib/prisma";
import { DocumentLayout } from "@/components/print/DocumentLayout";
import { format } from "date-fns";
import { formatCurrency, serializeDecimal } from "@/lib/utils";

export default async function ReceiptPrintPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const receipt = await prisma.goodsReceipt.findUnique({
        where: { id },
        include: {
            items: { include: { product: true } },
            warehouse: true
        }
    }).then(res => serializeDecimal(res));

    if (!receipt) return <div>Data not found</div>;

    const subTotal = receipt.items.reduce((acc: number, item: any) => acc + (item.quantity * Number(item.purchasePrice)), 0);

    return (
        <DocumentLayout
            title="Pembelian"
            docNumber={receipt.formNumber}
            date={format(new Date(receipt.date || receipt.createdAt), "dd MMM yyyy")}
            headerInfo={
                <div className="grid grid-cols-[100px_1fr] gap-x-4 gap-y-2 text-xs font-bold">
                    <span className="text-slate-400 uppercase">Supplier:</span>
                    <span className="text-slate-900 uppercase tabular-nums">{receipt.receivedFrom}</span>
                    <span className="text-slate-400 uppercase">No. SJ/Receipt:</span>
                    <span className="text-slate-600 uppercase">{receipt.receiptNumber}</span>
                </div>
            }
        >
            <table className="w-full border-collapse border border-slate-900 mb-4">
                <thead>
                    <tr className="uppercase text-[10px] font-black tracking-widest">
                        <th className="border border-slate-900 p-2 text-center w-8">No</th>
                        <th className="border border-slate-900 p-2 text-left">SKU / Nama Barang</th>
                        <th className="border border-slate-900 p-2 text-left w-32">Barcode</th>
                        <th className="border border-slate-900 p-2 text-center w-20">Qty Masuk</th>
                        <th className="border border-slate-900 p-2 text-center w-20">Satuan</th>
                        <th className="border border-slate-900 p-2 text-right w-32">Harga Beli (@)</th>
                        <th className="border border-slate-900 p-2 text-right w-40">Total</th>
                    </tr>
                </thead>
                <tbody className="text-[10px] font-bold text-slate-800">
                    {receipt.items.map((item: any, idx: number) => (
                        <tr key={idx}>
                            <td className="border border-slate-900 p-2.5 text-center font-black">{idx + 1}</td>
                            <td className="border border-slate-900 p-2.5 uppercase">{item.product.sku} - {item.product.name}</td>
                            <td className="border border-slate-900 p-2.5 text-left font-mono tracking-tighter text-[9px]">{item.product.barcode || item.product.sku || "-"}</td>
                            <td className="border border-slate-900 p-2.5 text-center">{item.quantity}</td>
                            <td className="border border-slate-900 p-2.5 text-center uppercase">{item.uom || item.product.uom || "-"}</td>
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
                <div className="w-80 border border-slate-900 p-3 bg-slate-50">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-slate-400">Total Nilai Barang</span>
                        <span className="text-lg font-black text-slate-900">{formatCurrency(subTotal)}</span>
                    </div>
                </div>
            </div>
        </DocumentLayout>
    );
}
