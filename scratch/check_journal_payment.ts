import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Let's find accounts first
    const accounts = await prisma.financeAccount.findMany();
    console.log('=== FINANCE ACCOUNTS ===');
    for (const a of accounts) {
        console.log(`ID: ${a.id} | Code: ${a.code} | Name: ${a.name}`);
    }

    // Let's find the sales delivery KB-TRD-29062026-005
    const sd = await prisma.salesDelivery.findFirst({
        where: { deliveryNumber: 'KB-TRD-29062026-005' }
    });
    console.log('\n=== SALES DELIVERY ===');
    if (sd) {
        console.log(`ID: ${sd.id} | DeliveryNumber: ${sd.deliveryNumber} | GrandTotal: ${sd.grandTotal} | PaidAmount: ${sd.paidAmount} | Status: ${sd.paymentStatus}`);
    } else {
        console.log('SalesDelivery KB-TRD-29062026-005 not found!');
    }

    // Let's find any journal entries containing the reference 'KB-TRD-29062026-005'
    const entries = await prisma.journalEntry.findMany({
        where: {
            description: { contains: 'KB-TRD-29062026-005' }
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
