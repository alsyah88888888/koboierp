import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Find all FinanceTransactions that look like PR payments
    const txs = await prisma.financeTransaction.findMany({
        where: { 
            referenceNumber: { startsWith: 'KB-PR-' },
        }
    });

    let count = 0;
    console.log(`Found ${txs.length} PR-related FinanceTransactions.`);

    for (const tx of txs) {
        const pr = await prisma.purchaseRequest.findUnique({
            where: { number: tx.referenceNumber! }
        });

        if (pr) {
            const txDate = tx.date.toISOString().split('T')[0];
            const prDate = pr.date.toISOString().split('T')[0];

            if (txDate !== prDate) {
                // We need to update this one
                await prisma.financeTransaction.update({
                    where: { id: tx.id },
                    data: { date: pr.date }
                });
                console.log(`Updated ${tx.referenceNumber}: ${txDate} -> ${prDate}`);
                count++;
            }
        }
    }

    console.log(`Successfully fixed ${count} transaction dates.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
