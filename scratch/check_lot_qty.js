const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const lot = await prisma.productLot.findUnique({
        where: { id: 'cmqq6speu01v9l12bq96s6gnz' }
    });
    console.log(lot);
}

check().catch(console.error).finally(() => prisma.$disconnect());
