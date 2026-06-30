import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Search SalesDelivery with substring '005' or matching date
    const sds = await prisma.salesDelivery.findMany({
        where: {
            OR: [
                { deliveryNumber: { contains: '005' } },
                { invoiceNumber: { contains: '005' } }
            ]
        }
    });
    console.log('=== MATCHING SALES DELIVERIES ===');
    for (const sd of sds) {
        console.log(`ID: ${sd.id} | DN: ${sd.deliveryNumber} | IN: ${sd.invoiceNumber} | GrandTotal: ${sd.grandTotal} | PaidAmount: ${sd.paidAmount} | Status: ${sd.paymentStatus} | Date: ${sd.date?.toISOString().slice(0, 10)}`);
    }

    const prs = await prisma.purchaseRequest.findMany({
        where: {
            number: { contains: '006' }
        }
    });
    console.log('=== MATCHING PURCHASE REQUESTS ===');
    for (const pr of prs) {
        console.log(`ID: ${pr.id} | No: ${pr.number}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
