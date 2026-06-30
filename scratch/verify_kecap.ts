import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAnomalyGR() {
    console.log("=== CHECK: KB-LPBD-20260324-001 ===\n");

    const gr = await prisma.goodsReceipt.findFirst({
        where: { receiptNumber: 'KB-LPBD-20260324-001' },
        include: {
            items: {
                include: {
                    product: { select: { name: true, sku: true, barcode: true } }
                }
            }
        }
    });

    if (!gr) {
        console.log("GR not found!");
        return;
    }

    console.log(`GR: ${gr.receiptNumber}`);
    console.log(`Date: ${gr.date?.toISOString().split('T')[0]}`);
    console.log(`Supplier: ${gr.receivedFrom}`);
    console.log(`Subtotal: ${gr.subtotal}`);
    console.log(`TotalDiscount: ${gr.totalDiscount}`);
    console.log(`TaxRate: ${gr.taxRate}%`);
    console.log(`TaxAmount: ${gr.taxAmount}`);
    console.log(`GrandTotal: ${gr.grandTotal}`);
    console.log(`IsVoid: ${gr.isVoid}`);
    console.log(`Notes: ${gr.notes}`);
    console.log(`Cashbacks: ${JSON.stringify(gr.cashbacks)}`);
    console.log(`\nItems (${gr.items.length}):`);
    
    for (const item of gr.items) {
        console.log(`  ${item.product.name} (${item.product.barcode})`);
        console.log(`    Qty: ${item.quantity} | Price: ${item.purchasePrice} | Discount: ${item.discount}`);
        console.log(`    UOM: ${item.uom}`);
        const totalPerItem = Number(item.quantity) * Number(item.purchasePrice);
        console.log(`    Total (qty * price): Rp ${totalPerItem.toLocaleString()}`);
    }

    // Compare with average price from other GRs
    console.log("\n=== PRICE COMPARISON: Abc Kecap Pet 600Ml ===");
    const kecapProduct = await prisma.product.findFirst({ where: { barcode: '711844110021' } });
    if (kecapProduct) {
        const otherGRItems = await prisma.goodsReceiptItem.findMany({
            where: { 
                productId: kecapProduct.id,
                receipt: { isVoid: false }
            },
            include: {
                receipt: { select: { receiptNumber: true, date: true, receivedFrom: true } }
            },
            orderBy: { receipt: { date: 'asc' } }
        });
        
        console.log("\nAll purchase prices:");
        for (const gi of otherGRItems) {
            const price = Number(gi.purchasePrice);
            const isAnomaly = price < 100000; // Harga di bawah 100K suspicious untuk Kecap 600ml
            console.log(`  ${isAnomaly ? '⚠️' : '✅'} ${gi.receipt.receiptNumber} | ${gi.receipt.date?.toISOString().split('T')[0]} | ${gi.receipt.receivedFrom.substring(0, 30)} | Qty: ${gi.quantity} | Price: Rp ${price.toLocaleString()}`);
        }
    }
}

checkAnomalyGR()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
