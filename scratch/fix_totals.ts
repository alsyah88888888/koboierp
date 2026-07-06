import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    console.log('Fixing SalesOrder grandTotals...');
    const salesOrders = await prisma.salesOrder.findMany();
    let soFixed = 0;
    for (const so of salesOrders) {
        const dpp = Number(so.subtotal) - Number(so.totalDiscount);
        const taxRate = Number(so.taxRate) || 0;
        const dppNilaiLain = taxRate > 0 ? Math.round(dpp * 0.916666666666667) : 0;
        const taxAmount = taxRate > 0 ? Math.floor(dppNilaiLain * 0.12) : 0;
        const grandTotal = Math.round(dpp + taxAmount);
        
        if (Number(so.grandTotal) !== grandTotal) {
            await prisma.salesOrder.update({
                where: { id: so.id },
                data: { grandTotal }
            });
            soFixed++;
        }
    }
    console.log(`Fixed ${soFixed} SalesOrders.`);

    console.log('Fixing SalesDelivery grandTotals...');
    const salesDeliveries = await prisma.salesDelivery.findMany();
    let sdFixed = 0;
    for (const sd of salesDeliveries) {
        const dpp = Number(sd.subtotal) - Number(sd.totalDiscount);
        const taxRate = Number(sd.taxRate) || 0;
        const dppNilaiLain = taxRate > 0 ? Math.round(dpp * 0.916666666666667) : 0;
        const taxAmount = taxRate > 0 ? Math.floor(dppNilaiLain * 0.12) : 0;
        const grandTotal = Math.round(dpp + taxAmount);
        
        if (Number(sd.grandTotal) !== grandTotal) {
            await prisma.salesDelivery.update({
                where: { id: sd.id },
                data: { grandTotal }
            });
            sdFixed++;
        }
    }
    console.log(`Fixed ${sdFixed} SalesDeliveries.`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
