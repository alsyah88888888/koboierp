import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const so = await prisma.salesOrder.findFirst({
        where: { poNumber: { contains: 'KB-PO-07072026-001' } },
        include: { 
            items: true,
            deliveries: { include: { items: true } }
        }
    });

    console.log(JSON.stringify(so, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
