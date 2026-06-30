import { getPrisma } from "@/lib/prisma";
import { DocumentLayout } from "@/components/print/DocumentLayout";
import { format } from "date-fns";
import { formatNumber, serializeDecimal } from "@/lib/utils";
import { headers } from "next/headers";

export default async function SalesReturnPrintPage({ params }: { params: Promise<{ id: string }> }) {
    // Force dynamic rendering to skip build-time DB check
    await headers();
    
    const prisma = getPrisma();
    const { id } = await params;

    const salesReturn = await prisma.salesReturn.findUnique({
        where: { id },
        include: {
            items: { 
                include: { 
                    product: true,
                    deliveryItem: true // Fetch original sales price
                } 
            },
            delivery: { include: { warehouse: true } }
        }
    }).then((res: any) => serializeDecimal(res));

    if (!salesReturn) return <div>Data not found</div>;

    // Financial calculations
    const subtotal = salesReturn.items.reduce((acc: number, item: any) => {
        const price = Number(item.deliveryItem?.salesPrice || 0);
        const disc = Number(item.deliveryItem?.discount || 0);
        return acc + (item.quantity * (price - disc));
    }, 0);
    const taxRate = Number(salesReturn.delivery?.taxRate || 0);
    const taxAmount = subtotal * taxRate;
    const grandTotal = subtotal + taxAmount;

    return (
        <DocumentLayout
            title="RETUR PENJUALAN"
            docNumber={salesReturn.returnNumber}
            date={format(new Date(salesReturn.date || salesReturn.createdAt), "dd MMM yyyy")}
            headerInfo={
                <div className="flex justify-between items-start gap-4 text-[10px] font-bold uppercase italic border border-slate-900 p-3 bg-slate-50/20">
                    <div className="flex-1 space-y-0.5">
                        <span className="text-[8px] text-slate-400 tracking-widest not-italic block uppercase">BUYER / CUSTOMER:</span>
                        <div className="text-slate-900 text-xs leading-tight font-black tabular-nums">{salesReturn.delivery?.buyerName || "-"}</div>
                    </div>
                    <div className="flex-[1.5] space-y-0.5 border-l border-slate-900 pl-4">
                        <span className="text-[8px] text-slate-400 tracking-widest not-italic block uppercase">REF. SURAT JALAN:</span>
                        <div className="text-slate-900 leading-tight font-semibold normal-case italic text-[9px]">{salesReturn.delivery?.deliveryNumber || "-"}</div>
                    </div>
                    <div className="flex-none space-y-0.5 border-l border-slate-900 pl-4 text-center">
                        <span className="text-[8px] text-slate-400 tracking-widest not-italic block uppercase">GUDANG:</span>
                        <div className="text-slate-900 text-[10px] font-black italic">{salesReturn.delivery?.warehouse?.name || "-"}</div>
                    </div>
                    <div className="flex-none space-y-0.5 border-l border-slate-900 pl-4 text-right">
                        <span className="text-[8px] text-slate-400 tracking-widest not-italic block uppercase">SALES PERSON:</span>
                        <div className="text-slate-900 text-[9px] font-black italic uppercase leading-none">{salesReturn.delivery?.salesPerson || "-"}</div>
                    </div>
                </div>
            }
        >
            <div className="mb-4 text-[10px] font-bold uppercase text-slate-500 italic">
                Daftar barang yang dikembalikan oleh pelanggan (Retur):
            </div>
            
            <table className="w-full border-collapse border border-slate-900 mb-4">
                <thead>
                    <tr className="uppercase text-[9px] font-black tracking-widest bg-slate-50">
                        <th className="border border-slate-900 p-1.5 text-center w-8">NO</th>
                        <th className="border border-slate-900 p-1.5 text-left">NAMA / DESKRIPSI BARANG</th>
                        <th className="border border-slate-900 p-1.5 text-center w-16">QTY</th>
                        <th className="border border-slate-900 p-1.5 text-center w-16">SATUAN</th>
                        <th className="border border-slate-900 p-1.5 text-right w-24">HARGA</th>
                        <th className="border border-slate-900 p-1.5 text-right w-24">TOTAL</th>
                        <th className="border border-slate-900 p-1.5 text-left w-32">ALASAN</th>
                    </tr>
                </thead>
                <tbody className="text-[10px] font-bold text-slate-800">
                    {salesReturn.items.map((item: any, idx: number) => {
                        const price = Number(item.deliveryItem?.salesPrice || 0);
                        const disc = Number(item.deliveryItem?.discount || 0);
                        const netPrice = price - disc;
                        const total = item.quantity * netPrice;
                        
                        return (
                            <tr key={idx}>
                                <td className="border border-slate-900 p-2 text-center font-black">{idx + 1}</td>
                                <td className="border border-slate-900 p-2 uppercase">
                                    {item.product?.name || "-"}
                                    <div className="text-[8px] text-slate-400 font-mono mt-0.5">{item.product?.barcode || item.product?.sku}</div>
                                </td>
                                <td className="border border-slate-900 p-2 text-center font-black">{formatNumber(item.quantity)}</td>
                                <td className="border border-slate-900 p-2 text-center uppercase tracking-tighter">
                                    {item.product?.uom || "PCS"}
                                </td>
                                <td className="border border-slate-900 p-2 text-right tabular-nums">{formatNumber(netPrice)}</td>
                                <td className="border border-slate-900 p-2 text-right tabular-nums">{formatNumber(total)}</td>
                                <td className="border border-slate-900 p-2 italic text-slate-500 text-[9px]">{item.reason || "-"}</td>
                            </tr>
                        );
                    })}
                    {[...Array(Math.max(0, 3 - salesReturn.items.length))].map((_, i) => (
                        <tr key={`empty-${i}`} className="h-8">
                            <td className="border border-slate-900"></td><td className="border border-slate-900"></td>
                            <td className="border border-slate-900"></td><td className="border border-slate-900"></td>
                            <td className="border border-slate-900"></td><td className="border border-slate-900"></td>
                            <td className="border border-slate-900"></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Financial Summary */}
            <div className="flex justify-end mb-6">
                <div className="w-64 space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <span>Subtotal:</span>
                        <span className="text-slate-900 tabular-nums">Rp {formatNumber(subtotal)}</span>
                    </div>
                    {taxAmount > 0 && (
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            <span>PPN {taxRate * 100}%:</span>
                            <span className="text-slate-900 tabular-nums">Rp {formatNumber(taxAmount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-xs font-black text-slate-900 uppercase tracking-widest pt-1 border-t border-slate-900">
                        <span>Grand Total:</span>
                        <span className="tabular-nums">Rp {formatNumber(grandTotal)}</span>
                    </div>
                </div>
            </div>

            {salesReturn.notes && (
                <div className="p-4 border-2 border-slate-100 rounded-xl bg-slate-50/50 mb-8">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Catatan Retur:</span>
                    <p className="text-[10px] font-bold text-slate-600 italic whitespace-pre-wrap">{salesReturn.notes}</p>
                </div>
            )}
        </DocumentLayout>
    );
}
