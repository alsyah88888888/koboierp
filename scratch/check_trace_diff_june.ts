import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const startDate = new Date(2026, 5, 1); // June 2026
    const endDate = new Date(2026, 6, 0, 23, 59, 59, 999);

    const sales = await prisma.salesDelivery.findMany({
        where: { isVoid: false, date: { gte: startDate, lte: endDate } },
        include: { items: true }
    });

    let totalGrandTotal = 0;
    let traceTotal = 0;
    
    for (const sd of sales) {
        totalGrandTotal += Number(sd.grandTotal || 0);

        let deliveryTraceTotal = 0;
        const sdHeaderDiscount = Number(sd.totalDiscount || 0);
        let sdSubtotal = 0;
        for (const item of sd.items) {
             sdSubtotal += (Number(item.salesPrice || 0) * Number(item.quantity || 0) - Number(item.discount || 0));
        }
        
        let taxRate = Number(sd.taxRate || 0);

        for (const item of sd.items) {
             const sellPrice = Number(item.salesPrice || 0);
             const qty = Number(item.quantity || 0);
             const itemDiscount = Number(item.discount || 0);
             
             const sellLineSubtotal = sellPrice * qty - itemDiscount;
             const sdDiscountShare = sdSubtotal > 0 ? Math.round(sdHeaderDiscount * (sellLineSubtotal / sdSubtotal)) : 0;
             const totalSellDiscount = itemDiscount + sdDiscountShare;

             const dpp = Math.round((sellPrice * qty) - totalSellDiscount);
             const ppn = Math.round(dpp * taxRate / 100);
             const totalJual = dpp + ppn;

             deliveryTraceTotal += totalJual;
        }

        traceTotal += deliveryTraceTotal;
    }
    console.log('June GrandTotal:', totalGrandTotal);
    console.log('June TraceTotal:', traceTotal);
}
main().catch(console.error).finally(() => prisma.$disconnect());
