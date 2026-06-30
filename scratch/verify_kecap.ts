import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyAllJune() {
    console.log("=== VERIFIKASI FINAL: SEMUA TRANSAKSI JUNI 2026 ===\n");

    const startDate = new Date('2026-06-01T00:00:00+07:00');
    const endDate = new Date('2026-06-30T23:59:59+07:00');

    const deliveries = await prisma.salesDelivery.findMany({
        where: { isVoid: false, date: { gte: startDate, lte: endDate } },
        include: {
            items: { include: { product: { select: { id: true, name: true, barcode: true, purchasePrice: true } } } }
        },
        orderBy: { date: 'asc' }
    });

    // Fetch all GR items
    const productIds = [...new Set(deliveries.flatMap(sd => sd.items.map(i => i.productId)))];
    const grItems = await prisma.goodsReceiptItem.findMany({
        where: { productId: { in: productIds }, receipt: { isVoid: false } },
        include: { receipt: { select: { receiptNumber: true, date: true, receivedFrom: true, taxRate: true, totalDiscount: true, subtotal: true } } },
        orderBy: { receipt: { date: 'asc' } }
    });

    const grByProduct = new Map<string, any[]>();
    for (const gi of grItems) {
        if (!grByProduct.has(gi.productId)) grByProduct.set(gi.productId, []);
        grByProduct.get(gi.productId)!.push(gi);
    }

    const medianPrices = new Map<string, number>();
    for (const [pid, items] of grByProduct) {
        const prices = items.map((g: any) => Number(g.purchasePrice)).filter((p: number) => p > 0).sort((a: number, b: number) => a - b);
        if (prices.length > 0) {
            const mid = Math.floor(prices.length / 2);
            medianPrices.set(pid, prices.length % 2 === 0 ? (prices[mid-1] + prices[mid]) / 2 : prices[mid]);
        }
    }

    function findBestGR(productId: string, saleDate: Date, saleQty: number) {
        const candidates = grByProduct.get(productId);
        if (!candidates || candidates.length === 0) return null;
        const median = medianPrices.get(productId) || 0;
        let bestScore = -Infinity, bestGR: any = null;
        for (const gr of candidates) {
            const grPrice = Number(gr.purchasePrice);
            if (median > 0 && (grPrice > median * 5 || grPrice < median * 0.2)) continue;
            const grDate = gr.receipt.date;
            if (!grDate) continue;
            const daysDiff = Math.abs(saleDate.getTime() - grDate.getTime()) / (1000*60*60*24);
            const isBeforeSale = grDate.getTime() <= saleDate.getTime();
            const dateScore = isBeforeSale ? Math.max(0, 100 - daysDiff * 0.5) : Math.max(0, 50 - daysDiff * 2);
            const priceDeviation = median > 0 ? Math.abs(grPrice - median) / median : 0;
            const priceScore = Math.max(0, 50 - priceDeviation * 100);
            const qtyRatio = saleQty > 0 && gr.quantity > 0 ? Math.min(saleQty, gr.quantity) / Math.max(saleQty, gr.quantity) : 0;
            const totalScore = dateScore + priceScore + qtyRatio * 30;
            if (totalScore > bestScore) { bestScore = totalScore; bestGR = gr; }
        }
        return bestGR;
    }

    let totalItems = 0, mergedCount = 0, rawCount = 0;
    let positiveMargin = 0, zeroMargin = 0, negativeMargin = 0;
    let kbTrn = 0, kbTrd = 0;
    let withSdDiscount = 0, withGrDiscount = 0;

    for (const sd of deliveries) {
        const taxRate = Number(sd.taxRate || 0);
        const inv = sd.invoiceNumber || '';
        if (inv.startsWith('KB-TRN')) kbTrn++;
        else if (inv.startsWith('KB-TRD')) kbTrd++;

        const sdHeaderDiscount = Number(sd.totalDiscount || 0);
        if (sdHeaderDiscount > 0) withSdDiscount++;

        // Merge items
        const mergedMap = new Map<string, any>();
        for (const item of sd.items) {
            rawCount++;
            const key = item.productId;
            if (mergedMap.has(key)) {
                const e = mergedMap.get(key)!;
                const prevQty = e.quantity;
                e.quantity += item.quantity;
                e.salesPrice = (Number(e.salesPrice) * prevQty + Number(item.salesPrice || 0) * item.quantity) / e.quantity;
                e.discount = Number(e.discount) + Number(item.discount || 0);
            } else {
                mergedMap.set(key, { ...item, quantity: item.quantity, salesPrice: Number(item.salesPrice || 0), discount: Number(item.discount || 0), productId: item.productId, product: item.product });
            }
        }

        const mergedItems = Array.from(mergedMap.values());
        mergedCount += mergedItems.length;

        const sdSubtotal = mergedItems.reduce((s: number, i: any) => s + i.salesPrice * i.quantity - i.discount, 0);

        for (const item of mergedItems) {
            totalItems++;
            const sellPrice = Number(item.salesPrice);
            const qty = item.quantity;
            const itemDisc = Number(item.discount || 0);

            // SD discount share
            const sellLine = sellPrice * qty - itemDisc;
            const sdDiscShare = sdSubtotal > 0 ? Math.round(sdHeaderDiscount * (sellLine / sdSubtotal)) : 0;

            // Best GR
            const bestGR = findBestGR(item.productId, sd.date, qty);
            const hpp = bestGR ? Number(bestGR.purchasePrice) : 0;

            // GR discount share
            const grHeaderDiscount = Number(bestGR?.receipt?.totalDiscount || 0);
            const grSubtotal = Number(bestGR?.receipt?.subtotal || 0);
            if (grHeaderDiscount > 0) withGrDiscount++;
            const buyLine = hpp * qty;
            const grDiscShare = grSubtotal > 0 ? Math.round(grHeaderDiscount * (buyLine / grSubtotal)) : 0;

            // DPP
            const dppJual = Math.round(sellPrice * qty - itemDisc - sdDiscShare);
            const dppBeli = Math.round(hpp * qty - grDiscShare);

            // Total with PPN
            const totalJual = Math.round(dppJual * (1 + taxRate / 100));
            const totalBeli = Math.round(dppBeli * (1 + taxRate / 100));

            const margin = totalJual - totalBeli;
            if (margin > 0) positiveMargin++;
            else if (margin < 0) negativeMargin++;
            else zeroMargin++;
        }
    }

    console.log(`📊 Transaksi Juni 2026:`);
    console.log(`   Total SalesDelivery: ${deliveries.length}`);
    console.log(`   KB-TRN (PPN 11%): ${kbTrn}`);
    console.log(`   KB-TRD (tanpa PPN): ${kbTrd}`);
    console.log(`\n📦 Items:`);
    console.log(`   Raw items: ${rawCount}`);
    console.log(`   Merged items: ${mergedCount} (${rawCount - mergedCount} digabung)`);
    console.log(`\n💰 Diskon Nota:`);
    console.log(`   SD dengan diskon nota: ${withSdDiscount} delivery`);
    console.log(`   GR dengan diskon nota: ${withGrDiscount} items matched`);
    console.log(`\n📈 Margin (SEMUA transaksi):`);
    console.log(`   ✅ Positif: ${positiveMargin}`);
    console.log(`   ⚪ Nol: ${zeroMargin}`);
    console.log(`   ❌ Negatif: ${negativeMargin}`);
    console.log(`\n🔧 Fitur aktif untuk SEMUA transaksi:`);
    console.log(`   1. Smart Matching (filter anomali harga) ✅`);
    console.log(`   2. Merge item duplikat per delivery ✅`);
    console.log(`   3. Diskon nota SD → distribusi ke sisi JUAL ✅`);
    console.log(`   4. Diskon nota GR → distribusi ke sisi BELI ✅`);
    console.log(`   5. PPN konsisten (SD taxRate untuk kedua sisi) ✅`);
}

verifyAllJune()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
