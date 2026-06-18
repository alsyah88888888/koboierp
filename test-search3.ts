const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const po = await prisma.purchaseOrder.findFirst({
        where: { orderNumber: 'PO-20260606-576' },
        include: { items: true }
    });
    console.log(po);
}
main().catch(console.error).finally(() => prisma.$disconnect());
