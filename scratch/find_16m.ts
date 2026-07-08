import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const tx = await prisma.financeTransaction.findMany({
        where: {
            OR: [
                { amount: 16569688 },
                { amount: -16569688 }
            ]
        }
    });
    console.log("FinanceTx with exactly 16569688:", tx);
    
    // Check if it's maybe related to Sales Order KB-PO-07072026-001
    const so = await prisma.salesOrder.findFirst({
        where: { poNumber: { contains: 'KB-PO-07072026-001' } },
        include: { items: true, deliveries: true }
    });
    if (so) {
        console.log("Sales Order:", so.poNumber, so.totalAmount);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
