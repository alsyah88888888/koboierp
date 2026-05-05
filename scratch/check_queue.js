
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const count = await prisma.goodsReceipt.count({
        where: { isVerified: false, isVoid: false }
    });
    console.log(`Total Antrian Checker: ${count}`);
    const pending = await prisma.goodsReceipt.findMany({
        where: { isVerified: false, isVoid: false },
        select: { receiptNumber: true, receivedFrom: true }
    });
    console.log('Detail Antrian:');
    pending.forEach(p => console.log(`- ${p.receiptNumber} (${p.receivedFrom})`));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
