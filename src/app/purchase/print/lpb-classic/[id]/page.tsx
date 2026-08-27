import { getPrisma } from "@/lib/prisma";
import { format } from "date-fns";
import { formatNumber, serializeDecimal } from "@/lib/utils";
import { headers } from "next/headers";

export default async function LPBClassicPrintPage({ params }: { params: Promise<{ id: string }> }) {
    await headers();
    
    const prisma = getPrisma();
    const { id } = await params;

    const receipt: any = await prisma.goodsReceipt.findUnique({
        where: { id },
        include: {
            items: { include: { product: true } }
        }
    }).then((res: any) => serializeDecimal(res));

    if (!receipt) return <div>Data not found</div>;

    const groupedItemsMap = receipt.items.reduce((acc: any, item: any) => {
        const key = item.productId || item.product?.id || item.product?.name;
        if (!acc[key]) {
            acc[key] = { ...item, quantity: Number(item.quantity) };
        } else {
            acc[key].quantity += Number(item.quantity);
        }
        return acc;
    }, {});
    const groupedItems = Object.values(groupedItemsMap) as any[];

    // Ensure we have at least 15 rows for the classic look
    const displayItems = [...groupedItems];
    const minRows = 15;
    while (displayItems.length < minRows) {
        displayItems.push({ empty: true });
    }

    return (
        <div className="w-full bg-white text-black font-sans p-8 print:p-0 print:m-0 mx-auto" style={{ maxWidth: '210mm', minHeight: '297mm' }}>
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page { size: A4; margin: 10mm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .no-print { display: none !important; }
                }
                .classic-table th, .classic-table td {
                    border: 1px solid black;
                    padding: 4px 8px;
                }
            `}} />
            
            <div className="no-print mb-8 flex justify-end">
                <button onClick={() => window.print()} className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    Print Laporan Penerimaan
                </button>
            </div>

            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                        <img src="/logo.png" alt="Logo" className="h-16 object-contain grayscale" />
                        <div>
                            <div className="font-bold text-xl uppercase">PT. KOLA BORASI INDONESIA</div>
                            <div className="text-xs">Trading & Distribution</div>
                        </div>
                    </div>
                    <div className="font-bold text-lg underline decoration-2 underline-offset-4 tracking-widest mt-2">
                        BUKTI PENERIMAAN BARANG
                    </div>
                </div>
                
                <div className="flex-1 max-w-[350px]">
                    <div className="grid grid-cols-[100px_1fr] gap-y-2 text-sm">
                        <div className="font-semibold">No. Terima</div>
                        <div className="border-b border-black border-dotted font-mono text-xs pt-1">{receipt.receiptNumber}</div>
                        
                        <div className="font-semibold">No. PO</div>
                        <div className="border-b border-black border-dotted font-mono text-xs pt-1">{receipt.formNumber || '....................'}</div>
                        
                        <div className="font-semibold">Jakarta,</div>
                        <div className="border-b border-black border-dotted pt-1">{format(new Date(receipt.createdAt), "dd-MM-yyyy")}</div>
                        
                        <div className="font-semibold mt-2">Dari Supplier,</div>
                        <div className="border-b border-black border-dotted mt-2 font-bold uppercase">{receipt.receivedFrom}</div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <table className="w-full border-collapse border border-black classic-table mb-4">
                <thead>
                    <tr>
                        <th rowSpan={2} className="w-12 text-center align-middle font-semibold text-sm">NO</th>
                        <th rowSpan={2} className="text-left align-middle font-semibold text-sm">NAMA BARANG</th>
                        <th colSpan={2} className="text-center font-semibold text-sm">JUMLAH</th>
                        <th rowSpan={2} className="w-48 text-center align-middle font-semibold text-sm">KETERANGAN</th>
                    </tr>
                    <tr>
                        <th className="w-24 text-center font-semibold text-xs border-t-0">PACKING</th>
                        <th className="w-24 text-center font-semibold text-xs border-t-0">UNIT</th>
                    </tr>
                </thead>
                <tbody>
                    {displayItems.map((item, idx) => (
                        <tr key={idx} className="h-7">
                            <td className="text-center text-sm">{!item.empty ? idx + 1 : ''}</td>
                            <td className="text-sm font-semibold uppercase">{!item.empty ? item.product.name : ''}</td>
                            <td className="text-center text-sm font-bold">{!item.empty ? formatNumber(item.quantity) : ''}</td>
                            <td className="text-center text-sm uppercase">{!item.empty ? (item.uom || item.product.uom || 'KARTON') : ''}</td>
                            <td></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Reference */}
            <div className="mb-4 text-sm font-semibold flex gap-2">
                Reference : <span className="border-b border-black border-dotted flex-1 max-w-[300px] inline-block">{receipt.notes || '..............................'}</span>
            </div>

            {/* Signatures */}
            <table className="w-full border-collapse border border-black classic-table text-center text-sm">
                <thead>
                    <tr>
                        <th className="w-1/3 font-normal py-2 text-sm">Diterima oleh :</th>
                        <th className="w-1/3 font-normal py-2 text-sm">Diperiksa oleh :</th>
                        <th className="w-1/3 font-normal py-2 text-sm">Pengirim / Supir :</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="h-28 align-bottom text-left px-2 py-1 text-xs">Tgl.</td>
                        <td className="h-28 align-bottom text-left px-2 py-1 text-xs">Tgl.</td>
                        <td className="h-28 align-bottom text-left px-2 py-1 text-xs">Tgl.</td>
                    </tr>
                </tbody>
            </table>

            {/* Footer */}
            <div className="flex justify-between items-end mt-2 text-xs italic font-semibold">
                <div>Asli : Keuangan, Copy 1 : Gudang, Copy 3 : Supplier</div>
                <div className="text-[10px] not-italic font-normal">F-PROC-004, Rev : 01, 01 Januari 2010</div>
            </div>
        </div>
    );
}
