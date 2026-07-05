const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCrossSales() {
    const allocations = await prisma.lotAllocation.findMany({
        include: {
            salesItem: {
                include: {
                    delivery: true,
                    product: true
                }
            },
            receiptItem: {
                include: {
                    receipt: true
                }
            }
        }
    });

    let pfToBc = [];
    let bcToPf = [];

    let pfToBcAmount = 0;
    let bcToPfAmount = 0;

    for (const alloc of allocations) {
        if (!alloc.salesItem || !alloc.receiptItem) continue;

        const seller = alloc.salesItem.delivery.salesPerson; // Divisi Penjual
        const buyer = alloc.receiptItem.receipt.salesPerson; // Divisi Pembeli Gudang

        const qty = alloc.quantity;
        const purchasePrice = alloc.receiptItem.purchasePrice || alloc.salesItem.product.purchasePrice;
        const totalCost = qty * purchasePrice;

        if (seller === 'BC' && buyer === 'PF') {
            pfToBc.push({
                product: alloc.salesItem.product.name,
                qty: qty,
                sj: alloc.salesItem.delivery.deliveryNumber,
                lpb: alloc.receiptItem.receipt.receiptNumber,
                cost: totalCost
            });
            pfToBcAmount += totalCost;
        } else if (seller === 'PF' && buyer === 'BC') {
            bcToPf.push({
                product: alloc.salesItem.product.name,
                qty: qty,
                sj: alloc.salesItem.delivery.deliveryNumber,
                lpb: alloc.receiptItem.receipt.receiptNumber,
                cost: totalCost
            });
            bcToPfAmount += totalCost;
        }
    }

    console.log("=== Beli PF, Jual BC (Barang PF dipakai BC) ===");
    console.log("Total Transaksi:", pfToBc.length);
    console.log("Total Nilai HPP (Modal): Rp", pfToBcAmount.toLocaleString('id-ID'));
    if (pfToBc.length > 0) {
        console.log("Contoh 3 teratas:");
        console.log(pfToBc.slice(0, 3));
    }

    console.log("\n=== Beli BC, Jual PF (Barang BC dipakai PF) ===");
    console.log("Total Transaksi:", bcToPf.length);
    console.log("Total Nilai HPP (Modal): Rp", bcToPfAmount.toLocaleString('id-ID'));
    if (bcToPf.length > 0) {
        console.log("Contoh 3 teratas:");
        console.log(bcToPf.slice(0, 3));
    }
}

checkCrossSales().catch(console.error).finally(() => prisma.$disconnect());
