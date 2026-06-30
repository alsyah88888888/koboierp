import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyGatsbyFixed() {
    console.log("=== VERIFIKASI SETELAH FIX: Gatsby SJ-833 ===\n");

    const sd = await prisma.salesDelivery.findFirst({
        where: { deliveryNumber: 'SJ-833-18062026-001' },
        include: {
            items: {
                include: { product: { select: { name: true, barcode: true } } }
            }
        }
    });
    if (!sd) return;

    const gr = await prisma.goodsReceipt.findFirst({
        where: { receiptNumber: 'KB-LPBD-03062026-006' },
        include: {
            items: {
                where: { product: { name: { contains: 'Gatsby Water Gloss Soft 100' } } },
                include: { product: { select: { name: true } } }
            }
        }
    });
    if (!gr) return;

    const taxRate = Number(sd.taxRate); // 11%
    const sdHeaderDiscount = Number(sd.totalDiscount); // 34,017,297
    const sdSubtotal = sd.items.reduce((sum, i) => sum + Number(i.salesPrice || 0) * i.quantity - Number(i.discount || 0), 0);
    const grHeaderDiscount = Number(gr.totalDiscount); // 17,574,414
    const grSubtotal = Number(gr.subtotal); // 125,531,531

    const gatsbyItems = sd.items.filter(i => i.product.name.includes('Gatsby Water Gloss Soft 100'));
    const totalQty = gatsbyItems.reduce((sum, i) => sum + i.quantity, 0); // 95
    const sellPrice = Number(gatsbyItems[0].salesPrice); // 234,234.234
    const hpp = Number(gr.items[0].purchasePrice); // 234,234.234

    console.log(`=== Data ===`);
    console.log(`Sell Price: ${sellPrice} | Buy Price: ${hpp} | SAMA: ${Math.abs(sellPrice - hpp) < 1}`);
    console.log(`Qty: ${totalQty} | Tax Rate: ${taxRate}%`);
    console.log(`SD Diskon Nota: Rp ${sdHeaderDiscount.toLocaleString()} | SD Subtotal: Rp ${sdSubtotal.toLocaleString()}`);
    console.log(`GR Diskon Nota: Rp ${grHeaderDiscount.toLocaleString()} | GR Subtotal: Rp ${grSubtotal.toLocaleString()}`);

    // SISI JUAL
    const sellLine = sellPrice * totalQty;
    const sdDiscountShare = Math.round(sdHeaderDiscount * (sellLine / sdSubtotal));
    const dppJual = Math.round(sellLine - sdDiscountShare);
    const ppnJual = Math.round(dppJual * taxRate / 100);
    const totalJual = dppJual + ppnJual;

    console.log(`\n=== SISI JUAL ===`);
    console.log(`Subtotal Jual: Rp ${sellLine.toLocaleString()}`);
    console.log(`Diskon Nota Share: Rp ${sdDiscountShare.toLocaleString()}`);
    console.log(`DPP Jual: Rp ${dppJual.toLocaleString()}`);
    console.log(`PPN Jual (${taxRate}%): Rp ${ppnJual.toLocaleString()}`);
    console.log(`Total Jual: Rp ${totalJual.toLocaleString()}`);

    // SISI BELI
    const buyLine = hpp * totalQty;
    const grDiscountShare = Math.round(grHeaderDiscount * (buyLine / grSubtotal));
    const dppBeli = Math.round(buyLine - grDiscountShare);
    const totalBeli = Math.round(dppBeli * (1 + taxRate / 100));
    const hppEffective = Math.round(dppBeli / totalQty * (1 + taxRate / 100));

    console.log(`\n=== SISI BELI ===`);
    console.log(`Subtotal Beli: Rp ${buyLine.toLocaleString()}`);
    console.log(`Diskon Nota GR Share: Rp ${grDiscountShare.toLocaleString()}`);
    console.log(`DPP Beli: Rp ${dppBeli.toLocaleString()}`);
    console.log(`Total Beli (+PPN ${taxRate}%): Rp ${totalBeli.toLocaleString()}`);
    console.log(`Harga Beli Efektif/unit: Rp ${hppEffective.toLocaleString()}`);

    // MARGIN
    const margin = totalJual - totalBeli;
    const marginPct = totalJual > 0 ? (margin / totalJual * 100) : 0;

    console.log(`\n=== MARGIN ===`);
    console.log(`Total Jual: Rp ${totalJual.toLocaleString()}`);
    console.log(`Total Beli: Rp ${totalBeli.toLocaleString()}`);
    console.log(`Margin: Rp ${margin.toLocaleString()} (${marginPct.toFixed(1)}%)`);
    console.log(`\nDiskon nota didistribusi ke KEDUA sisi → perbandingan ADIL ✅`);
}

verifyGatsbyFixed()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
