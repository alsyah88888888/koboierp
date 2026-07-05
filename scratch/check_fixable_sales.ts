import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    console.log("Mengecek mixed sales deliveries (Penjualan yang isinya gabungan modal PF & BC)...");
    
    const allocations = await prisma.lotAllocation.findMany({
        where: {
            sdItem: { delivery: { isVoid: false } }
        },
        include: {
            sdItem: { include: { delivery: true } },
            lot: { include: { grItem: { include: { receipt: true } } } }
        }
    });

    const deliveryModalMap = new Map<string, Set<string>>();
    let crossCount = 0;
    
    for (const alloc of allocations) {
        if (!alloc.sdItem || !alloc.lot || !alloc.lot.grItem || !alloc.lot.grItem.receipt) continue;
        const deliveryId = alloc.sdItem.delivery.id;
        const modalPerson = alloc.lot.grItem.receipt.salesPerson || 'UNKNOWN';
        if (!deliveryModalMap.has(deliveryId)) {
            deliveryModalMap.set(deliveryId, new Set());
        }
        deliveryModalMap.get(deliveryId)!.add(modalPerson);
        
        const salesPerson = alloc.sdItem.delivery.salesPerson;
        if ((modalPerson === 'PF' && salesPerson === 'BC') || (modalPerson === 'BC' && salesPerson === 'PF')) {
            crossCount++;
        }
    }

    let fixableCount = 0;
    let unfixableCount = 0;

    for (const alloc of allocations) {
        if (!alloc.sdItem || !alloc.lot || !alloc.lot.grItem || !alloc.lot.grItem.receipt) continue;
        const modalPerson = alloc.lot.grItem.receipt.salesPerson || 'UNKNOWN';
        const salesPerson = alloc.sdItem.delivery.salesPerson;
        
        if ((modalPerson === 'PF' && salesPerson === 'BC') || (modalPerson === 'BC' && salesPerson === 'PF')) {
            const deliveryId = alloc.sdItem.delivery.id;
            if (deliveryModalMap.get(deliveryId)!.size === 1) {
                fixableCount++;
            } else {
                unfixableCount++;
            }
        }
    }

    console.log(`Total Baris Transaksi Silang: ${crossCount}`);
    console.log(`Yang 100% AMAN diubah jika Penjualan ikut Pembelian: ${fixableCount}`);
    console.log(`Yang BENTROK (1 Surat Jalan Jual ambil modal dari PF & BC): ${unfixableCount}`);
}

export {};
