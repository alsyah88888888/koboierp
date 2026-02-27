import prisma from "@/lib/prisma";
import { DocumentLayout } from "@/components/print/DocumentLayout";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";

export default async function ReceiptPrintPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const receipt = await prisma.goodsReceipt.findUnique({
        where: { id },
        include: {
            items: { include: { product: true } },
            warehouse: true
        }
    });

    if (!receipt) return <div>Data not found</div>;

    const subTotal = receipt.items.reduce((acc, item) => acc + (item.quantity * Number(item.purchasePrice)), 0);

    return (
        <DocumentLayout
            title="Penerimaan Barang"
            docNumber={receipt.formNumber}
            date={format(new Date(receipt.date || receipt.createdAt), "dd MMM yyyy")}
            headerInfo={
                <div className="grid grid-cols-2 gap-12 text-sm">
                    <div className="space-y-3">
                        <div className="flex gap-4">
                            <span className="font-bold text-slate-400 uppercase w-32">Supplier:</span>
                            <span className="font-black text-slate-800">{receipt.receivedFrom}</span>
                        </div>
                        <div className="flex gap-4">
                            <span className="font-bold text-slate-400 uppercase w-32">No. SJ/Receipt:</span>
                            <span className="font-black text-slate-900">{receipt.receiptNumber}</span>
                        </div>
                    </div>
                    <div className="space-y-3 text-right">
                        <div className="flex justify-end gap-4">
                            <span className="font-bold text-slate-400 uppercase">Gudang:</span>
                            <span className="font-black text-slate-900 uppercase">{receipt.warehouse.name}</span>
                        </div>
                        <div className="flex justify-end gap-4">
                            <span className="font-bold text-slate-400 uppercase">Input By:</span>
                            <span className="font-black text-slate-900 uppercase text-[10px]">{receipt.salesPerson || "STAFF"}</span>
                        </div>
                    </div>
                </div>
            }
        >
            <table className="w-full border-collapse border-2 border-slate-900 mb-8">
                <thead>
                    <tr className="bg-slate-50 uppercase text-[10px] font-black">
                        <th className="border-2 border-slate-900 p-2 text-center w-12">No</th>
                        <th className="border-2 border-slate-900 p-2 text-left">SKU / Nama Barang</th>
                        <th className="border-2 border-slate-900 p-2 text-center w-24">Qty Masuk</th>
                        <th className="border-2 border-slate-900 p-2 text-center w-24">Satuan</th>
                        <th className="border-2 border-slate-900 p-2 text-right w-32">Harga Beli (@)</th>
                        <th className="border-2 border-slate-900 p-2 text-right w-40">Total</th>
                    </tr>
                </thead>
                <tbody className="text-[11px] font-bold">
                    {receipt.items.map((item, idx) => (
                        <tr key={idx}>
                            <td className="border-2 border-slate-900 p-3 text-center">{idx + 1}</td>
                            <td className="border-2 border-slate-900 p-3 uppercase">{item.product.sku} - {item.product.name}</td>
                            <td className="border-2 border-slate-900 p-3 text-center">{item.quantity}</td>
                            <td className="border-2 border-slate-900 p-3 text-center uppercase">{item.uom || item.product.uom || "-"}</td>
                            <td className="border-2 border-slate-900 p-3 text-right">{formatCurrency(Number(item.purchasePrice))}</td>
                            <td className="border-2 border-slate-900 p-3 text-right">{formatCurrency(item.quantity * Number(item.purchasePrice))}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="flex justify-end">
                <div className="w-80 border-2 border-slate-900 p-4 bg-slate-50">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-slate-400">Total Nilai Barang</span>
                        <span className="text-xl font-black text-slate-900">{formatCurrency(subTotal)}</span>
                    </div>
                </div>
            </div>
        </DocumentLayout>
    );
}
