
import { getPrisma } from "@/lib/prisma";
import { format } from "date-fns";
import { formatNumber, serializeDecimal } from "@/lib/utils";
import { headers } from "next/headers";
import { DotMatrixLayout } from "@/components/print/DotMatrixLayout";

export default async function SJDotPrintPage({ params }: { params: Promise<{ id: string }> }) {
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

    if (!delivery) return <div>Data tidak ditemukan</div>;

    return (
        <DotMatrixLayout 
            title="SURAT JALAN" 
            documentNumber={delivery.deliveryNumber}
        >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2mm', marginBottom: '2mm' }}>
                <div style={{ fontSize: '8.5pt' }}>
                    <table style={{ width: '100%' }}>
                        <tr>
                            <td style={{ width: '80px', fontWeight: 'bold' }}>PENERIMA</td>
                            <td>: {delivery.buyerName}</td>
                        </tr>
                        <tr>
                            <td style={{ fontWeight: 'bold' }}>ALAMAT</td>
                            <td style={{ fontSize: '8pt', fontStyle: 'italic' }}>: {delivery.recipient}</td>
                        </tr>
                    </table>
                </div>
                <div style={{ fontSize: '9pt' }}>
                    <table style={{ width: '100%' }}>
                        <tr>
                            <td style={{ width: '80px', fontWeight: 'bold' }}>TANGGAL</td>
                            <td>: {format(new Date(delivery.createdAt), "dd/MM/yyyy")}</td>
                        </tr>
                        <tr>
                            <td style={{ fontWeight: 'bold' }}>SALES/KIRIM</td>
                            <td>: {delivery.salesPerson || "-"} / {delivery.vehicleNumber || "-"}</td>
                        </tr>
                        <tr>
                            <td style={{ fontWeight: 'bold' }}>GUDANG</td>
                            <td>: {delivery.warehouse.name}</td>
                        </tr>
                    </table>
                </div>
            </div>

            <table className="dot-matrix-table">
                <thead>
                    <tr>
                        <th style={{ width: '30px' }}>NO</th>
                        <th style={{ width: '100px' }}>SKU</th>
                        <th>NAMA BARANG</th>
                        <th style={{ width: '60px', textAlign: 'center' }}>QTY</th>
                        <th style={{ width: '80px', textAlign: 'center' }}>SATUAN</th>
                    </tr>
                </thead>
                <tbody>
                    {delivery.items.map((item: any, idx: number) => (
                        <tr key={idx}>
                            <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                            <td>{item.product.sku}</td>
                            <td>{item.product.name}</td>
                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{formatNumber(item.quantity)}</td>
                            <td style={{ textAlign: 'center', textTransform: 'uppercase' }}>{item.uom || item.product.uom}</td>
                        </tr>
                    ))}
                    {/* Baris kosong untuk menjaga tinggi form agar tetap konsisten */}
                    {[...Array(Math.max(0, 5 - delivery.items.length))].map((_, i) => (
                        <tr key={i} style={{ height: '6mm' }}>
                            <td>&nbsp;</td><td></td><td></td><td></td><td></td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan={3} style={{ borderTop: '1px solid black', textAlign: 'right', fontWeight: 'bold', padding: '2mm' }}>TOTAL QTY :</td>
                        <td style={{ borderTop: '1px solid black', textAlign: 'center', fontWeight: 'bold', padding: '2mm' }}>
                            {formatNumber(delivery.items.reduce((acc: number, i: any) => acc + (Number(i.quantity) || 0), 0))}
                        </td>
                        <td style={{ borderTop: '1px solid black' }}></td>
                    </tr>
                </tfoot>
            </table>

            <div style={{ marginTop: '5mm', fontSize: '8pt', border: '1px solid #000', padding: '2mm' }}>
                KETERANGAN: Harap barang diperiksa dengan teliti. Barang yang sudah diterima tidak dapat ditukar/dikembalikan.
            </div>
        </DotMatrixLayout>
    );
}
