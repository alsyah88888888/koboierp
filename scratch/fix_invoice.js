const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    const delivery = await prisma.salesDelivery.findUnique({
        where: { deliveryNumber: 'SJ-829-22062026-018' }
    });

    if (delivery) {
        await prisma.salesDelivery.update({
            where: { id: delivery.id },
            data: {
                invoiceNumber: 'KB-TRN-18062026-002',
                taxRate: 11
            }
        });
        console.log("Restored invoiceNumber to KB-TRN-18062026-002 and taxRate to 11");
    }
}

fix().catch(console.error).finally(() => prisma.$disconnect());
