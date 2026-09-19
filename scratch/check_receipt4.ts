import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.goodsReceiptItem.findMany({
    where: { 
        product: { sku: { in: ['BEVKIT-382', 'FOOBANG-109', 'FOOFORVITA-193', 'FOOGARNIER-201', 'FOOGARNIER-205'] } }
    },
    include: { receipt: true }
}).then(items => {
    console.log(`Found ${items.length} items`);
    items.forEach(i => {
        console.log(`Product: ${i.productId}, Vendor: ${i.receipt?.receivedFrom}, Price: ${i.purchasePrice}`);
    });
}).catch(e => console.error(e)).finally(() => prisma.$disconnect());
