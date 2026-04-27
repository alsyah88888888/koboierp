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
            title="SURAT JALAN"
            docNumber={delivery.deliveryNumber}
            date={format(new Date(delivery.createdAt), "dd MMM yyyy")}
            headerInfo={
                <div className="flex justify-between items-start gap-4 text-[10px] font-bold uppercase italic border border-slate-900 p-3 bg-slate-50/20">
                    <div className="flex-1 space-y-0.5">
                        <span className="text-[8px] text-slate-400 tracking-widest not-italic block uppercase">PIHAK PENERIMA:</span>
                        <div className="text-slate-800 text-xs leading-tight font-black tabular-nums">{delivery.buyerName}</div>
                    </div>
                    <div className="flex-[1.5] space-y-0.5 border-l border-slate-900 pl-4">
                        <span className="text-[8px] text-slate-400 tracking-widest not-italic block uppercase">ALAMAT PENGIRIMAN:</span>
                        <div className="text-slate-500 leading-tight font-medium normal-case italic text-[9px]">{delivery.recipient}</div>
                    </div>
                    {delivery.salesPerson && (
                        <div className="flex-none space-y-0.5 border-l border-slate-900 pl-4 text-center">
                            <span className="text-[8px] text-slate-400 tracking-widest not-italic block uppercase">SALES:</span>
                            <div className="text-primary text-[10px] font-black italic">{delivery.salesPerson}</div>
                        </div>
                    )}
                    <div className="flex-none space-y-0.5 border-l border-slate-900 pl-4 text-right">
                        <span className="text-[8px] text-slate-400 tracking-widest not-italic block uppercase">KENDARAAN / DRIVER:</span>
                        <div className="text-slate-800 text-[9px] font-black italic uppercase leading-none">{delivery.vehicleNumber || "-"}</div>
                    </div>
                </div>
            }
        >
            <div className="mb-1 text-[9px] font-bold uppercase text-slate-500 italic">Harap diterima barang tersebut di bawah ini dengan baik:</div>
            <table className="w-full border-collapse border border-slate-900 mb-2">
                <thead>
                    <tr className="uppercase text-[9px] font-black bg-slate-50">
                        <th className="border border-slate-900 p-1.5 text-center w-10">NO</th>
                        <th className="border border-slate-900 p-1.5 text-left w-24">BARCODE</th>
                        <th className="border border-slate-900 p-1.5 text-left">NAMA / DESKRIPSI BARANG</th>
                        <th className="border border-slate-900 p-1.5 text-center w-16">QTY</th>
                        <th className="border border-slate-900 p-1.5 text-center w-20">SATUAN</th>
                        <th className="border border-slate-900 p-1.5 text-left w-24">KETERANGAN</th>
                    </tr>
                </thead>
                <tbody className="text-[9px] font-bold text-slate-800">
                    {delivery.items.map((item: any, idx: number) => (
                        <tr key={idx}>
                            <td className="border border-slate-900 p-1.5 text-center font-black">{idx + 1}</td>
                            <td className="border border-slate-900 p-1.5 text-left font-mono tracking-tighter text-[8px]">{item.product.barcode || item.product.sku || "-"}</td>
                            <td className="border border-slate-900 p-1.5 uppercase truncate max-w-[200px]">{item.product.name}</td>
                            <td className="border border-slate-900 p-1.5 text-center font-black">{formatNumber(item.quantity)}</td>
                            <td className="border border-slate-900 p-1.5 text-center uppercase">{(item.uom || item.product.uom || "-").replace(/KARTOON/gi, 'KARTON')}</td>
                            <td className="border border-slate-900 p-1.5"></td>
                        </tr>
                    ))}
                    {[...Array(Math.max(0, 4 - delivery.items.length))].map((_, i) => (
                        <tr key={i} className="h-6">
                            <td className="border border-slate-900"></td><td className="border border-slate-900"></td>
                            <td className="border border-slate-900"></td><td className="border border-slate-900"></td>
                            <td className="border border-slate-900"></td><td className="border border-slate-900"></td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="bg-slate-50 font-black text-[9px]">
                        <td colSpan={3} className="border border-slate-900 p-1.5 text-right uppercase tracking-widest">JUMLAH QTY:</td>
                        <td className="border border-slate-900 p-1.5 text-center">{formatNumber(delivery.items.reduce((acc: number, i: any) => acc + (Number(i.quantity) || 0), 0))}</td>
                        <td colSpan={2} className="border border-slate-900"></td>
                    </tr>
                </tfoot>
            </table>

            <div className="text-[8px] font-bold text-slate-400 italic">
                * Barang yang sudah diterima dalam kondisi baik tidak dapat dikembalikan.
                <br />* Surat Jalan ini merupakan bukti penyerahan barang yang sah dan mengikat.
            </div>
        </DocumentLayout>
    );
}
