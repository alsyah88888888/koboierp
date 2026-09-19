import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.product.findMany({
    where: {
        sku: { in: ['BEVKIT-382', 'FOOBANG-109', 'FOOFORVITA-193', 'FOOGARNIER-201', 'FOOGARNIER-205'] }
    }
}).then(products => {
    console.log(products.map(p => ({
        sku: p.sku,
        name: p.name,
        purchasePrice: p.purchasePrice
    })));
}).finally(() => prisma.$disconnect());
