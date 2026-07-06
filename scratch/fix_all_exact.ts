import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    console.log('Rolling back SalesOrder totals to exact decimals...');
    const salesOrders = await prisma.salesOrder.findMany({ include: { items: true } });
    let soFixed = 0;
    
    for (const so of salesOrders) {
        const subtotal = Math.round(so.items.reduce((acc, i) => acc + (Number(i.quantity) * Number(i.salesPrice)) - Number(i.discount || 0), 0));
        const totalDiscountNominal = Math.round(Number(so.totalDiscount) || 0);
        const dpp = subtotal - totalDiscountNominal;
        const taxRatePercent = Number(so.taxRate) || 0;
        const dppNilaiLain = taxRatePercent > 0 ? Math.round(dpp * 0.916666666666667) : 0;
        const taxAmount = taxRatePercent > 0 ? Math.round(dppNilaiLain * 0.12) : 0;
        const grandTotal = Math.round(dpp + taxAmount);
        
        if (Number(so.subtotal) !== subtotal || Number(so.taxAmount) !== taxAmount || Number(so.grandTotal) !== grandTotal) {
            await prisma.salesOrder.update({
                where: { id: so.id },
                data: { subtotal, taxAmount, grandTotal }
            });
            soFixed++;
        }
    }
    console.log(`Fixed ${soFixed} SalesOrders.`);

    console.log('Rolling back SalesDelivery totals to exact decimals...');
    const salesDeliveries = await prisma.salesDelivery.findMany({ include: { items: true } });
    let sdFixed = 0;
    
    for (const sd of salesDeliveries) {
        const subtotal = Math.round(sd.items.reduce((acc, i) => acc + (Number(i.quantity) * Number(i.salesPrice)) - Number(i.discount || 0), 0));
        const totalDiscountNominal = Math.round(Number(sd.totalDiscount) || 0);
        const dpp = subtotal - totalDiscountNominal;
        const taxRatePercent = Number(sd.taxRate) || 0;
        const dppNilaiLain = taxRatePercent > 0 ? Math.round(dpp * 0.916666666666667) : 0;
        const taxAmount = taxRatePercent > 0 ? Math.round(dppNilaiLain * 0.12) : 0;
        const grandTotal = Math.round(dpp + taxAmount);
        
        if (Number(sd.subtotal) !== subtotal || Number(sd.taxAmount) !== taxAmount || Number(sd.grandTotal) !== grandTotal) {
            await prisma.salesDelivery.update({
                where: { id: sd.id },
                data: { subtotal, taxAmount, grandTotal }
            });
            sdFixed++;
        }
    }
    console.log(`Fixed ${sdFixed} SalesDeliveries.`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
