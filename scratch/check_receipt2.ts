import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.goodsReceiptItem.findMany({
    where: { 
        product: { sku: 'BEVKIT-382' }
    },
    include: { goodsReceipt: true }
}).then(items => {
    console.log(items.map(i => ({ price: i.purchasePrice, vendor: i.goodsReceipt.receivedFrom })));
}).finally(() => prisma.$disconnect());
