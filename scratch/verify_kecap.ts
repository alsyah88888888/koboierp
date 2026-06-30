import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyGatsby() {
    console.log("=== VERIFIKASI: SJ-833-18062026-001 vs KB-LPBD-03062026-006 ===\n");

    // 1. Sales Delivery
    const sd = await prisma.salesDelivery.findFirst({
        where: { deliveryNumber: 'SJ-833-18062026-001' },
        include: {
            items: {
                include: { product: { select: { name: true, barcode: true, sku: true } } }
            }
        }
    });

    if (!sd) return console.log("SD not found!");

    console.log("=== PENJUALAN ===");
    console.log(`SJ: ${sd.deliveryNumber} | Invoice: ${sd.invoiceNumber}`);
    console.log(`Buyer: ${sd.buyerName} | Sales: ${sd.salesPerson}`);
    console.log(`Tax Rate: ${sd.taxRate}%`);
    console.log(`Subtotal: Rp ${Number(sd.subtotal).toLocaleString()}`);
    console.log(`TotalDiscount: Rp ${Number(sd.totalDiscount).toLocaleString()}`);
    console.log(`TaxAmount: Rp ${Number(sd.taxAmount).toLocaleString()}`);
    console.log(`GrandTotal: Rp ${Number(sd.grandTotal).toLocaleString()}`);
    console.log();

    // Find Gatsby items
    const gatsbyItems = sd.items.filter(i => i.product.name.includes('Gatsby Water Gloss Soft 100'));
    console.log(`Gatsby Water Gloss Soft 100 items: ${gatsbyItems.length}`);
    let totalQty = 0;
    for (const item of gatsbyItems) {
        console.log(`  - Qty: ${item.quantity} | SalesPrice: Rp ${Number(item.salesPrice).toLocaleString()} | Disc: Rp ${Number(item.discount).toLocaleString()}`);
        totalQty += item.quantity;
    }
    console.log(`  Total merged qty: ${totalQty}`);
    
    const gatsbyPrice = Number(gatsbyItems[0]?.salesPrice || 0);
    console.log(`  Harga jual per unit (DPP): Rp ${gatsbyPrice.toLocaleString()}`);
    console.log(`  Harga jual per unit (+PPN 11%): Rp ${Math.round(gatsbyPrice * 1.11).toLocaleString()}`);

    // 2. Goods Receipt
    console.log("\n=== PEMBELIAN ===");
    const gr = await prisma.goodsReceipt.findFirst({
        where: { receiptNumber: 'KB-LPBD-03062026-006' },
        include: {
            items: {
                include: { product: { select: { name: true, sku: true } } }
            }
        }
    });

    if (!gr) return console.log("GR not found!");

    console.log(`GR: ${gr.receiptNumber}`);
    console.log(`Supplier: ${gr.receivedFrom}`);
    console.log(`Tax Rate: ${gr.taxRate}%`);
    console.log(`Subtotal: Rp ${Number(gr.subtotal).toLocaleString()}`);
    console.log(`TotalDiscount: Rp ${Number(gr.totalDiscount).toLocaleString()}`);
    console.log(`TaxAmount: Rp ${Number(gr.taxAmount).toLocaleString()}`);
    console.log(`GrandTotal: Rp ${Number(gr.grandTotal).toLocaleString()}`);
    console.log(`Cashbacks: ${JSON.stringify(gr.cashbacks)}`);
    console.log();

    const grGatsbyItems = gr.items.filter(i => i.product.name.includes('Gatsby Water Gloss Soft 100'));
    for (const item of grGatsbyItems) {
        console.log(`  ${item.product.name}`);
        console.log(`  Qty: ${item.quantity} | PurchasePrice: Rp ${Number(item.purchasePrice).toLocaleString()} | Disc: Rp ${Number(item.discount).toLocaleString()}`);
    }

    const grPrice = grGatsbyItems.length > 0 ? Number(grGatsbyItems[0].purchasePrice) : 0;
    console.log(`\n  Harga beli per unit (DPP): Rp ${grPrice.toLocaleString()}`);
    console.log(`  Harga beli per unit (+PPN 11%): Rp ${Math.round(grPrice * 1.11).toLocaleString()}`);

    // 3. Masalah
    console.log("\n=== ANALISIS MASALAH ===");
    console.log(`Harga Beli per unit: Rp ${grPrice.toLocaleString()}`);
    console.log(`Harga Jual per unit: Rp ${gatsbyPrice.toLocaleString()}`);
    console.log(`Harga SAMA? ${Math.abs(grPrice - gatsbyPrice) < 1 ? 'YA ✅' : 'TIDAK ❌ (beda ' + Math.abs(grPrice - gatsbyPrice).toLocaleString() + ')'}`);

    // Current report calculation
    const sdTaxRate = Number(sd.taxRate);
    const sdHeaderDiscount = Number(sd.totalDiscount);
    
    // Calculate merged item's proportion of header discount
    const allMergedSubtotal = sd.items.reduce((sum, i) => sum + Number(i.salesPrice || 0) * i.quantity - Number(i.discount || 0), 0);
    const gatsbyLineSubtotal = gatsbyPrice * totalQty;
    const headerDiscountShare = allMergedSubtotal > 0 
        ? Math.round(sdHeaderDiscount * (gatsbyLineSubtotal / allMergedSubtotal)) 
        : 0;

    console.log(`\n📉 Diskon Nota SD: Rp ${sdHeaderDiscount.toLocaleString()}`);
    console.log(`   Proporsi Gatsby (${totalQty} pcs): Rp ${headerDiscountShare.toLocaleString()}`);
    console.log(`   Subtotal item: Rp ${gatsbyLineSubtotal.toLocaleString()}`);
    console.log(`   Subtotal semua: Rp ${allMergedSubtotal.toLocaleString()}`);

    // What report shows
    const dpp = Math.round(gatsbyPrice * totalQty - headerDiscountShare);
    const ppn = Math.round(dpp * sdTaxRate / 100);
    const totalJual = dpp + ppn;
    const hppWithSalesTax = Math.round(grPrice * (1 + sdTaxRate / 100));
    const totalBeli = hppWithSalesTax * totalQty;
    const margin = totalJual - totalBeli;

    console.log(`\n📊 Laporan saat ini (SALAH):`);
    console.log(`   Total Beli: hpp × (1+11%) × qty = ${grPrice.toLocaleString()} × 1.11 × ${totalQty} = Rp ${totalBeli.toLocaleString()}`);
    console.log(`   Total Jual: (sellPrice × qty - diskonNota) × (1+11%) = Rp ${totalJual.toLocaleString()}`);
    console.log(`   Margin: Rp ${margin.toLocaleString()} ← MINUS karena diskon nota hanya di sisi jual!`);
    
    // What it should be (discount applied to BOTH sides or NEITHER)
    console.log(`\n✅ Seharusnya (tanpa distribusi diskon nota):`);
    const correctDpp = Math.round(gatsbyPrice * totalQty);
    const correctPpn = Math.round(correctDpp * sdTaxRate / 100);
    const correctTotalJual = correctDpp + correctPpn;
    const correctMargin = correctTotalJual - totalBeli;
    console.log(`   Total Beli: Rp ${totalBeli.toLocaleString()}`);
    console.log(`   Total Jual: Rp ${correctTotalJual.toLocaleString()}`);
    console.log(`   Margin: Rp ${correctMargin.toLocaleString()}`);

    // Also check if GR has discount too
    console.log(`\n📋 GR Discount: Rp ${Number(gr.totalDiscount).toLocaleString()}`);
    console.log(`   GR Cashbacks: ${JSON.stringify(gr.cashbacks)}`);
}

verifyGatsby()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
