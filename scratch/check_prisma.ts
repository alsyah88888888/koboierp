import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const ops = await prisma.financeTransaction.findFirst({
        where: { referenceNumber: 'KB-PR-20260603-007' }
    });
    console.log("Ops PR:", ops);
    
    const ops2 = await prisma.financeTransaction.findMany({
        where: { invoiceNumber: { contains: 'KB-TRN-29052026-006' } }
    });
    console.log("Ops for -006:", ops2);

    const sd = await prisma.salesDelivery.findUnique({
        where: { deliveryNumber: 'KB-TRN-29052026-006' },
        include: { items: true }
    });
    console.log("SD -006 items count:", sd?.items.length, "total qty:", sd?.items.reduce((acc, i) => acc + i.quantity, 0));
    
    const sd2 = await prisma.salesDelivery.findUnique({
        where: { deliveryNumber: 'KB-TRN-29052026-003' },
        include: { items: true }
    });
    console.log("SD -003 items count:", sd2?.items.length, "total qty:", sd2?.items.reduce((acc, i) => acc + i.quantity, 0));
}
main().catch(console.error).finally(() => prisma.$disconnect());
