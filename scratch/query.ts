import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const delivery = await prisma.salesDelivery.findUnique({
        where: { deliveryNumber: 'KB-TRN-10092026-011' }
    });
    console.log("Delivery:", delivery);

    const ftxs = await prisma.financeTransaction.findMany({
        where: {
            OR: [
                { invoiceNumber: 'KB-TRN-10092026-011' },
                { description: { contains: 'KB-TRN-10092026-011' } },
                { amount: 172500000 }
            ]
        }
    });
    console.log("Finance Transactions:", ftxs);

    const jtxs = await prisma.journalEntry.findMany({
        where: {
            OR: [
                { description: { contains: 'KB-TRN-10092026-011' } },
                { amount: 172500000 }
            ]
        }
    });
    console.log("Journal Entries:", jtxs);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    });
