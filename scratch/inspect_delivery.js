const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const delivery = await prisma.salesDelivery.findUnique({
        where: { id: 'cmq9g4ziq00itl1dueojuvdbn' },
        include: {
            items: {
                include: {
                    product: true,
                    lotAllocations: {
                        include: {
                            lot: true
                        }
                    }
                }
            }
        }
    });
    console.log("=== SALES DELIVERY ===");
    console.log(JSON.stringify(delivery, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
