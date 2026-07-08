import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const startDate = new Date(2026, 5, 1); // June 1, 2026
    const endDate = new Date(2026, 5, 30, 23, 59, 59, 999); // June 30, 2026
    
    // We want to calculate the total ops attached to BC deliveries for June
    const sds = await prisma.salesDelivery.findMany({
        where: { date: { gte: startDate, lte: endDate }, salesPerson: 'BC' },
        include: { items: true }
    });

    const invoiceNumbers = Array.from(new Set(sds.map(d => d.invoiceNumber).filter(Boolean)));
    const deliveryNumbers = sds.map(d => d.deliveryNumber);

    // Sum ops linked to these
    const ops = await prisma.financeTransaction.findMany({
        where: {
            date: { gte: startDate, lte: endDate },
            OR: [
                { transactionType: "PAYMENT" },
                { transactionType: "EXPENSE" },
                { amount: { lt: 0 } }
            ]
        }
    });

    let totalLinkedOps = 0;
    ops.forEach(t => {
        if (!t.invoiceNumber) return;
        const invs = t.invoiceNumber.split(',').map(s => s.trim());
        const hasBC = invs.some(i => invoiceNumbers.includes(i) || deliveryNumbers.includes(i));
        if (hasBC) {
            // Very rough estimate assuming 100% goes to BC if it matches
            totalLinkedOps += Math.abs(Number(t.amount || 0));
        }
    });

    console.log(`Total Linked Ops BC: Rp ${totalLinkedOps}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
