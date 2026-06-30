import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const delivery = await prisma.salesDelivery.findFirst({
        where: { invoiceNumber: 'KB-TRD-29062026-005' }
    });
    
    if (!delivery) {
        console.log('Delivery not found');
        return;
    }
    
    console.log(`SalesDelivery ID: ${delivery.id}`);
    
    const entries = await prisma.journalEntry.findMany({
        where: {
            OR: [
                { description: { contains: 'KB-TRD-29062026-005' } },
                { description: { contains: 'SJ-573-29062026-008' } },
                { description: { contains: 'PAK HARI' } },
                { date: { gte: new Date('2026-06-29T00:00:00+07:00'), lt: new Date('2026-06-30T00:00:00+07:00') } }
            ]
        },
        include: {
            account: true
        }
    });
    
    console.log('\n=== JOURNAL ENTRIES ===');
    for (const e of entries) {
        console.log(`ID: ${e.id} | Date: ${e.date?.toISOString().slice(0, 10)} | Desc: ${e.description} | Type: ${e.type} | Amount: ${e.amount} | Account: ${e.account?.name} (${e.account?.code})`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
