
import { getPrisma } from "@/lib/prisma";
import { DocumentLayout } from "@/components/print/DocumentLayout";
import { format } from "date-fns";
import { formatCurrency, formatNumber, serializeDecimal } from "@/lib/utils";
import { headers } from "next/headers";

export default async function SalesOrderPrintPage({ params }: { params: Promise<{ id: string }> }) {
    await headers();
    const prisma = getPrisma();
    const { id } = await params;

    const order: any = await (prisma as any).salesOrder.findUnique({
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
            isContinuous={true}
            title={isDraft ? "PROFORMA INVOICE (PI)" : "SALES ORDER (PO)"}
            docNumber={order.orderNumber}
            date={format(new Date(order.date), "dd MMM yyyy")}
            headerInfo={
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-start gap-4 text-[10px] font-bold uppercase italic border border-slate-900 p-3 bg-slate-50/20">
                        <div className="flex-1 space-y-0.5">
                            <span className="text-[8px] text-slate-400 tracking-widest not-italic block">PEMESAN (BUYER):</span>
                            <div className="text-slate-900 text-xs leading-tight font-black tabular-nums">{order.buyerName}</div>
                        </div>
                        <div className="flex-[1.5] space-y-0.5 border-l border-slate-300 pl-4">
                            <span className="text-[8px] text-slate-400 tracking-widest not-italic block">ALAMAT PENGIRIMAN:</span>
                            <div className="text-slate-600 leading-tight font-semibold normal-case italic text-[9px]">{order.recipient || "-"}</div>
                        </div>
                        {order.salesPerson && (
                            <div className="flex-none space-y-0.5 border-l border-slate-300 pl-4 text-center">
                                <span className="text-[8px] text-slate-400 tracking-widest not-italic block">SALES</span>
                                <div className="text-primary text-[10px] font-black italic">{order.salesPerson}</div>
                            </div>
                        )}
                    </div>
                </div>
            }
        >
            <table className="w-full border-collapse border border-slate-900">
                <thead>
                    <tr className="uppercase text-[9px] font-black bg-slate-50">
                        <th className="border border-slate-900 p-1.5 text-center w-8">No</th>
                        <th className="border border-slate-900 p-1.5 text-left">Nama / Deskripsi Barang</th>
                        <th className="border border-slate-900 p-1.5 text-center w-12">QTY</th>
                        <th className="border border-slate-900 p-1.5 text-center w-20">SATUAN</th>
                        <th className="border border-slate-900 p-1.5 text-right w-28">HARGA</th>
                        <th className="border border-slate-900 p-1.5 text-right w-32">TOTAL</th>
                    </tr>
                </thead>
                <tbody className="text-[9px] font-bold text-slate-800">
                    {order.items.map((item: any, idx: number) => (
                        <tr key={idx}>
                            <td className="border border-slate-900 p-1.5 text-center font-black">{idx + 1}</td>
                            <td className="border border-slate-900 p-1.5 uppercase">{item.product?.name}</td>
                            <td className="border border-slate-900 p-1.5 text-center font-black">{formatNumber(item.quantity)}</td>
                            <td className="border border-slate-900 p-1.5 text-center uppercase tracking-tighter">{item.uom || item.product?.uom || "-"}</td>
                            <td className="border border-slate-900 p-1.5 text-right font-medium">{formatCurrency(Number(item.salesPrice))}</td>
                            <td className="border border-slate-900 p-1.5 text-right font-black">{formatCurrency(Number(item.quantity) * Number(item.salesPrice))}</td>
                        </tr>
                    ))}
                    {[...Array(Math.max(0, 4 - order.items.length))].map((_, i) => (
                        <tr key={`empty-${i}`} className="h-6">
                            <td className="border border-slate-900"></td><td className="border border-slate-900"></td>
                            <td className="border border-slate-900"></td><td className="border border-slate-900"></td>
                            <td className="border border-slate-900"></td><td className="border border-slate-900"></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="grid grid-cols-2 mt-4 gap-4">
                <div className="text-[8px] text-slate-400 italic">
                    * Dokumen ini adalah bukti pemesanan resmi yang mengikat.<br />
                    * Barang akan dikirimkan sesuai dengan ketersediaan stok.<br />
                    * Status Order: <span className="text-slate-900 font-black">{order.status}</span>
                </div>
                <div className="space-y-1 border border-slate-900 p-2 font-black bg-slate-50/50">
                    <div className="flex justify-between text-[9px]">
                        <span className="text-slate-400 uppercase">Subtotal Brutto</span>
                        <span>{formatCurrency(subTotal)}</span>
                    </div>
                    {Number(order.totalDiscount) > 0 && (
                        <div className="flex justify-between text-[9px] text-orange-600 italic">
                            <span className="text-slate-400 uppercase">Diskon</span>
                            <span>- {formatCurrency(Number(order.totalDiscount))}</span>
                        </div>
                    )}
                    {taxAmount > 0 && (
                        <div className="flex justify-between text-[9px] text-indigo-600">
                            <span className="text-slate-400 uppercase">PPN</span>
                            <span>+ {formatCurrency(taxAmount)}</span>
                        </div>
                    )}
                    <div className="border-t-2 border-slate-900 mt-1 pt-1 flex justify-between text-sm text-primary font-black bg-white px-2 rounded border-x shadow-sm">
                        <span className="uppercase text-[10px] mt-0.5">TOTAL NETTO PEMBAYARAN</span>
                        <span>{formatCurrency(grandTotal)}</span>
                    </div>
                </div>
            </div>
        </DocumentLayout>
    );
}
