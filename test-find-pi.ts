import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const orders = await prisma.salesOrder.findMany({ where: { orderNumber: { contains: "KB-PI-21082026-001" } } });
    console.log(orders);
}
main();
