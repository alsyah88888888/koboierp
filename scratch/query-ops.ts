import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const records = await prisma.financeTransaction.findMany({
        where: {
            OR: [ { transactionType: "PAYMENT" }, { transactionType: "EXPENSE" }, { amount: { lt: 0 } } ]
        }
    });
    
    const catMap: Record<string, number> = {};
    records.forEach(r => {
        const cat = r.category || r.transactionType || 'Lainnya';
        const val = Math.abs(Number(r.amount));
        catMap[cat] = (catMap[cat] || 0) + val;
    });
    console.log("Categories from FinanceTransaction:");
    console.log(catMap);
}
main().catch(console.error).finally(() => prisma.$disconnect());
