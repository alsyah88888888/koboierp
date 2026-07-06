import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    const startDate = new Date('2026-06-01T00:00:00.000Z');
    const endDate = new Date('2026-06-30T23:59:59.999Z');

    const orders = await prisma.salesOrder.findMany({
        where: {
            date: {
                gte: startDate,
                lte: endDate
            }
        },
        include: {
            deliveries: true
        }
    });

    let fixedCount = 0;

    for (const order of orders) {
        if (order.deliveries && order.deliveries.length > 0) {
            // Take the first valid delivery's salesPerson
            const validDelivery = order.deliveries.find((d: any) => !d.isVoid);
            if (validDelivery) {
                if (order.salesPerson !== validDelivery.salesPerson) {
                    console.log(`Menyelaraskan SO: ${order.orderNumber} dari ${order.salesPerson} menjadi ${validDelivery.salesPerson} (mengikuti SJ)`);
                    await prisma.salesOrder.update({
                        where: { id: order.id },
                        data: { salesPerson: validDelivery.salesPerson }
                    });
                    fixedCount++;
                }
            }
        }
    }

    console.log(`\nEKSEKUSI PENYELARASAN SO SELESAI.`);
    console.log(`Total ${fixedCount} Sales Order berhasil diselaraskan dengan Surat Jalan!`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
