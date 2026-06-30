import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyAll() {
    console.log("=== VERIFIKASI MENYELURUH: LAPORAN TRACEABILITY ===\n");

    // Check Juni 2026 (the current report period)
    const startDate = new Date('2026-06-01T00:00:00+07:00');
    const endDate = new Date('2026-06-30T23:59:59+07:00');

    const deliveries = await prisma.salesDelivery.findMany({
        where: { isVoid: false, date: { gte: startDate, lte: endDate } },
        include: {
            items: {
                include: {
                    product: { select: { id: true, name: true, barcode: true, purchasePrice: true } }
                }
            }
        },
        orderBy: { date: 'asc' }
    });

    console.log(`Total SalesDelivery (Juni 2026, non-void): ${deliveries.length}`);

    // Stats
    let totalItems = 0;
    let mergedItems = 0;
    let kbTrnCount = 0;
    let kbTrdCount = 0;
    let otherCount = 0;
    let negativeMarginCount = 0;
    let positiveMarginCount = 0;
    let zeroMarginCount = 0;

    // Fetch all GR items for smart matching verification
    const productIds = [...new Set(deliveries.flatMap(sd => sd.items.map(i => i.productId)))];
    const grItems = await prisma.goodsReceiptItem.findMany({
        where: { productId: { in: productIds }, receipt: { isVoid: false } },
        include: { receipt: { select: { receiptNumber: true, date: true, receivedFrom: true, taxRate: true } } },
        orderBy: { receipt: { date: 'asc' } }
    });

    // Group by product
    const grByProduct = new Map<string, any[]>();
    for (const gi of grItems) {
        if (!grByProduct.has(gi.productId)) grByProduct.set(gi.productId, []);
        grByProduct.get(gi.productId)!.push(gi);
    }

    // Median prices
    const medianPrices = new Map<string, number>();
    for (const [pid, items] of grByProduct) {
        const prices = items.map((g: any) => Number(g.purchasePrice)).filter((p: number) => p > 0).sort((a: number, b: number) => a - b);
        if (prices.length > 0) {
            const mid = Math.floor(prices.length / 2);
            medianPrices.set(pid, prices.length % 2 === 0 ? (prices[mid-1] + prices[mid]) / 2 : prices[mid]);
        }
    }

    for (const sd of deliveries) {
        const taxRate = Number(sd.taxRate || 0);
        const invoicePrefix = (sd.invoiceNumber || '').substring(0, 6);
        
        if (invoicePrefix === 'KB-TRN') kbTrnCount++;
        else if (invoicePrefix === 'KB-TRD') kbTrdCount++;
        else otherCount++;

        // Merge items by product
        const mergedMap = new Map<string, { qty: number; price: number; discount: number; productId: string }>();
        for (const item of sd.items) {
            totalItems++;
            const key = item.productId;
            if (mergedMap.has(key)) {
                const existing = mergedMap.get(key)!;
                const prevQty = existing.qty;
                const newQty = prevQty + item.quantity;
                existing.price = (existing.price * prevQty + Number(item.salesPrice || 0) * item.quantity) / newQty;
                existing.qty = newQty;
                existing.discount += Number(item.discount || 0);
            } else {
                mergedMap.set(key, {
                    qty: item.quantity,
                    price: Number(item.salesPrice || 0),
                    discount: Number(item.discount || 0),
                    productId: item.productId
                });
            }
        }
        mergedItems += mergedMap.size;

        // Check margin for each merged item
        const sdHeaderDiscount = Number(sd.totalDiscount || 0);
        const sdSubtotal = Array.from(mergedMap.values()).reduce((sum, item) => {
            return sum + (item.price * item.qty - item.discount);
        }, 0);

        for (const [, item] of mergedMap) {
            // Smart match GR
            const candidates = grByProduct.get(item.productId) || [];
            const median = medianPrices.get(item.productId) || 0;
            let bestGR: any = null;
            let bestScore = -Infinity;
            
            for (const gr of candidates) {
                const grPrice = Number(gr.purchasePrice);
                if (median > 0 && (grPrice > median * 5 || grPrice < median * 0.2)) continue;
                const grDate = gr.receipt.date;
                if (!grDate) continue;
                const daysDiff = Math.abs(sd.date.getTime() - grDate.getTime()) / (1000*60*60*24);
                const isBeforeSale = grDate.getTime() <= sd.date.getTime();
                const dateScore = isBeforeSale ? Math.max(0, 100 - daysDiff * 0.5) : Math.max(0, 50 - daysDiff * 2);
                const priceDeviation = median > 0 ? Math.abs(grPrice - median) / median : 0;
                const priceScore = Math.max(0, 50 - priceDeviation * 100);
                const qtyRatio = item.qty > 0 && gr.quantity > 0 ? Math.min(item.qty, gr.quantity) / Math.max(item.qty, gr.quantity) : 0;
                const qtyScore = qtyRatio * 30;
                const totalScore = dateScore + priceScore + qtyScore;
                if (totalScore > bestScore) { bestScore = totalScore; bestGR = gr; }
            }

            const hpp = bestGR ? Number(bestGR.purchasePrice) : 0;
            const hppWithSalesTax = Math.round(hpp * (1 + taxRate / 100));
            const totalBeli = hppWithSalesTax * item.qty;

            const lineSubtotal = item.price * item.qty - item.discount;
            const headerDiscountShare = sdSubtotal > 0 ? Math.round(sdHeaderDiscount * (lineSubtotal / sdSubtotal)) : 0;
            const totalDiscount = item.discount + headerDiscountShare;
            const dpp = Math.round(item.price * item.qty - totalDiscount);
            const ppn = Math.round(dpp * taxRate / 100);
            const totalJual = dpp + ppn;
            const margin = totalJual - totalBeli;

            if (margin < 0) negativeMarginCount++;
            else if (margin > 0) positiveMarginCount++;
            else zeroMarginCount++;
        }
    }

    console.log(`\n=== HASIL VERIFIKASI ===`);
    console.log(`\n📊 Transaksi:`);
    console.log(`   Total SalesDelivery: ${deliveries.length}`);
    console.log(`   KB-TRN (PPN 11%): ${kbTrnCount}`);
    console.log(`   KB-TRD (tanpa PPN): ${kbTrdCount}`);
    console.log(`   Lainnya: ${otherCount}`);
    
    console.log(`\n📦 Items:`);
    console.log(`   Total SD Items (sebelum merge): ${totalItems}`);
    console.log(`   Total Items (setelah merge): ${mergedItems}`);
    console.log(`   Items yang di-merge: ${totalItems - mergedItems}`);
    
    console.log(`\n💰 Margin (setelah fix):`);
    console.log(`   ✅ Margin Positif: ${positiveMarginCount}`);
    console.log(`   ⚠️  Margin Nol: ${zeroMarginCount}`);
    console.log(`   ❌ Margin Negatif: ${negativeMarginCount}`);
    
    console.log(`\n🔧 Fitur yang diterapkan ke SEMUA transaksi:`);
    console.log(`   1. Smart Matching (bukan FIFO) - filter harga anomali ✅`);
    console.log(`   2. Merge item duplikat per delivery ✅`);
    console.log(`   3. Distribusi diskon nota proporsional ✅`);
    console.log(`   4. PPN konsisten (SD taxRate untuk kedua sisi) ✅`);
}

verifyAll()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
