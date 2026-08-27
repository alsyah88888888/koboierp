import { PrismaClient } from '@prisma/client';
import { format } from "date-fns";
const prisma = new PrismaClient();
async function run() {
    const selectedDateStr = format(new Date(), 'yyyy-MM-dd');
    const dateStart = new Date(selectedDateStr + 'T00:00:00.000Z');
    const dateEnd = new Date(selectedDateStr + 'T23:59:59.999Z');

    const incomingReceipts = await prisma.goodsReceipt.findMany({
        where: {
            date: { gte: dateStart, lte: dateEnd },
            isVoid: false
        },
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: 'asc' }
    });
    console.log(incomingReceipts);
}
run().catch(console.error).finally(() => prisma.$disconnect());
