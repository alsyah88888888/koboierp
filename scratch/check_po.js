const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const pos = await prisma.purchaseOrder.findMany({ 
        where: { createdById: 'cmqbtm6mw00ayl1jw1pops10h' }
    });
    console.log("Purchase orders:", pos.length);
}
main().finally(() => prisma.$disconnect());
