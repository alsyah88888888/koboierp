const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const p = await prisma.product.findFirst({
        where: { id: 'cmmn535j4003euu7c1fw3gty1' }
    });
    console.log(p);
}
main().catch(console.error).finally(() => prisma.$disconnect());
