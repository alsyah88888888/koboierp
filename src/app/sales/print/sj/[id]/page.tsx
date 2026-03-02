import prisma from "@/lib/prisma";
import { DocumentLayout } from "@/components/print/DocumentLayout";
import { format } from "date-fns";
import { serializeDecimal } from "@/lib/utils";

export default async function SJPrintPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const delivery: any = await prisma.salesDelivery.findUnique({
        where: { id },
        include: {
            items: { include: { product: true } },
            warehouse: true
        }
    }).then(res => serializeDecimal(res));

    if (!delivery) return <div>Data not found</div>;

    return (
        <DocumentLayout
            title="Surat Jalan"
            docNumber={delivery.deliveryNumber}
            date={format(new Date(delivery.createdAt), "dd MMM yyyy")}
            isA5={true}
            headerInfo={
                <div className="grid grid-cols-2 gap-12 text-sm italic">
                    <div className="space-y-3">
                        <div className="flex gap-4">
                            <span className="font-bold text-slate-400 uppercase w-24">Penerima:</span>
                            <span className="font-black text-slate-800 uppercase text-xs">{delivery.buyerName}</span>
                        </div>
                        <div className="flex gap-4 leading-relaxed">
                            <span className="font-bold text-slate-400 uppercase w-24">Alamat Kirim:</span>
                            <span className="font-medium text-slate-500 uppercase text-[10px]">{delivery.recipient}</span>
                        </div>
                    </div>
                </div>
            }
        >
            <div className="mb-2 text-[10px] font-black uppercase text-slate-400">Harap diterima barang-barang tersebut di bawah ini dengan baik:</div>
            <table className="w-full border-collapse border-2 border-slate-900 mb-4">
                <thead>
                    <tr className="bg-slate-50 uppercase text-[10px] font-black">
                        <th className="border-2 border-slate-900 p-1.5 text-center w-12">No</th>
                        <th className="border-2 border-slate-900 p-1.5 text-left">Nama / Deskripsi Barang</th>
                        <th className="border-2 border-slate-900 p-1.5 text-center w-24">Banyaknya</th>
                        <th className="border-2 border-slate-900 p-1.5 text-center w-24">Satuan</th>
                        <th className="border-2 border-slate-900 p-1.5 text-left">Keterangan</th>
                    </tr>
                </thead>
                <tbody className="text-[11px] font-bold">
                    {delivery.items.map((item: any, idx: number) => (
                        <tr key={idx}>
                            <td className="border-2 border-slate-900 p-2 text-center">{idx + 1}</td>
                            <td className="border-2 border-slate-900 p-2 uppercase">{item.product.name}</td>
                            <td className="border-2 border-slate-900 p-2 text-center">{item.quantity}</td>
                            <td className="border-2 border-slate-900 p-2 text-center uppercase tracking-tighter">{item.uom || item.product.uom || "-"}</td>
                            <td className="border-2 border-slate-900 p-2"></td>
                        </tr>
                    ))}
                    {[...Array(Math.max(0, 5 - delivery.items.length))].map((_, i) => (
                        <tr key={i} className="h-6">
                            <td className="border-2 border-slate-900"></td><td className="border-2 border-slate-900"></td>
                            <td className="border-2 border-slate-900"></td><td className="border-2 border-slate-900"></td>
                            <td className="border-2 border-slate-900"></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="text-[10px] font-bold text-slate-500 italic mt-4">
                * Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.
                <br />* Surat Jalan ini merupakan bukti penyerahan barang yang sah.
            </div>
        </DocumentLayout>
    );
}
