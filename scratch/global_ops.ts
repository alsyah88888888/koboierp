import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const startDate = new Date(2026, 5, 1); // June 1, 2026
    const endDate = new Date(2026, 5, 30, 23, 59, 59, 999); // June 30, 2026
    
    // Find all operational transactions
    const ops = await prisma.financeTransaction.findMany({
        where: {
            date: { gte: startDate, lte: endDate },
            // Must be Expense, Payment, or negative amount
            AND: [
                { OR: [ { transactionType: "PAYMENT" }, { transactionType: "EXPENSE" }, { amount: { lt: 0 } } ] },
                // Filter out inter-account transfers if any? Let's just look at all expenses
            ]
        }
    });

    let linkedOps = 0;
    let unlinkedOps = 0;
    const unlinkedDetails: any[] = [];

    ops.forEach(t => {
        // Exclude system accounts or something?
        if (t.bank === 'BCA 1234' || t.description?.includes('Mutasi')) return; 
        
        // Wait, in report-service, we only pull "Ops" for category Ops? 
        // No, report-service pulls from a specific query. Let me look at report-service.ts lines 69-90
        const amt = Math.abs(Number(t.amount || 0));
        if (t.invoiceNumber) {
            linkedOps += amt;
        } else {
            unlinkedOps += amt;
            unlinkedDetails.push({
                date: t.date.toLocaleDateString(),
                desc: t.description,
                amount: amt,
                bank: t.bank
            });
        }
    });

    unlinkedDetails.sort((a,b) => b.amount - a.amount);

    console.log(`Global Linked Ops: Rp ${linkedOps}`);
    console.log(`Global Unlinked Ops (Selisih/Umum): Rp ${unlinkedOps}`);
    console.log(`\n--- Top 10 Rincian Ops Umum Global ---`);
    console.table(unlinkedDetails.slice(0, 10));
}

main().catch(console.error).finally(() => prisma.$disconnect());
