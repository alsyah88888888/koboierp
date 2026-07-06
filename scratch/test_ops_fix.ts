import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    const startDate = new Date(2026, 5, 1);
    const endDate = new Date(2026, 5, 30, 23, 59, 59);
    
    // Simulate calculateProductTraceabilityInternal logic for ops distribution
    const deliveries = await prisma.salesDelivery.findMany({
        where: { isVoid: false, date: { gte: startDate, lte: endDate }, salesPerson: 'PF' },
        include: { items: true }
    });
    
    const invoiceNumbers = deliveries.map(d => d.invoiceNumber || d.deliveryNumber).filter(Boolean);
    const opsTransactions = await prisma.financeTransaction.findMany({
        where: { OR: invoiceNumbers.map(inv => ({ invoiceNumber: { contains: inv } })) }
    });

    // FIX: Fetch all deliveries for these invoices to get true quantities
    const allDeliveries = await prisma.salesDelivery.findMany({
        where: {
            isVoid: false,
            OR: [
                { invoiceNumber: { in: invoiceNumbers } },
                { deliveryNumber: { in: invoiceNumbers } }
            ]
        },
        include: { items: true }
    });

    console.log(`Found ${deliveries.length} PF deliveries, but ${allDeliveries.length} total deliveries for those invoices.`);
}
main().catch(console.error);
