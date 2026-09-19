import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.goodsReceipt.findMany({
    where: { 
        receivedFrom: { contains: 'CIBINONG', mode: 'insensitive' }
    },
    include: { items: true }
}).then(receipts => {
    console.log(`Found ${receipts.length} receipts from CIBINONG`);
    receipts.forEach(r => {
        const item = r.items.find(i => i.productId === 'cmm3z2zdq00e5uumcrsb8he5g' || i.productId === 'FOOGARNIER-201' || true); // just dump first few items
        if(r.items.length > 0) {
            console.log(`Receipt ${r.receiptNumber} has ${r.items.length} items`);
            console.log(r.items.slice(0,2).map(i => ({ id: i.productId, price: i.purchasePrice })));
        }
    });
}).finally(() => prisma.$disconnect());
