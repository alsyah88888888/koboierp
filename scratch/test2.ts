import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const s = await prisma.salesDelivery.findUnique({
        where: { deliveryNumber: 'SJ-770-10092026-012' }
    });
    console.log("SalesDelivery.deliveryNumber:", s?.deliveryNumber);
    console.log("SalesDelivery.invoiceNumber:", s?.invoiceNumber);

    const rawTransactions = await prisma.financeTransaction.findMany({
        orderBy: { date: 'desc' },
        take: 10000,
        include: { createdBy: { select: { name: true } } }
    });
    console.log("Raw transactions count:", rawTransactions.length);
    
    const transactions = rawTransactions.map((t: any) => ({
        ...t
    }));

    const refNumber = s?.deliveryNumber as string;
    const altRef = s?.invoiceNumber;
    
    console.log("refNumber:", refNumber);
    console.log("altRef:", altRef);

    const txs = transactions.filter((t: any) => 
        t.invoiceNumber === refNumber || 
        t.receiptNumber === refNumber || 
        (altRef && t.invoiceNumber === altRef) ||
        (altRef && t.receiptNumber === altRef) ||
        (t.description && t.description.includes(refNumber)) ||
        (altRef && t.description && t.description.includes(altRef))
    );
    
    console.log("Found txs length:", txs.length);
    if (txs.length > 0) {
        console.log("Found TX:", txs[0]);
    }
}

main().finally(() => prisma.$disconnect());
