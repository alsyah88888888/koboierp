const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const delivery = await prisma.salesDelivery.findUnique({
        where: { deliveryNumber: 'SJ-829-22062026-018' },
        include: {
            items: {
                include: {
                    product: true,
                    lotAllocations: true
                }
            }
        }
    });

    console.log(JSON.stringify(delivery, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
