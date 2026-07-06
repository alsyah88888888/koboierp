import { PrismaClient } from '@prisma/client';
async function main() {
    const prisma = new PrismaClient();
    const ops = await prisma.financeTransaction.findMany({ where: { invoiceNumber: { contains: 'SJ-414-02062026-001' } } });
    console.log('Finance Transactions for SJ-414:');
    console.log(ops);

    const sd = await prisma.salesDelivery.findMany({ where: { OR: [ { invoiceNumber: 'SJ-414-02062026-001' }, { deliveryNumber: 'SJ-414-02062026-001' } ] }, include: { items: true } });
    console.log('Sales Deliveries for SJ-414:');
    console.log(JSON.stringify(sd, null, 2));
}
main().catch(console.error);
