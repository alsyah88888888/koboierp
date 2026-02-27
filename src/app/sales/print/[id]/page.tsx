import prisma from "@/lib/prisma";
import { DocumentLayout } from "@/components/print/DocumentLayout";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const delivery = await prisma.salesDelivery.findUnique({
        where: { id },
        include: {
            items: { include: { product: true } },
            warehouse: true
        }
    });

    if (!delivery) return <div>Data not found</div>;

    const totalQty = delivery.items.reduce((acc, item) => acc + item.quantity, 0);
    const subTotal = delivery.items.reduce((acc, item) => acc + (item.quantity * Number(item.salesPrice)), 0);
    const ppn = subTotal * 0.11;
    const grandTotal = subTotal + ppn;

    return (
        <DocumentLayout
            title="Faktur Penjualan"
            docNumber={delivery.deliveryNumber}
            date={format(new Date(delivery.createdAt), "dd MMM yyyy")}
            headerInfo={
                <div className="grid grid-cols-2 gap-12 text-sm">
                    <div className="space-y-3">
                        <div className="flex gap-4">
                            <span className="font-bold text-slate-400 uppercase w-24">Kepada:</span>
                            <span className="font-black text-slate-900">{delivery.buyerName}</span>
                        </div>
                        <div className="flex gap-4 leading-relaxed">
                            <span className="font-bold text-slate-400 uppercase w-24">Alamat:</span>
                            <span className="font-medium text-slate-600 uppercase text-xs">{delivery.recipient}</span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-end gap-4">
                            <span className="font-bold text-slate-400 uppercase">Jatuh Tempo:</span>
                            <span className="font-black text-slate-900">{format(new Date(delivery.createdAt), "dd MMM yyyy")}</span>
                        </div>
                        <div className="flex justify-end gap-4">
                            <span className="font-bold text-slate-400 uppercase">Gudang:</span>
                            <span className="font-black text-slate-900">{delivery.warehouse.name}</span>
                        </div>
                    </div>
                </div>
            }
        >
            <table className="w-full border-collapse border-2 border-slate-900">
                <thead>
                    <tr className="bg-slate-100 uppercase text-[10px] font-black tracking-widest">
                        <th className="border-2 border-slate-900 p-3 text-center w-12">No</th>
                        <th className="border-2 border-slate-900 p-3 text-left">Deskripsi Barang</th>
                        <th className="border-2 border-slate-900 p-3 text-center w-20">Qty</th>
                        <th className="border-2 border-slate-900 p-3 text-center w-20">Satuan</th>
                        <th className="border-2 border-slate-900 p-3 text-right w-32">Harga Satuan</th>
                        <th className="border-2 border-slate-900 p-3 text-right w-40">Total Harga</th>
                    </tr>
                </thead>
                <tbody className="text-xs font-bold">
                    {delivery.items.map((item, idx) => (
                        <tr key={idx}>
                            <td className="border-2 border-slate-900 p-3 text-center font-black">{idx + 1}</td>
                            <td className="border-2 border-slate-900 p-3 uppercase">{item.product.name}</td>
                            <td className="border-2 border-slate-900 p-3 text-center">{item.quantity}</td>
                            <td className="border-2 border-slate-900 p-3 text-center uppercase tracking-tighter">{item.uom || item.product.uom || "-"}</td>
                            <td className="border-2 border-slate-900 p-3 text-right">{formatCurrency(Number(item.salesPrice))}</td>
                            <td className="border-2 border-slate-900 p-3 text-right font-black">{formatCurrency(item.quantity * Number(item.salesPrice))}</td>
                        </tr>
                    ))}
                    {/* Fill empty space if low amount of items */}
                    {[...Array(Math.max(0, 5 - delivery.items.length))].map((_, i) => (
                        <tr key={`empty-${i}`} className="h-10">
                            <td className="border-2 border-slate-900"></td><td className="border-2 border-slate-900"></td>
                            <td className="border-2 border-slate-900"></td><td className="border-2 border-slate-900"></td>
                            <td className="border-2 border-slate-900"></td><td className="border-2 border-slate-900"></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="flex justify-end mt-4">
                <div className="w-80 space-y-2 border-2 border-slate-900 p-4 font-black">
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
        </DocumentLayout>
    );
}
