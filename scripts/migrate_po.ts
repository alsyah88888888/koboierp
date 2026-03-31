
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function migrate() {
    const receipts = await prisma.goodsReceipt.findMany({
        orderBy: { createdAt: 'asc' }
    });

    console.log(`Found ${receipts.length} receipts to migrate.`);

    // Group by date
    const grouped: Record<string, typeof receipts> = {};
    receipts.forEach(r => {
        const date = new Date(r.date || r.createdAt);
        const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
        if (!grouped[dateStr]) grouped[dateStr] = [];
        grouped[dateStr].push(r);
    });

    for (const dateStr in grouped) {
        const dayReceipts = grouped[dateStr];
        for (let i = 0; i < dayReceipts.length; i++) {
            const r = dayReceipts[i];
            const newFormNumber = `PO-${dateStr}${String(i + 1).padStart(4, '0')}`;
            console.log(`Updating ${r.formNumber} -> ${newFormNumber}`);
            await prisma.goodsReceipt.update({
                where: { id: r.id },
                data: { formNumber: newFormNumber }
            });
        }
    }

    console.log('Migration complete.');
}

migrate()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect()
    });
