import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const tx = await prisma.financeTransaction.findMany({
        where: {
            invoiceNumber: { not: null }
        },
        take: 50
    });
    console.log(tx.map(t => ({ 
        id: t.id, 
        desc: t.description, 
        ref: t.referenceNumber,
        inv: t.invoiceNumber
    })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
