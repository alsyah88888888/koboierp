
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function check() {
    const receipts = await prisma.goodsReceipt.findMany({
        select: { id: true, formNumber: true, date: true, createdAt: true },
        orderBy: { createdAt: 'asc' }
    });

    receipts.forEach(r => {
        console.log(`ID: ${r.id}, Form: ${r.formNumber}, Date: ${r.date}, CreatedAt: ${r.createdAt}`);
    });
}

check()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
