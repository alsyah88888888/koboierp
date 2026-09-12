import { serializeDecimal } from "./src/lib/utils";
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
    
    // Simulate what happens in page.tsx
    const txIds = rawTransactions.map((t: any) => t.id);
    const txJournals = await prisma.journalEntry.findMany({
        where: { transactionId: { in: txIds } },
        include: { account: true }
    });
    
    const transactions = serializeDecimal(rawTransactions.map((t: any) => ({
        ...t,
        journals: txJournals.filter((j: any) => j.transactionId === t.id)
    })));

    const refNumber = s?.deliveryNumber as string;
    const altRef = s?.invoiceNumber;
    
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
