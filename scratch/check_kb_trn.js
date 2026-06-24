const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const sale = await prisma.salesDelivery.findFirst({
        where: { deliveryNumber: 'KB-TRN-18062026-002' },
        select: { id: true, deliveryNumber: true, date: true, isVoid: true }
    });
    console.log(sale);
}
main().finally(() => prisma.$disconnect());
