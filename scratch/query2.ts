import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const delivery = await prisma.salesDelivery.findUnique({
        where: { deliveryNumber: 'KB-TRN-10092026-011' }
    });
    console.log("Delivery:", delivery);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    });
