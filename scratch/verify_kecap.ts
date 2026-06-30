import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyInvoice() {
    console.log("=== VERIFIKASI: SJ-209-12062026-012 / KB-TRN-12062026-001 ===\n");

    const sd = await prisma.salesDelivery.findFirst({
        where: { deliveryNumber: 'SJ-209-12062026-012' },
        include: {
            items: {
                include: {
                    product: { select: { name: true, barcode: true, purchasePrice: true } }
                }
            }
        }
    });

    if (!sd) {
        console.log("❌ Not found!");
        return;
    }

    console.log(`Delivery: ${sd.deliveryNumber}`);
    console.log(`Invoice: ${sd.invoiceNumber}`);
    console.log(`Buyer: ${sd.buyerName}`);
    console.log(`Date: ${sd.date?.toISOString().split('T')[0]}`);
    console.log(`Tax Rate: ${sd.taxRate}%`);
    console.log(`Subtotal: ${sd.subtotal}`);
    console.log(`Total Discount: ${sd.totalDiscount}`);
    console.log(`Tax Amount: ${sd.taxAmount}`);
    console.log(`Grand Total: ${sd.grandTotal}`);
    console.log(`\nItems (${sd.items.length}):`);

    let subtotalCalc = 0;
    for (const item of sd.items) {
        const salesPrice = Number(item.salesPrice || 0);
        const discount = Number(item.discount || 0);
        const lineTotal = salesPrice * item.quantity;
        const lineTotalAfterDisc = lineTotal - discount;
        subtotalCalc += lineTotalAfterDisc;

        console.log(`\n  ${item.product.name} (${item.product.barcode})`);
        console.log(`    Qty: ${item.quantity}`);
        console.log(`    Sales Price/unit: Rp ${salesPrice.toLocaleString()}`);
        console.log(`    Discount: Rp ${discount.toLocaleString()}`);
        console.log(`    Line Total (qty × price): Rp ${lineTotal.toLocaleString()}`);
        console.log(`    Line Total - Disc: Rp ${lineTotalAfterDisc.toLocaleString()}`);
        
        // With PPN
        const taxRate = Number(sd.taxRate || 0);
        const ppn = Math.round(lineTotalAfterDisc * taxRate / 100);
        const totalWithPpn = Math.round(lineTotalAfterDisc) + ppn;
        console.log(`    PPN (${taxRate}%): Rp ${ppn.toLocaleString()}`);
        console.log(`    Total + PPN: Rp ${totalWithPpn.toLocaleString()}`);

        // Price with tax per unit
        const priceWithTax = Math.round(salesPrice * (1 + taxRate / 100));
        const totalViaUnitPrice = priceWithTax * item.quantity;
        console.log(`    Harga/unit + PPN: Rp ${priceWithTax.toLocaleString()}`);
        console.log(`    Total via (unit+PPN)*qty: Rp ${totalViaUnitPrice.toLocaleString()}`);
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Subtotal (calculated from items): Rp ${subtotalCalc.toLocaleString()}`);
    console.log(`Subtotal (from DB): Rp ${Number(sd.subtotal).toLocaleString()}`);
    const taxRate = Number(sd.taxRate || 0);
    const ppnCalc = Math.round(subtotalCalc * taxRate / 100);
    const grandCalc = Math.round(subtotalCalc) + ppnCalc;
    console.log(`PPN ${taxRate}% (calculated): Rp ${ppnCalc.toLocaleString()}`);
    console.log(`Grand Total (calculated): Rp ${grandCalc.toLocaleString()}`);
    console.log(`Grand Total (from DB): Rp ${Number(sd.grandTotal).toLocaleString()}`);

    // Check: what gives 69,144,000?
    console.log(`\n=== EXPECTED 69,144,000 CHECK ===`);
    console.log(`268 × 258,000 = ${(268 * 258000).toLocaleString()}`);
    console.log(`268 × 232,432.432 = ${(268 * 232432.432).toLocaleString()}`);
    console.log(`268 × 232,432.432 × 1.11 = ${Math.round(268 * 232432.432 * 1.11).toLocaleString()}`);
}

verifyInvoice()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
