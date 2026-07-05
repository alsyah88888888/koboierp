import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function exportAllCrossTransactions() {
    console.log("Mulai menarik seluruh data transaksi silang dari database...");

    const allocations = await prisma.lotAllocation.findMany({
        where: {
            sdItem: { delivery: { isVoid: false } }
        },
        include: {
            sdItem: {
                include: { delivery: true, product: true }
            },
            lot: {
                include: { grItem: { include: { receipt: true } } }
            }
        }
    });

    let totalPfToBcQty = 0;
    let totalPfToBcRupiah = 0;
    let totalBcToPfQty = 0;
    let totalBcToPfRupiah = 0;

    const csvRows = [
        ["Tipe Silang", "Tgl Beli", "No LPB", "Sales Beli", "Supplier", "Nama Barang", "Qty Silang", "HPP Beli", "Tgl Jual", "No SJ", "Sales Jual", "Customer"]
    ];

    for (const alloc of allocations) {
        if (!alloc.sdItem || !alloc.lot || !alloc.lot.grItem || !alloc.lot.grItem.receipt) continue;

        const salesJual = alloc.sdItem.delivery.salesPerson || 'UNKNOWN';
        const salesBeli = alloc.lot.grItem.receipt.salesPerson || 'UNKNOWN';

        if ((salesBeli === 'PF' && salesJual === 'BC') || (salesBeli === 'BC' && salesJual === 'PF')) {
            const qty = alloc.qty;
            const hpp = Number(alloc.lot.grItem.purchasePrice || alloc.sdItem.product.purchasePrice || 0);
            
            if (salesBeli === 'PF' && salesJual === 'BC') {
                totalPfToBcQty += qty;
                totalPfToBcRupiah += (qty * hpp);
            } else {
                totalBcToPfQty += qty;
                totalBcToPfRupiah += (qty * hpp);
            }

            const formatTgl = (d: any) => d ? new Date(d).toISOString().split('T')[0] : '-';

            csvRows.push([
                `${salesBeli} dipakai ${salesJual}`,
                formatTgl(alloc.lot.grItem.receipt.date),
                alloc.lot.grItem.receipt.receiptNumber,
                salesBeli,
                `"${alloc.lot.grItem.receipt.receivedFrom}"`,
                `"${alloc.sdItem.product.name}"`,
                qty.toString(),
                hpp.toString(),
                formatTgl(alloc.sdItem.delivery.date),
                alloc.sdItem.delivery.deliveryNumber,
                salesJual,
                `"${alloc.sdItem.delivery.buyerName || alloc.sdItem.delivery.recipient}"`
            ]);
        }
    }

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    fs.writeFileSync('transaksi_silang_all.csv', csvContent);

    console.log("\n✅ REKAPITULASI KESELURUHAN WAKTU:");
    console.log("--------------------------------------------------");
    console.log(`1. Modal PF dipakai BC: ${totalPfToBcQty} pcs | Nilai Rp ${totalPfToBcRupiah.toLocaleString('id-ID')}`);
    console.log(`2. Modal BC dipakai PF: ${totalBcToPfQty} pcs | Nilai Rp ${totalBcToPfRupiah.toLocaleString('id-ID')}`);
    console.log("--------------------------------------------------");
    console.log("Detail lengkap telah diekspor ke file: transaksi_silang_all.csv");
}

exportAllCrossTransactions()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
