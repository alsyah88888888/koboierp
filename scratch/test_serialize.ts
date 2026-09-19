import { PrismaClient } from '@prisma/client';
import { serializeDecimal } from './src/lib/utils';
const prisma = new PrismaClient();
prisma.purchaseRequestItem.findFirst().then(item => {
    console.log("Original:", item?.estimatedPrice);
    console.log("Serialized:", serializeDecimal(item?.estimatedPrice));
}).finally(() => prisma.$disconnect());
