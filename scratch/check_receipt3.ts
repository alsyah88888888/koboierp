import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.goodsReceiptItem.findMany({
    where: { 
        product: { sku: { in: ['BEVKIT-382', 'FOOBANG-109', 'FOOFORVITA-193', 'FOOGARNIER-201', 'FOOGARNIER-205'] } }
    },
    include: { goodsReceipt: true }
}).then(items => {
    console.log(`Found ${items.length} items`);
    items.forEach(i => {
        console.log(`Product: ${i.productId}, Vendor: ${i.goodsReceipt?.receivedFrom}, Price: ${i.purchasePrice}`);
    });
}).finally(() => prisma.$disconnect());
