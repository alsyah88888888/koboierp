import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const s = await prisma.salesDelivery.count({ where: { taxRate: 12 }});
    const p = await prisma.purchaseReceipt.count({ where: { taxRate: 12 }});
    console.log(`Sales: ${s}, Purchase: ${p}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
