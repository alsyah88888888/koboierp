import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    console.log('Fixing SalesOrder totals...');
    const salesOrders = await prisma.salesOrder.findMany({ include: { items: true } });
    let soFixed = 0;
    
    for (const so of salesOrders) {
        let newSubtotal = 0;
        for (const item of so.items) {
            const p = Math.round(Number(item.salesPrice) || 0);
            const q = Number(item.quantity) || 0;
            const disc = Math.round(Number(item.discount) || 0);
            newSubtotal += (p * q) - disc;
        }

        const subtotal = newSubtotal;
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

    console.log('Fixing SalesDelivery totals...');
    const salesDeliveries = await prisma.salesDelivery.findMany({ include: { items: true } });
    let sdFixed = 0;
    
    for (const sd of salesDeliveries) {
        let newSubtotal = 0;
        for (const item of sd.items) {
            const p = Math.round(Number(item.salesPrice) || 0);
            const q = Number(item.quantity) || 0;
            const disc = Math.round(Number(item.discount) || 0);
            newSubtotal += (p * q) - disc;
        }

        const subtotal = newSubtotal;
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
