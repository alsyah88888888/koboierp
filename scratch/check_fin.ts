import { PrismaClient } from '@prisma/client';
async function main() {
    const prisma = new PrismaClient();
    const ops = await prisma.financeTransaction.findMany({ where: { invoiceNumber: { contains: 'KB-TRN-02062026-002' } } });
    console.log('Finance Transactions:', ops);
}
main().catch(console.error);
