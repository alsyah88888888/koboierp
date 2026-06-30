import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifySunlight() {
    console.log("=== VERIFIKASI: SJ-507-12062026-011 + Sunlight 610ml ===\n");

    // Find the SalesDelivery
    const sd = await prisma.salesDelivery.findFirst({
        where: { deliveryNumber: 'SJ-507-12062026-011' },
        include: {
            items: {
                include: {
                    product: { select: { name: true, barcode: true, purchasePrice: true } }
                }
            }
        }
    });

    if (!sd) return console.log("SD not found!");

    console.log(`📄 ${sd.deliveryNumber}`);
    console.log(`   Buyer: ${sd.buyerName}`);
    console.log(`   Invoice: ${sd.invoiceNumber}`);
    console.log(`   Date: ${sd.date?.toISOString().split('T')[0]}`);
    console.log(`   Tax Rate: ${sd.taxRate}%`);
    console.log(`   SalesPerson: ${sd.salesPerson}`);
    console.log(`   Grand Total: ${sd.grandTotal}`);
    console.log();

    // Find Sunlight items
    for (const item of sd.items) {
        if (item.product.barcode === '8999999042974' || item.product.name.includes('Sunlight')) {
            console.log(`🔍 ${item.product.name} (${item.product.barcode})`);
            console.log(`   Qty: ${item.quantity}`);
            console.log(`   Sales Price (DPP/unit): Rp ${Number(item.salesPrice).toLocaleString()}`);
            console.log(`   Discount: Rp ${Number(item.discount).toLocaleString()}`);
            console.log(`   Product.purchasePrice: Rp ${Number(item.product.purchasePrice).toLocaleString()}`);
        }
    }

    // Find GR KB-LPBD-25052026-003
    console.log("\n=== GR: KB-LPBD-25052026-003 ===");
    const gr = await prisma.goodsReceipt.findFirst({
        where: { receiptNumber: 'KB-LPBD-25052026-003' },
        include: {
            items: {
                where: { product: { barcode: '8999999042974' } },
                include: { product: { select: { name: true } } }
            }
        }
    });

    if (gr) {
        console.log(`   Supplier: ${gr.receivedFrom}`);
        console.log(`   Tax Rate: ${gr.taxRate}%`);
        for (const item of gr.items) {
            console.log(`   ${item.product.name}: Qty ${item.quantity} × Rp ${Number(item.purchasePrice).toLocaleString()}`);
        }
    }

    // Calculate what the report currently shows vs what's correct
    console.log("\n=== CALCULATION BREAKDOWN ===");
    const buyPrice = 83900; // per unit
    const sellPrice = 87000; // per unit (this is what user says)
    const qty = 150;
    const grTaxRate = 11; // GR tax rate
    const sdTaxRate = Number(sd?.taxRate || 0); // SD tax rate

    console.log(`\nCurrent Report (WRONG):`);
    console.log(`   Harga Beli = ${buyPrice} × (1 + ${grTaxRate}%) = Rp ${Math.round(buyPrice * (1 + grTaxRate / 100)).toLocaleString()} (WITH PPN)`);
    console.log(`   Total Beli = ${Math.round(buyPrice * (1 + grTaxRate / 100))} × ${qty} = Rp ${Math.round(buyPrice * (1 + grTaxRate / 100) * qty).toLocaleString()}`);
    console.log(`   Harga Jual = Rp ${sellPrice.toLocaleString()} (SD taxRate = ${sdTaxRate}%, so +${sdTaxRate}%)`);
    const sellWithTax = Math.round(sellPrice * (1 + sdTaxRate / 100));
    console.log(`   Total Jual = ${sellWithTax} × ${qty} = Rp ${(sellWithTax * qty).toLocaleString()}`);
    console.log(`   Margin = ${sellWithTax * qty} - ${Math.round(buyPrice * (1 + grTaxRate / 100)) * qty} = Rp ${(sellWithTax * qty - Math.round(buyPrice * (1 + grTaxRate / 100)) * qty).toLocaleString()}`);

    console.log(`\nCorrect Calculation (DPP vs DPP):`);
    console.log(`   Harga Beli = Rp ${buyPrice.toLocaleString()} (DPP, tanpa PPN)`);
    console.log(`   Total Beli = ${buyPrice} × ${qty} = Rp ${(buyPrice * qty).toLocaleString()}`);
    console.log(`   Harga Jual = Rp ${sellPrice.toLocaleString()} (DPP, tanpa PPN)`);
    console.log(`   Total Jual = ${sellPrice} × ${qty} = Rp ${(sellPrice * qty).toLocaleString()}`);
    console.log(`   Margin = ${sellPrice * qty} - ${buyPrice * qty} = Rp ${((sellPrice - buyPrice) * qty).toLocaleString()} ✅ POSITIF`);
    console.log(`   Margin % = ${(((sellPrice - buyPrice) / sellPrice) * 100).toFixed(1)}%`);
}

verifySunlight()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
