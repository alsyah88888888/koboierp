import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    const startDate = new Date('2026-07-01');
    const endDate = new Date('2026-07-31T23:59:59.999Z');
    
    const deliveries = await prisma.salesDelivery.findMany({
        where: { isVoid: false, date: { gte: startDate, lte: endDate } },
        select: { deliveryNumber: true, invoiceNumber: true }
    });
    
    const invoiceNumbers = deliveries.map(d => d.invoiceNumber || d.deliveryNumber).filter(Boolean);
    
    const conditions = [];
    const chunkSize = 200;
    for (let i = 0; i < invoiceNumbers.length; i += chunkSize) {
        const chunk = invoiceNumbers.slice(i, i + chunkSize);
        conditions.push({
            OR: chunk.map((num) => ({
                description: { contains: num }
            }))
        });
    }

    const rawLinkedOps = await prisma.financeTransaction.findMany({
        where: { OR: conditions }
    });
    
    let totalOps = 0;
    let julyOps = 0;
    let otherMonthOps = 0;
    
    rawLinkedOps.forEach((t: any) => {
        const isExpense = t.transactionType === "PAYMENT" || t.transactionType === "EXPENSE" || Number(t.amount) < 0;
        if (!isExpense) return;
        
        const matchedNum = invoiceNumbers.find(num => t.description?.includes(num) || t.referenceNumber?.includes(num));
        if (matchedNum) {
            const amt = Math.abs(Number(t.amount || 0));
            totalOps += amt;
            
            if (t.date >= startDate && t.date <= endDate) {
                julyOps += amt;
            } else {
                otherMonthOps += amt;
            }
        }
    });
    
    console.log("Total Ops Mapped to July Deliveries:", totalOps);
    console.log("- Paid in July:", julyOps);
    console.log("- Paid in other months:", otherMonthOps);
}

main().finally(() => process.exit(0));
