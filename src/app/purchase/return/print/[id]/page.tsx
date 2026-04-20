import { getPrisma } from "@/lib/prisma";
import { DocumentLayout } from "@/components/print/DocumentLayout";
import { format } from "date-fns";
import { formatNumber, serializeDecimal } from "@/lib/utils";
import { headers } from "next/headers";

export default async function PurchaseReturnPrintPage({ params }: { params: Promise<{ id: string }> }) {
    // Force dynamic rendering to skip build-time DB check
    await headers();
    
    const prisma = getPrisma();
    const { id } = await params;

    const purchaseReturn = await prisma.purchaseReturn.findUnique({
        where: { id },
        include: {
            items: { include: { product: true } },
            receipt: { include: { warehouse: true, items: true } }
        }
    }).then((res: any) => serializeDecimal(res));

    if (!purchaseReturn) return <div>Data not found</div>;

    // Helper to get price for a product in this receipt
    const getPrice = (productId: string) => {
        const receiptItem = purchaseReturn.receipt?.items?.find((i: any) => i.productId === productId);
        return Number(receiptItem?.purchasePrice || 0);
    };

    const totalNilaiRetur = purchaseReturn.items.reduce((acc: number, item: any) => {
        return acc + (item.quantity * getPrice(item.productId));
    }, 0);

    return (
        <DocumentLayout
            title="RETUR PEMBELIAN"
            docNumber={purchaseReturn.returnNumber}
            date={format(new Date(purchaseReturn.date || purchaseReturn.createdAt), "dd MMM yyyy")}
            headerInfo={
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs font-bold">
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                        <span className="text-slate-400 uppercase">Supplier / Vendor:</span>
                        <span className="text-slate-900 uppercase tabular-nums">{purchaseReturn.receipt?.receivedFrom || "-"}</span>
                        <span className="text-slate-400 uppercase">Ref. LPB:</span>
                        <span className="text-slate-900 uppercase tabular-nums">{purchaseReturn.receipt?.receiptNumber || "-"}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] gap-2 text-right">
                        <span className="text-slate-400 uppercase">Gudang:</span>
                        <span className="text-slate-900 uppercase">{purchaseReturn.receipt?.warehouse?.name || "-"}</span>
                        <span className="text-slate-400 uppercase">Status:</span>
                        <span className={`font-black italic ${purchaseReturn.status === 'VERIFIED' ? 'text-emerald-600' : 'text-amber-500'}`}>
                            {purchaseReturn.status}
                        </span>
                    </div>
                </div>
            }
        >
            <div className="mb-4 text-[10px] font-bold uppercase text-slate-500 italic">
                Berikut adalah daftar barang yang dikembalikan kepada supplier/vendor:
            </div>
            
            <table className="w-full border-collapse border border-slate-900 mb-4">
                <thead>
                    <tr className="uppercase text-[9px] font-black tracking-widest bg-slate-50">
                        <th className="border border-slate-900 p-1.5 text-center w-8">No</th>
                        <th className="border border-slate-900 p-1.5 text-left">Nama Barang</th>
                        <th className="border border-slate-900 p-1.5 text-center w-16">Qty</th>
                        <th className="border border-slate-900 p-1.5 text-center w-16">Satuan</th>
                        <th className="border border-slate-900 p-1.5 text-right w-24">Harga Beli</th>
                        <th className="border border-slate-900 p-1.5 text-right w-24">Total</th>
                        <th className="border border-slate-900 p-1.5 text-left w-32">Alasan</th>
                    </tr>
                </thead>
                <tbody className="text-[10px] font-bold text-slate-800">
                    {purchaseReturn.items.map((item: any, idx: number) => {
                        const price = getPrice(item.productId);
                        const total = item.quantity * price;
                        
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
                                <td className="border border-slate-900 p-2 text-right tabular-nums">{formatNumber(price)}</td>
                                <td className="border border-slate-900 p-2 text-right tabular-nums">{formatNumber(total)}</td>
                                <td className="border border-slate-900 p-2 italic text-slate-500 text-[9px]">{item.reason || "-"}</td>
                            </tr>
                        );
                    })}
                    {[...Array(Math.max(0, 3 - purchaseReturn.items.length))].map((_, i) => (
                        <tr key={`empty-${i}`} className="h-8">
                            <td className="border border-slate-900"></td><td className="border border-slate-900"></td>
                            <td className="border border-slate-900"></td><td className="border border-slate-900"></td>
                            <td className="border border-slate-900"></td><td className="border border-slate-900"></td>
                            <td className="border border-slate-900"></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Total Summary */}
            <div className="flex justify-end mb-6">
                <div className="w-64 space-y-1">
                    <div className="flex justify-between text-xs font-black text-slate-900 uppercase tracking-widest pt-1 border-t border-slate-900">
                        <span>Total Nilai Retur:</span>
                        <span className="tabular-nums">Rp {formatNumber(totalNilaiRetur)}</span>
                    </div>
                </div>
            </div>

            {purchaseReturn.notes && (
                <div className="p-4 border-2 border-slate-100 rounded-xl bg-slate-50/50 mb-8">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Catatan Tambahan:</span>
                    <p className="text-[10px] font-bold text-slate-600 italic whitespace-pre-wrap">{purchaseReturn.notes}</p>
                </div>
            )}
        </DocumentLayout>
    );
}
