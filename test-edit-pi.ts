import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const d = await prisma.salesOrder.findFirst({ where: { orderNumber: "KB-PI-21082026-001" } });
    console.log(d);
}
main();
