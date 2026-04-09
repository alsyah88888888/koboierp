import { getPrisma } from "@/lib/prisma";

import { DocumentLayout } from "@/components/print/DocumentLayout";
import { format } from "date-fns";
import { formatNumber, serializeDecimal } from "@/lib/utils";

import { headers } from "next/headers";

export default async function SJPrintPage({ params }: { params: Promise<{ id: string }> }) {
    // Force dynamic rendering to skip build-time DB check
    await headers();
    
    const prisma = getPrisma();
    const { id } = await params;

    const delivery: any = await prisma.salesDelivery.findUnique({
        where: { id },
        include: {
            items: { include: { product: true } },
            warehouse: true
        }
    }).then((res: any) => serializeDecimal(res));

    if (!delivery) return <div>Data not found</div>;

    return (
        <DocumentLayout
            isA5={true}
            title="Surat Jalan"
            docNumber={delivery.deliveryNumber}
            date={format(new Date(delivery.createdAt), "dd MMM yyyy")}
            headerInfo={
                <div className="flex justify-between items-start gap-8 text-xs font-bold uppercase italic border-2 border-slate-100 p-4 rounded-xl bg-slate-50/30">
                    <div className="flex-1 space-y-1">
                        <span className="text-[9px] text-slate-400 tracking-widest not-italic block mb-1">PIHAK PENERIMA</span>
                        <div className="text-slate-800 text-sm leading-tight font-black tabular-nums">{delivery.buyerName}</div>
                    </div>
                    <div className="flex-[1.5] space-y-1 border-l-2 border-slate-200 pl-8">
                        <span className="text-[9px] text-slate-400 tracking-widest not-italic block mb-1">ALAMAT PENGIRIMAN</span>
                        <div className="text-slate-500 leading-relaxed font-medium normal-case italic">{delivery.recipient}</div>
                    </div>
                    {delivery.salesPerson && (
                        <div className="flex-none space-y-1 border-l-2 border-slate-200 pl-8 text-center min-w-[60px]">
                            <span className="text-[9px] text-slate-400 tracking-widest not-italic block mb-1">SALES</span>
                            <div className="text-primary text-sm font-black italic">{delivery.salesPerson}</div>
                        </div>
                    )}
                    {delivery.vehicleNumber && (
                        <div className="flex-none space-y-1 border-l-2 border-slate-200 pl-8 text-right min-w-[120px]">
                            <span className="text-[9px] text-slate-400 tracking-widest not-italic block mb-1">KENDARAAN / DRIVER</span>
                            <div className="text-slate-800 text-xs font-black italic uppercase leading-none">{delivery.vehicleNumber}</div>
                        </div>
                    )}
                </div>
            }
        >
            <div className="mb-2 text-[10px] font-bold uppercase text-slate-500">Harap diterima barang-barang tersebut di bawah ini dengan baik:</div>
            <table className="w-full border-collapse border border-slate-900 mb-4">
                <thead>
                    <tr className="uppercase text-[10px] font-black bg-slate-50">
                        <th className="border border-slate-900 p-2 text-center w-10">No</th>
                        <th className="border border-slate-900 p-2 text-left w-32">Barcode</th>
                        <th className="border border-slate-900 p-2 text-left">Nama / Deskripsi Barang</th>
                        <th className="border border-slate-900 p-2 text-center w-24">QTY</th>
                        <th className="border border-slate-900 p-2 text-center w-24">SATUAN</th>
                        <th className="border border-slate-900 p-2 text-left w-32">Keterangan</th>
                    </tr>
                </thead>
                <tbody className="text-[10px] font-bold text-slate-800">
                    {delivery.items.map((item: any, idx: number) => (
                        <tr key={idx}>
                            <td className="border border-slate-900 p-2.5 text-center font-black">{idx + 1}</td>
                            <td className="border border-slate-900 p-2.5 text-left font-mono tracking-tighter text-[9px]">{item.product.barcode || item.product.sku || "-"}</td>
                            <td className="border border-slate-900 p-2.5 uppercase">{item.product.name}</td>
                            <td className="border border-slate-900 p-2.5 text-center font-black">{formatNumber(item.quantity)}</td>
                            <td className="border border-slate-900 p-2.5 text-center uppercase">{(item.uom || item.product.uom || "-").replace(/KARTOON/gi, 'KARTON')}</td>
                            <td className="border border-slate-900 p-2.5"></td>
                        </tr>
                    ))}
                    {[...Array(Math.max(0, 5 - delivery.items.length))].map((_, i) => (
                        <tr key={i} className="h-8">
                            <td className="border border-slate-900"></td><td className="border border-slate-900"></td>
                            <td className="border border-slate-900"></td><td className="border border-slate-900"></td>
                            <td className="border border-slate-900"></td><td className="border border-slate-900"></td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="bg-slate-50 font-black text-[10px]">
                        <td colSpan={3} className="border border-slate-900 p-2 text-right uppercase tracking-widest">Jumlah QTY:</td>
                        <td className="border border-slate-900 p-2 text-center">{formatNumber(delivery.items.reduce((acc: number, i: any) => acc + (Number(i.quantity) || 0), 0))}</td>
                        <td colSpan={2} className="border border-slate-900"></td>
                    </tr>
                </tfoot>
            </table>

            <div className="text-[10px] font-bold text-slate-500 italic mt-4">
                * Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.
                <br />* Surat Jalan ini merupakan bukti penyerahan barang yang sah.
            </div>
        </DocumentLayout>
    );
}
