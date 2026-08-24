import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const product = await prisma.product.findFirst({ where: { sku: 'BEVZODA-691' } });
    const movements = await prisma.stockMovement.findMany({
        where: { productId: product.id },
        orderBy: { createdAt: 'desc' },
        take: 10
    });
    console.log(movements);
}
main();
