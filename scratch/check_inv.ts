import { PrismaClient } from '@prisma/client';
async function main() {
    const prisma = new PrismaClient();
    const sd = await prisma.salesDelivery.findMany({ where: { invoiceNumber: 'KB-TRN-02062026-002' }, select: { deliveryNumber: true, salesPerson: true }});
    console.log('Deliveries with KB-TRN-02062026-002:', sd);
}
main().catch(console.error);
