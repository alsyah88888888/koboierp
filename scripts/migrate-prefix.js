
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
    console.log("🚀 Starting Prefix Migration: KB-SJ -> KB-TRN...");

    const allDeliveries = await prisma.salesDelivery.findMany({
        where: {
            OR: [
                { deliveryNumber: { startsWith: "KB-SJ-" } },
                { deliveryNumber: { startsWith: "KB-SJD-" } }
            ]
        }
    });

    console.log(`📦 Found ${allDeliveries.length} records to migrate.`);

    for (const delivery of allDeliveries) {
        const oldNumber = delivery.deliveryNumber;
        let newNumber = oldNumber;

        if (oldNumber.startsWith("KB-SJ-")) {
            newNumber = oldNumber.replace("KB-SJ-", "KB-TRN-");
        } else if (oldNumber.startsWith("KB-SJD-")) {
            newNumber = oldNumber.replace("KB-SJD-", "KB-TRND-");
        }

        if (newNumber === oldNumber) continue;

        console.log(`🔧 Migrating: ${oldNumber} -> ${newNumber}`);

        await prisma.$transaction(async (tx) => {
            // 1. Update SalesDelivery
            await tx.salesDelivery.update({
                where: { id: delivery.id },
                data: { deliveryNumber: newNumber }
            });

            // 2. Update StockMovement Reference
            await tx.stockMovement.updateMany({
                where: { reference: oldNumber },
                data: { reference: newNumber }
            });

            // 3. Update JournalEntry Descriptions
            // Note: Descriptions might be "Pembayaran Penjualan SJ-..." 
            // So we use updateMany with contains if possible, but prisma doesn't support complex string replaces in updateMany.
            // We'll fetch them first.
            const relatedJournals = await tx.journalEntry.findMany({
                where: { description: { contains: oldNumber } }
            });

            for (const journal of relatedJournals) {
                await tx.journalEntry.update({
                    where: { id: journal.id },
                    data: { description: journal.description.replace(oldNumber, newNumber) }
                });
            }
            
            // 4. Update SalesReturn references (if any)
            // SalesReturn doesn't store the SJ number in a string field usually (it uses deliveryId which is CUID),
            // but just in case of notes:
            const relatedReturns = await tx.salesReturn.findMany({
                where: { notes: { contains: oldNumber } }
            });
            for (const ret of relatedReturns) {
                await tx.salesReturn.update({
                    where: { id: ret.id },
                    data: { notes: ret.notes.replace(oldNumber, newNumber) }
                });
            }
        });
    }

    console.log("✅ Migration Completed Successfully!");
}

migrate()
    .catch(e => {
        console.error("❌ Migration Failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
