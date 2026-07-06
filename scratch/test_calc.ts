import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    const orderNumber = 'KB-PO-02072026-003';
    const so = await prisma.salesOrder.findFirst({
        where: { orderNumber },
        include: { items: true }
    });

    if (!so) return console.log('Not found');

    let newSubtotal = 0;
    for (const item of so.items) {
        const p = Math.round(Number(item.salesPrice) || 0);
        const q = Number(item.quantity) || 0;
        const disc = Math.round(Number(item.discount) || 0);
        newSubtotal += (p * q) - disc;
    }

    const totalDiscountNominal = Math.round(Number(so.totalDiscount) || 0);
    const dpp = newSubtotal - totalDiscountNominal;
    
    const taxRatePercent = Number(so.taxRate) || 0;
    const dppNilaiLain = taxRatePercent > 0 ? Math.round(dpp * 0.916666666666667) : 0;
    const taxAmount = taxRatePercent > 0 ? Math.floor(dppNilaiLain * 0.12) : 0;
    const grandTotal = Math.round(dpp + taxAmount);

    console.log(`Excel Way: Subtotal = ${newSubtotal}, PPN = ${taxAmount}, GrandTotal = ${grandTotal}`);
}

run().finally(() => prisma.$disconnect());
