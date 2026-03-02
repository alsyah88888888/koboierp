import prisma from "@/lib/prisma";
import { DocumentLayout } from "@/components/print/DocumentLayout";
import { format } from "date-fns";
import { formatCurrency, serializeDecimal } from "@/lib/utils";

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const delivery: any = await prisma.salesDelivery.findUnique({
        where: { id },
        include: {
            items: { include: { product: true } },
            warehouse: true
        }
    }).then(res => serializeDecimal(res));

    if (!delivery) return <div>Data not found</div>;

    const totalQty = delivery.items.reduce((acc: number, item: any) => acc + item.quantity, 0);
    const subTotal = delivery.items.reduce((acc: number, item: any) => acc + (item.quantity * Number(item.salesPrice)), 0);
    const ppn = subTotal * 0.11;
    const grandTotal = subTotal + ppn;

    return (
        <DocumentLayout
            isA5={true}
            title="Faktur Penjualan"
            docNumber={delivery.deliveryNumber}
            date={format(new Date(delivery.createdAt), "dd MMM yyyy")}
            headerInfo={
                <div className="grid grid-cols-[100px_1fr] gap-x-4 gap-y-2 text-xs italic font-bold">
                    <span className="text-slate-400 uppercase">Kepada:</span>
                    <span className="text-slate-900 uppercase tabular-nums">{delivery.buyerName}</span>
                    <span className="text-slate-400 uppercase">Alamat:</span>
                    <span className="text-slate-600 uppercase">{delivery.recipient}</span>
                </div>
            }
        >
            <table className="w-full border-collapse border border-slate-900">
                <thead>
                    <tr className="uppercase text-[10px] font-black tracking-widest">
                        <th className="border border-slate-900 p-2 text-center w-8">No</th>
                        <th className="border border-slate-900 p-2 text-left">Deskripsi Barang</th>
                        <th className="border border-slate-900 p-2 text-left w-32">Barcode</th>
                        <th className="border border-slate-900 p-2 text-center w-16">Qty</th>
                        <th className="border border-slate-900 p-2 text-center w-20">Satuan</th>
                        <th className="border border-slate-900 p-2 text-right w-32">Harga Satuan</th>
                        <th className="border border-slate-900 p-2 text-right w-40">Total Harga</th>
                    </tr>
                </thead>
                <tbody className="text-[10px] font-bold text-slate-800">
                    {delivery.items.map((item: any, idx: number) => (
                        <tr key={idx}>
                            <td className="border border-slate-900 p-2.5 text-center font-black">{idx + 1}</td>
                            <td className="border border-slate-900 p-2.5 uppercase">{item.product.name}</td>
                            <td className="border border-slate-900 p-2.5 text-left font-mono tracking-tighter text-[9px]">{item.product.barcode || item.product.sku || "-"}</td>
                            <td className="border border-slate-900 p-2.5 text-center">{item.quantity}</td>
                            <td className="border border-slate-900 p-2.5 text-center uppercase tracking-tighter">{item.uom || item.product.uom || "-"}</td>
                            <td className="border border-slate-900 p-2.5 text-right font-medium">{formatCurrency(Number(item.salesPrice))}</td>
                            <td className="border border-slate-900 p-2.5 text-right font-black">{formatCurrency(item.quantity * Number(item.salesPrice))}</td>
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
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-400">TOTAL BRUTTO</span>
                        <span>{formatCurrency(subTotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-400">PPN 11%</span>
                        <span>{formatCurrency(ppn)}</span>
                    </div>
                    <div className="border-t-2 border-slate-900 pt-2 flex justify-between text-lg text-primary">
                        <span>TOTAL NETTO</span>
                        <span>{formatCurrency(grandTotal)}</span>
                    </div>
                </div>
            </div>
        </DocumentLayout >
    );
}
