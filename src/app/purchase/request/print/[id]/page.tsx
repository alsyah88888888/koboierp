import { getPrisma } from "@/lib/prisma";

import { DocumentLayout } from "@/components/print/DocumentLayout";
import { format } from "date-fns";
import { formatCurrency, formatNumber, serializeDecimal } from "@/lib/utils";

import { headers } from "next/headers";

export default async function PurchaseRequestPrintPage({ params }: { params: Promise<{ id: string }> }) {
    // Force dynamic rendering to skip build-time DB check
    await headers();
    
    const prisma = getPrisma();
    const { id } = await params;

    const request = await prisma.purchaseRequest.findUnique({
        where: { id },
        include: {
            items: true,
            requestedBy: true,
            approvedBy: true,
            verifiedBy: true
        }
    }).then((res: any) => serializeDecimal(res));

    if (!request) return <div>Data not found</div>;

    const totalEst = Math.round(request.items.reduce((acc: number, item: any) => acc + (Number(item.quantity) * Number(item.estimatedPrice)), 0));

    return (
        <DocumentLayout
            isA5={true}
            title="Pengajuan Pembelian"
            docNumber={request.number}
            date={format(new Date(request.date || request.createdAt), "dd MMM yyyy")}
            headerInfo={
                <div className="grid grid-cols-2 gap-12 text-sm">
                    <div className="space-y-3">
                        <div className="flex gap-4">
                            <span className="font-bold text-slate-400 uppercase w-32">Status:</span>
                            <span className="font-black text-slate-800 uppercase">
                                {request.status === "PENDING" ? "Menunggu Admin" :
                                    request.status === "APPROVED_BY_ADMIN" ? "Menunggu Finance" :
                                        request.status === "VERIFIED_BY_FINANCE" ? "Terverifikasi" : "Ditolak"}
                            </span>
                        </div>
                        <div className="flex gap-4">
                            <span className="font-bold text-slate-400 uppercase w-32">Pemohon:</span>
                            <span className="font-black text-slate-900">{request.requestedBy.name}</span>
                        </div>
                    </div>
                    <div className="space-y-3 text-right">
                        <div className="flex justify-end gap-4">
                            <span className="font-bold text-slate-400 uppercase">Disetujui Oleh:</span>
                            <span className="font-black text-slate-900 uppercase text-[10px]">{request.approvedBy?.name || "-"}</span>
                        </div>
                        <div className="flex justify-end gap-4">
                            <span className="font-bold text-slate-400 uppercase">Diverifikasi Oleh:</span>
                            <span className="font-black text-slate-900 uppercase text-[10px]">{request.verifiedBy?.name || "-"}</span>
                        </div>
                    </div>
                </div>
            }
        >
            <table className="w-full border-collapse border-2 border-slate-900 mb-4">
                <thead>
                    <tr className="bg-slate-50 uppercase text-[10px] font-black">
                        <th className="border-2 border-slate-900 p-2 text-center w-12">No</th>
                        <th className="border-2 border-slate-900 p-2 text-left">Deskripsi Barang / Kebutuhan</th>
                        <th className="border-2 border-slate-900 p-2 text-center w-24">Qty</th>
                        <th className="border-2 border-slate-900 p-2 text-right w-32">Estimasi Harga</th>
                        <th className="border-2 border-slate-900 p-2 text-right w-40">Total Estimasi</th>
                    </tr>
                </thead>
                <tbody className="text-[11px] font-bold">
                    {request.items.map((item: any, idx: number) => (
                        <tr key={idx}>
                            <td className="border-2 border-slate-900 p-3 text-center">{idx + 1}</td>
                            <td className="border-2 border-slate-900 p-3 uppercase">{item.itemName}</td>
                            <td className="border-2 border-slate-900 p-3 text-center">{formatNumber(item.quantity)}</td>
                            <td className="border-2 border-slate-900 p-3 text-right">{formatCurrency(Number(item.estimatedPrice))}</td>
                            <td className="border-2 border-slate-900 p-3 text-right">{formatCurrency(Number(item.quantity) * Number(item.estimatedPrice))}</td>
                        </tr>
                    ))}
                    {[...Array(Math.max(0, 5 - request.items.length))].map((_, i) => (
                        <tr key={i} className="h-8">
                            <td className="border-2 border-slate-900"></td><td className="border-2 border-slate-900"></td>
                            <td className="border-2 border-slate-900"></td><td className="border-2 border-slate-900"></td>
                            <td className="border-2 border-slate-900"></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {request.notes && (
                <div className="mb-4">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Catatan Tambahan:</span>
                    <div className="border border-slate-200 p-3 bg-slate-50 text-[11px] font-medium italic mt-1 rounded">
                        {request.notes}
                    </div>
                </div>
            )}

            <div className="flex justify-end mt-4">
                <div className="w-80 border-2 border-slate-900 p-4 bg-slate-50">
                    <div className="flex justify-between items-center text-primary">
                        <span className="text-xs font-black uppercase">Total Estimasi</span>
                        <span className="text-xl font-black">{formatCurrency(totalEst)}</span>
                    </div>
                </div>
            </div>

            <div className="mt-8 text-[12px] font-bold text-slate-500 italic">
                * Dokumen ini adalah estimasi biaya pengajuan. Nilai sesungguhnya bergantung pada pembelian aktual.
            </div>
        </DocumentLayout>
    );
}
