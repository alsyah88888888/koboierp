const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDoc() {
    try {
        const doc = await prisma.goodsReceipt.findFirst({
            where: { formNumber: 'kb-lpbd-27012026-004' }
        });
        console.log(JSON.stringify(doc, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

checkDoc();
