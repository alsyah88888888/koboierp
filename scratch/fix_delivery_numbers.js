const { getPrisma } = require("../src/lib/prisma");

async function fixDeliveryNumbers() {
    const prisma = getPrisma();
    console.log("=== START MIGRATION: FIXING DELIVERY NUMBERS ===");

    // Fetch all SalesDelivery where deliveryNumber starts with KB-TRN- or KB-TRD-
    const deliveries = await prisma.salesDelivery.findMany({
        where: {
            OR: [
                { deliveryNumber: { startsWith: "KB-TRN-" } },
                { deliveryNumber: { startsWith: "KB-TRD-" } }
            ]
        }
    });

    console.log(`Found ${deliveries.length} deliveries to fix.`);

    for (const d of deliveries) {
        const oldNum = d.deliveryNumber;
        
        // Parse parts from old deliveryNumber: prefix-date-seq
        // e.g. KB-TRN-28052026-003
        const parts = oldNum.split('-');
        if (parts.length < 4) {
            console.log(`Skipping ${oldNum} - format doesn't match prefix-date-seq`);
            continue;
        }

        const dateStr = parts[2]; // e.g. 28052026
        const seqStr = parts[3]; // e.g. 003
        
        // Generate random 3-digit number
        const randomNum = String(Math.floor(100 + Math.random() * 900));
        
        // New delivery number starts with SJ-
        const newDeliveryNumber = `SJ-${randomNum}-${dateStr}-${seqStr}`;
        
        // If invoiceNumber is empty or null, set it to the old deliveryNumber (the invoice number)
        const newInvoiceNumber = d.invoiceNumber || oldNum;

        console.log(`Fixing delivery ID ${d.id}:`);
        console.log(`  Old Number: ${oldNum}`);
        console.log(`  New Number: ${newDeliveryNumber}`);
        console.log(`  New Invoice Number: ${newInvoiceNumber}`);

        // Update database in a transaction for safety
        await prisma.$transaction(async (tx) => {
            // 1. Update SalesDelivery
            await tx.salesDelivery.update({
                where: { id: d.id },
                data: {
                    deliveryNumber: newDeliveryNumber,
                    invoiceNumber: newInvoiceNumber
                }
            });

            // 2. Update StockMovement references
            const smCount = await tx.stockMovement.updateMany({
                where: { reference: oldNum },
                data: { reference: newDeliveryNumber }
            });
            if (smCount.count > 0) {
                console.log(`  -> Updated ${smCount.count} StockMovement records.`);
            }

            // 3. Update JournalEntry descriptions containing the old deliveryNumber
            const journalsToUpdate = await tx.journalEntry.findMany({
                where: {
                    description: { contains: oldNum }
                }
            });

            for (const j of journalsToUpdate) {
                const newDesc = j.description.replace(new RegExp(oldNum, 'g'), newDeliveryNumber);
                await tx.journalEntry.update({
                    where: { id: j.id },
                    data: { description: newDesc }
                });
                console.log(`  -> Updated JournalEntry ID ${j.id} description: "${j.description}" -> "${newDesc}"`);
            }
        });

        console.log("----------------------------------------");
    }

    console.log("=== MIGRATION COMPLETE ===");
}

fixDeliveryNumbers().catch(console.error);
