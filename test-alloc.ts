import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const product = await prisma.product.findFirst({ where: { sku: 'BEVZODA-691' } });
    const lots = await prisma.productLot.findMany({
        where: { productId: product.id },
        include: { allocations: true }
    });
    console.log(JSON.stringify(lots, null, 2));
}
main();
