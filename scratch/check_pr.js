const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const prs = await prisma.purchaseRequest.findMany({ 
        where: { requestedById: 'cmqbtm6mw00ayl1jw1pops10h' }
    });
    console.log("Purchase requests:", prs.length);
}
main().finally(() => prisma.$disconnect());
