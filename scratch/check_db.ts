import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const data = await prisma.financeTransaction.findMany({
        where: { invoiceNumber: { contains: 'KB-TRN-29052026-006' } }
    });
    console.log(data);
}
main().catch(console.error);
