import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const txs = await prisma.financeTransaction.findMany({
        where: {
            OR: [
                { invoiceNumber: { contains: 'KB-TRN-02062026-002' } },
                { invoiceNumber: { contains: 'KB-TRN-02062026-001' } },
                { referenceNumber: { contains: 'KB-TRN-02062026-002' } }
            ]
        }
    });

    console.log("FinanceTxs:", JSON.stringify(txs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
