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
            items: { include: { product: true } },
            delivery: { include: { warehouse: true } }
        }
    }).then((res: any) => serializeDecimal(res));

    if (!salesReturn) return <div>Data not found</div>;

    return (
        <DocumentLayout
            isA5={true}
            title="RETUR PENJUALAN"
            docNumber={salesReturn.returnNumber}
            date={format(new Date(salesReturn.date || salesReturn.createdAt), "dd MMM yyyy")}
            headerInfo={
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs font-bold">
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                        <span className="text-slate-400 uppercase">Buyer / Customer:</span>
                        <span className="text-slate-900 uppercase tabular-nums">{salesReturn.delivery?.buyerName || "-"}</span>
                        <span className="text-slate-400 uppercase">Ref. Surat Jalan:</span>
                        <span className="text-slate-900 uppercase tabular-nums">{salesReturn.delivery?.deliveryNumber || "-"}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] gap-2 text-right">
                        <span className="text-slate-400 uppercase">Gudang:</span>
                        <span className="text-slate-900 uppercase">{salesReturn.delivery?.warehouse?.name || "-"}</span>
                        <span className="text-slate-400 uppercase">Sales Person:</span>
                        <span className="text-slate-900 font-black italic">{salesReturn.delivery?.salesPerson || "-"}</span>
                    </div>
                </div>
            }
        >
            <div className="mb-4 text-[10px] font-bold uppercase text-slate-500 italic">
                Daftar barang yang dikembalikan oleh pelanggan (Retur):
            </div>
            
            <table className="w-full border-collapse border border-slate-900 mb-6">
                <thead>
                    <tr className="uppercase text-[10px] font-black tracking-widest bg-slate-50">
                        <th className="border border-slate-900 p-2 text-center w-8">No</th>
                        <th className="border border-slate-900 p-2 text-left w-32">Barcode</th>
                        <th className="border border-slate-900 p-2 text-left">Nama Barang</th>
                        <th className="border border-slate-900 p-2 text-center w-20">Qty Retur</th>
                        <th className="border border-slate-900 p-2 text-center w-20">Satuan</th>
                        <th className="border border-slate-900 p-2 text-left">Alasan</th>
                    </tr>
                </thead>
                <tbody className="text-[10px] font-bold text-slate-800">
                    {salesReturn.items.map((item: any, idx: number) => (
                        <tr key={idx}>
                            <td className="border border-slate-900 p-2.5 text-center font-black">{idx + 1}</td>
                            <td className="border border-slate-900 p-2.5 text-left font-mono tracking-tighter text-[9px]">
                                {item.product?.barcode || item.product?.sku || "-"}
                            </td>
                            <td className="border border-slate-900 p-2.5 uppercase">{item.product?.name || "-"}</td>
                            <td className="border border-slate-900 p-2.5 text-center font-black">{formatNumber(item.quantity)}</td>
                            <td className="border border-slate-900 p-2.5 text-center uppercase tracking-tighter">
                                {item.product?.uom || "PCS"}
                            </td>
                            <td className="border border-slate-900 p-2.5 italic text-slate-500">{item.reason || "-"}</td>
                        </tr>
                    ))}
                    {[...Array(Math.max(0, 5 - salesReturn.items.length))].map((_, i) => (
                        <tr key={`empty-${i}`} className="h-8">
                            <td className="border border-slate-900"></td><td className="border border-slate-900"></td>
                            <td className="border border-slate-900"></td><td className="border border-slate-900"></td>
                            <td className="border border-slate-900"></td><td className="border border-slate-900"></td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="bg-slate-50 font-black text-[10px]">
                        <td colSpan={3} className="border border-slate-900 p-2 text-right uppercase tracking-widest">Total QTY Diretur:</td>
                        <td className="border border-slate-900 p-2 text-center">
                            {formatNumber(salesReturn.items.reduce((acc: number, item: any) => acc + (Number(item.quantity) || 0), 0))}
                        </td>
                        <td colSpan={2} className="border border-slate-900"></td>
                    </tr>
                </tfoot>
            </table>

            {salesReturn.notes && (
                <div className="p-4 border-2 border-slate-100 rounded-xl bg-slate-50/50 mb-8">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Catatan Retur:</span>
                    <p className="text-[10px] font-bold text-slate-600 italic whitespace-pre-wrap">{salesReturn.notes}</p>
                </div>
            )}
        </DocumentLayout>
    );
}
