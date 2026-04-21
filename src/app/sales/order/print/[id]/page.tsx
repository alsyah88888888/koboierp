
import { getPrisma } from "@/lib/prisma";
import { DocumentLayout } from "@/components/print/DocumentLayout";
import { format } from "date-fns";
import { formatCurrency, formatNumber, serializeDecimal } from "@/lib/utils";
import { headers } from "next/headers";

export default async function SalesOrderPrintPage({ params }: { params: Promise<{ id: string }> }) {
    await headers();
    const prisma = getPrisma();
    const { id } = await params;

    const order: any = await prisma.salesOrder.findUnique({
        where: { id },
        include: {
            items: { include: { product: true } },
            warehouse: true
        }
    }).then((res: any) => serializeDecimal(res));

    if (!order) return <div className="p-10 text-center font-black">ORDER NOT FOUND</div>;

    const isDraft = order.status === "DRAFT";
    const totalQty = order.items.reduce((acc: number, item: any) => acc + (Number(item.quantity) || 0), 0);
    const subTotal = Number(order.subtotal || 0);
    const taxAmount = Number(order.taxAmount || 0);
    const grandTotal = Number(order.grandTotal || 0);

    return (
        <DocumentLayout
            isA5={true}
            title={isDraft ? "Proforma Invoice (PI)" : "Sales Order (PO)"}
            docNumber={order.orderNumber}
            date={format(new Date(order.date), "dd MMM yyyy")}
            headerInfo={
                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-start gap-8 text-xs font-bold uppercase italic border-2 border-slate-100 p-4 rounded-xl bg-slate-50/20">
                        <div className="flex-1 space-y-1">
                            <span className="text-[9px] text-slate-400 tracking-widest not-italic block mb-1">PEMESAN (BUYER)</span>
                            <div className="text-slate-900 text-sm leading-tight font-black tabular-nums">{order.buyerName}</div>
                        </div>
                        <div className="flex-[1.5] space-y-1 border-l-2 border-slate-200 pl-8">
                            <span className="text-[9px] text-slate-400 tracking-widest not-italic block mb-1">ALAMAT PENGIRIMAN</span>
                            <div className="text-slate-600 leading-relaxed font-semibold normal-case italic">{order.recipient || "-"}</div>
                        </div>
                        {order.salesPerson && (
                            <div className="flex-none space-y-1 border-l-2 border-slate-200 pl-8 text-center min-w-[60px]">
                                <span className="text-[9px] text-slate-400 tracking-widest not-italic block mb-1">SALES</span>
                                <div className="text-indigo-600 text-sm font-black italic">{order.salesPerson}</div>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                            isDraft ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-emerald-50 text-emerald-600 border-emerald-200"
                        }`}>
                            STATUS: {order.status}
                        </div>
                        <div className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest">
                            Gudang: {order.warehouse?.name}
                        </div>
                    </div>
                </div>
            }
        >
            <table className="w-full border-collapse border border-slate-900">
                <thead>
                    <tr className="uppercase text-[10px] font-black tracking-widest bg-slate-50">
                        <th className="border border-slate-900 p-2 text-center w-8">No</th>
                        <th className="border border-slate-900 p-2 text-left">Nama Barang</th>
                        <th className="border border-slate-900 p-2 text-center w-16">QTY</th>
                        <th className="border border-slate-900 p-2 text-center w-20">SATUAN</th>
                        <th className="border border-slate-900 p-2 text-right w-32">HARGA SATUAN</th>
                        <th className="border border-slate-900 p-2 text-right w-40">TOTAL HARGA</th>
                    </tr>
                </thead>
                <tbody className="text-[10px] font-bold text-slate-800">
                    {order.items.map((item: any, idx: number) => (
                        <tr key={idx}>
                            <td className="border border-slate-900 p-2.5 text-center font-black">{idx + 1}</td>
                            <td className="border border-slate-900 p-2.5 uppercase">{item.product?.name}</td>
                            <td className="border border-slate-900 p-2.5 text-center font-black">{formatNumber(item.quantity)}</td>
                            <td className="border border-slate-900 p-2.5 text-center uppercase tracking-tighter">{item.uom || item.product?.uom || "-"}</td>
                            <td className="border border-slate-900 p-2.5 text-right font-medium">{formatCurrency(Number(item.salesPrice))}</td>
                            <td className="border border-slate-900 p-2.5 text-right font-black">{formatCurrency(Number(item.quantity) * Number(item.salesPrice))}</td>
                        </tr>
                    ))}
                    {[...Array(Math.max(0, 8 - order.items.length))].map((_, i) => (
                        <tr key={`empty-${i}`} className="h-8">
                            <td className="border border-slate-900"></td><td className="border border-slate-900"></td>
                            <td className="border border-slate-900"></td><td className="border border-slate-900"></td>
                            <td className="border border-slate-900"></td><td className="border border-slate-900"></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="flex justify-between items-start mt-6">
                <div className="text-[9px] text-slate-400 italic max-w-[300px]">
                    * Dokumen ini adalah bukti pemesanan resmi.<br />
                    * Barang akan dikirimkan sesuai dengan ketersediaan stok.<br />
                    * Harga sudah termasuk PPN (jika tercantum).
                </div>
                <div className="w-80 space-y-2 border border-slate-900 p-3 font-black bg-slate-50/30">
                    <div className="flex justify-between text-xs pb-2 border-b-2 border-slate-200">
                        <span className="text-slate-400 uppercase">JUMLAH QTY</span>
                        <span className="tabular-nums">{formatNumber(totalQty)}</span>
                    </div>
                    <div className="flex justify-between text-xs pt-1">
                        <span className="text-slate-400 uppercase">Total Brutto</span>
                        <span>{formatCurrency(subTotal)}</span>
                    </div>
                    {taxAmount > 0 && (
                        <div className="flex justify-between text-xs text-indigo-600">
                            <span className="text-slate-400 uppercase">PPN (11%)</span>
                            <span>+ {formatCurrency(taxAmount)}</span>
                        </div>
                    )}
                    <div className="border-t-2 border-slate-900 pt-2 flex justify-between text-lg text-indigo-700">
                        <span className="uppercase">GRAND TOTAL</span>
                        <span>{formatCurrency(grandTotal)}</span>
                    </div>
                </div>
            </div>
        </DocumentLayout>
    );
}
