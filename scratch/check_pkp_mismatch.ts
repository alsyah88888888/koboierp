import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkPkpMismatch() {
    console.log("Analyzing PKP and Non-PKP mismatches...");

    // Get all goods receipts and their items
    const receipts = await prisma.goodsReceipt.findMany({
        where: { isVoid: false },
        include: { items: { include: { product: true } } }
    });

    // Get all sales deliveries and their items
    const deliveries = await prisma.salesDelivery.findMany({
        where: { isVoid: false },
        include: { items: { include: { product: true } } }
    });

    const productPurchaseTaxStatus = new Map(); // productId -> { pkp: boolean, nonPkp: boolean }
    const productSalesTaxStatus = new Map(); // productId -> { pkp: boolean, nonPkp: boolean }

    // Analyze Purchases
    for (const r of receipts) {
        const isPkp = r.taxAmount && Number(r.taxAmount) > 0;
        for (const item of r.items) {
            const pId = item.productId;
            if (!productPurchaseTaxStatus.has(pId)) {
                productPurchaseTaxStatus.set(pId, { pkp: false, nonPkp: false, name: item.product.name });
            }
            const status = productPurchaseTaxStatus.get(pId);
            if (isPkp) status.pkp = true;
            else status.nonPkp = true;
        }
    }

    // Analyze Sales
    for (const d of deliveries) {
        const isPkp = d.taxAmount && Number(d.taxAmount) > 0;
        for (const item of d.items) {
            const pId = item.productId;
            if (!productSalesTaxStatus.has(pId)) {
                productSalesTaxStatus.set(pId, { pkp: false, nonPkp: false, name: item.product.name });
            }
            const status = productSalesTaxStatus.get(pId);
            if (isPkp) status.pkp = true;
            else status.nonPkp = true;
        }
    }

    const boughtPkpSoldNonPkp = [];
    const boughtNonPkpSoldPkp = [];

    // Compare
    for (const [pId, pStatus] of productPurchaseTaxStatus.entries()) {
        const sStatus = productSalesTaxStatus.get(pId);
        if (!sStatus) continue; // never sold

        // If bought PKP but sold Non-PKP
        if (pStatus.pkp && sStatus.nonPkp) {
            boughtPkpSoldNonPkp.push(pStatus.name);
        }
        
        // If bought Non-PKP but sold PKP
        if (pStatus.nonPkp && sStatus.pkp) {
            boughtNonPkpSoldPkp.push(pStatus.name);
        }
    }

    console.log("\n=== KASUS 1: DIBELI DENGAN PKP TAPI DIJUAL NON-PKP ===");
    console.log(`Ada ${boughtPkpSoldNonPkp.length} barang.`);
    if (boughtPkpSoldNonPkp.length > 0) {
        console.log(boughtPkpSoldNonPkp.slice(0, 10).join("\n"));
        if (boughtPkpSoldNonPkp.length > 10) console.log("...dan lainnya.");
    }

    console.log("\n=== KASUS 2: DIBELI NON-PKP TAPI DIJUAL DENGAN PKP ===");
    console.log(`Ada ${boughtNonPkpSoldPkp.length} barang.`);
    if (boughtNonPkpSoldPkp.length > 0) {
        console.log(boughtNonPkpSoldPkp.slice(0, 10).join("\n"));
        if (boughtNonPkpSoldPkp.length > 10) console.log("...dan lainnya.");
    }
}

checkPkpMismatch().catch(console.error).finally(() => prisma.$disconnect());
