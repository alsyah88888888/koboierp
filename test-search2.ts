const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const gr = await prisma.goodsReceipt.findUnique({
        where: { id: 'cmq2757e401nrl1tngv6g9w9z' },
    });
    console.log(gr);
}
main().catch(console.error).finally(() => prisma.$disconnect());
