import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.purchaseRequestItem.findFirst().then(item => {
    const obj = item.estimatedPrice;
    console.log("val:", Number(obj));
    console.log("string:", String(obj));
}).finally(() => prisma.$disconnect());
