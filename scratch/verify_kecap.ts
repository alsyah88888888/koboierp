import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifySJ833() {
    console.log("=== VERIFIKASI: SJ-833-18062026-001 ===\n");

    const sd = await prisma.salesDelivery.findFirst({
        where: { deliveryNumber: 'SJ-833-18062026-001' },
        include: {
            items: {
                include: {
                    product: { select: { name: true, barcode: true } }
                }
            }
        }
    });

    if (!sd) return console.log("Not found!");

    const taxRate = Number(sd.taxRate || 0);
    console.log(`Delivery: ${sd.deliveryNumber}`);
    console.log(`Buyer: ${sd.buyerName}`);
    console.log(`Subtotal: ${sd.subtotal}`);
    console.log(`TotalDiscount: ${sd.totalDiscount}`);
    console.log(`TaxRate: ${sd.taxRate}%`);
    console.log(`TaxAmount: ${sd.taxAmount}`);
    console.log(`GrandTotal: ${sd.grandTotal}`);
    console.log(`\nItems (${sd.items.length}):\n`);

    let calcSubtotal = 0;
    let calcDiscount = 0;
    for (const item of sd.items) {
        const price = Number(item.salesPrice || 0);
        const disc = Number(item.discount || 0);
        const lineTotal = price * item.quantity;
        calcSubtotal += lineTotal;
        calcDiscount += disc;
        console.log(`  ${item.product.name.substring(0, 50)}`);
        console.log(`    Qty: ${item.quantity} | Price: ${price.toLocaleString()} | Disc: ${disc.toLocaleString()} | Line: ${lineTotal.toLocaleString()}`);
    }

    console.log(`\n--- Calculated ---`);
    console.log(`Subtotal: ${calcSubtotal.toLocaleString()}`);
    console.log(`Total Discount: ${calcDiscount.toLocaleString()}`);
    const dpp = calcSubtotal - calcDiscount;
    console.log(`DPP (Subtotal - Discount): ${dpp.toLocaleString()}`);
    const ppn = Math.round(dpp * taxRate / 100);
    console.log(`PPN ${taxRate}%: ${ppn.toLocaleString()}`);
    console.log(`Grand Total: ${(dpp + ppn).toLocaleString()}`);
    console.log(`DB Grand Total: ${Number(sd.grandTotal).toLocaleString()}`);

    // Also show what happens if we compute correctly with totalDiscount from SD header
    const dbSubtotal = Number(sd.subtotal);
    const dbDiscount = Number(sd.totalDiscount);
    const headerDpp = dbSubtotal - dbDiscount;
    const headerPpn = Math.round(headerDpp * taxRate / 100);
    console.log(`\n--- Using DB Header Values ---`);
    console.log(`DPP: ${headerDpp.toLocaleString()}`);
    console.log(`PPN: ${headerPpn.toLocaleString()}`);
    console.log(`Grand: ${(headerDpp + headerPpn).toLocaleString()}`);
}

verifySJ833()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
