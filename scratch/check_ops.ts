import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const txs = await prisma.financeTransaction.findMany({
        where: {
            invoiceNumber: { contains: "KB-TRN-02062026-001" }
        }
    });
    console.log("Transactions for -001:", txs);
    
    const txs2 = await prisma.financeTransaction.findMany({
        where: {
            invoiceNumber: { contains: "KB-TRN-02062026-002" }
        }
    });
    console.log("Transactions for -002:", txs2);
}

main().catch(console.error).finally(() => prisma.$disconnect());
