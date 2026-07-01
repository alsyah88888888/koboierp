import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkTrn() {
    const sale = await prisma.salesDelivery.findFirst({
        where: {
            OR: [
                { deliveryNumber: { contains: '01072026', mode: 'insensitive' } },
                { sjNumber: { contains: '01072026', mode: 'insensitive' } },
                { invoiceNumber: { contains: '01072026', mode: 'insensitive' } }
            ]
        },
        include: { items: true }
    });
    console.log("Found sale:", sale);
    
    const mov = await prisma.stockMovement.findFirst({
        where: { quantity: -32 },
        orderBy: { createdAt: 'desc' }
    });
    console.log("Movement -32:", mov);
}
checkTrn().catch(console.dir).finally(() => prisma.$disconnect());
