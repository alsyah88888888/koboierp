import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const deliveries = await prisma.salesDelivery.findMany({
        where: { grandTotal: 173250000 }
    });
    console.log("Deliveries:", deliveries);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    });
