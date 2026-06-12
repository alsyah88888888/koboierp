const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("=== SEARCHING FOR KJOO ===");
    const deliveries = await prisma.salesDelivery.findMany({
        where: {
            OR: [
                { deliveryNumber: { contains: 'KJOO' } },
                { buyerName: { contains: 'KJOO' } },
                { recipient: { contains: 'KJOO' } }
            ]
        }
    });
    console.log("Deliveries found:", deliveries);
}

main().catch(console.error).finally(() => prisma.$disconnect());
