const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const ops = await prisma.financeTransaction.findMany({
        where: { invoiceNumber: 'KB-TRD-01062026-004' }
    });
    console.log(ops);
}
main().finally(() => prisma.$disconnect());
