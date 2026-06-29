import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const lot1 = await prisma.productLot.findUnique({
        where: { id: 'cmpwubpsb0042guzd5xrcb9q6' } // Wait, I don't know the lot ID
    });
    
    const lots = await prisma.productLot.findMany({
        where: {
            grItem: {
                receipt: {
                    receivedFrom: { contains: 'Jenindo' }
                }
            }
        },
        include: {
            grItem: {
                include: {
                    receipt: true
                }
            }
        }
    });
    
    for (const lot of lots) {
        console.log(`Lot ${lot.id} - Receipt ${lot.grItem.receipt.receiptNumber} - Initial Qty: ${lot.initialQty} - Remaining: ${lot.remainingQty}`);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
