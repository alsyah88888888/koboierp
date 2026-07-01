import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type'); // 'masukan' | 'keluaran'
        const month = searchParams.get('month'); // 1-12
        const year = searchParams.get('year');

        if (!type || !month || !year) {
            return NextResponse.json({ error: 'Missing parameters. Required: type, month, year' }, { status: 400 });
        }

        const prisma = getPrisma();
        const targetMonth = parseInt(month);
        const targetYear = parseInt(year);

        const startDate = new Date(targetYear, targetMonth - 1, 1);
        const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

        let csvContent = '';

        if (type === 'keluaran') {
            // FK = Faktur Keluaran
            // Format: FK, KD_JENIS_TRANSAKSI, FG_PENGGANTI, NOMOR_FAKTUR, MASA_PAJAK, TAHUN_PAJAK, TANGGAL_FAKTUR, NPWP, NAMA, ALAMAT_LENGKAP, JUMLAH_DPP, JUMLAH_PPN, JUMLAH_PPNBM, ID_KETERANGAN_TAMBAHAN, FG_UANG_MUKA, UANG_MUKA_DPP, UANG_MUKA_PPN, UANG_MUKA_PPNBM, REFERENSI
            csvContent += 'FK,KD_JENIS_TRANSAKSI,FG_PENGGANTI,NOMOR_FAKTUR,MASA_PAJAK,TAHUN_PAJAK,TANGGAL_FAKTUR,NPWP,NAMA,ALAMAT_LENGKAP,JUMLAH_DPP,JUMLAH_PPN,JUMLAH_PPNBM,ID_KETERANGAN_TAMBAHAN,FG_UANG_MUKA,UANG_MUKA_DPP,UANG_MUKA_PPN,UANG_MUKA_PPNBM,REFERENSI\n';

            const sales = await prisma.salesDelivery.findMany({
                where: {
                    date: { gte: startDate, lte: endDate },
                    taxAmount: { gt: 0 },
                    isVoid: false
                }
            });

            for (const sale of sales) {
                const date = sale.taxInvoiceDate || sale.date || new Date();
                const dDate = date.getDate().toString().padStart(2, '0');
                const dMonth = (date.getMonth() + 1).toString().padStart(2, '0');
                const dYear = date.getFullYear();
                
                const dpp = Math.round(Number(sale.subtotal) - Number(sale.totalDiscount));
                const ppn = Math.round(Number(sale.taxAmount));
                const fakturNo = sale.taxInvoiceNumber || '0000000000000000';
                
                // Assuming standard transaction (01)
                csvContent += `FK,01,0,${fakturNo},${dMonth},${dYear},${dDate}/${dMonth}/${dYear},000000000000000,${sale.buyerName || 'Konsumen Akhir'},-,${dpp},${ppn},0,,0,0,0,0,${sale.deliveryNumber}\n`;
            }
        } else if (type === 'masukan') {
            // FM = Faktur Masukan
            // Format: FM, KD_JENIS_TRANSAKSI, FG_PENGGANTI, NOMOR_FAKTUR, MASA_PAJAK, TAHUN_PAJAK, TANGGAL_FAKTUR, NPWP, NAMA, ALAMAT_LENGKAP, JUMLAH_DPP, JUMLAH_PPN, JUMLAH_PPNBM, IS_CREDITABLE, DETAIL_TRANSAKSI
            csvContent += 'FM,KD_JENIS_TRANSAKSI,FG_PENGGANTI,NOMOR_FAKTUR,MASA_PAJAK,TAHUN_PAJAK,TANGGAL_FAKTUR,NPWP,NAMA,ALAMAT_LENGKAP,JUMLAH_DPP,JUMLAH_PPN,JUMLAH_PPNBM,IS_CREDITABLE,DETAIL_TRANSAKSI\n';

            const purchases = await prisma.goodsReceipt.findMany({
                where: {
                    date: { gte: startDate, lte: endDate },
                    taxAmount: { gt: 0 },
                    isVoid: false
                }
            });

            for (const p of purchases) {
                const date = p.taxInvoiceDate || p.date || new Date();
                const dDate = date.getDate().toString().padStart(2, '0');
                const dMonth = (date.getMonth() + 1).toString().padStart(2, '0');
                const dYear = date.getFullYear();
                
                const dpp = Math.round(Number(p.subtotal) - Number(p.totalDiscount));
                const ppn = Math.round(Number(p.taxAmount));
                const fakturNo = p.taxInvoiceNumber || '0000000000000000';
                const creditable = p.isTaxCreditable ? '1' : '0';
                
                csvContent += `FM,01,0,${fakturNo},${dMonth},${dYear},${dDate}/${dMonth}/${dYear},000000000000000,${p.receivedFrom},-,${dpp},${ppn},0,${creditable},0\n`;
            }
        } else {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }

        const headers = new Headers();
        headers.set('Content-Type', 'text/csv');
        headers.set('Content-Disposition', `attachment; filename=efaktur_${type}_${month}_${year}.csv`);

        return new NextResponse(csvContent, { status: 200, headers });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
