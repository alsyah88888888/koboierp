import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
    console.log("--- Starting Prefix Migration (with Timeout Handling) ---");

    await prisma.$transaction(async (tx) => {
        // 1. PURCHASE (GoodsReceipt)
        console.log("Processing GoodsReceipt (Purchase)...");
        const receipts = await tx.goodsReceipt.findMany({
            where: {
                OR: [
                    { taxRate: { gt: 0 } },
                    { totalDiscount: { gt: 0 } }
                ],
                receiptNumber: { startsWith: 'KB-LPB-' }
            }
        });

        console.log(`Found ${receipts.length} inconsistent GoodsReceipt records.`);

        for (const r of receipts) {
            let newNumber = r.receiptNumber.replace('KB-LPB-', 'KB-LPBD-');
            
            // Check Collision
            const existing = await tx.goodsReceipt.findUnique({ where: { receiptNumber: newNumber } });
            if (existing) {
                console.warn(`Collision detected for ${newNumber}. Appending suffix.`);
                newNumber = `${newNumber}-MIG`;
            }

            console.log(`Renaming: ${r.receiptNumber} -> ${newNumber}`);
            
            await tx.goodsReceipt.update({
                where: { id: r.id },
                data: { receiptNumber: newNumber }
            });

            await tx.stockMovement.updateMany({
                where: { reference: r.receiptNumber },
                data: { reference: newNumber }
            });
        }

        // 2. SALES (SalesDelivery)
        console.log("\nProcessing SalesDelivery (Sales)...");
        const sales = await tx.salesDelivery.findMany({
            include: { items: true }
        });

        let renamedSalesCount = 0;
        for (const s of sales) {
            const hasTaxOrDisc = (Number(s.taxRate) || 0) > 0 || (Number(s.totalDiscount) || 0) > 0 || s.items.some(i => (Number(i.discount) || 0) > 0);
            
            let newNumber = s.deliveryNumber;
            
            if (hasTaxOrDisc) {
                // ACTIVE -> Should be KB-TRN-
                if (s.deliveryNumber.startsWith('KB-TRND-')) {
                    newNumber = s.deliveryNumber.replace('KB-TRND-', 'KB-TRN-');
                } else if (s.deliveryNumber.startsWith('KB-SJD-')) {
                    newNumber = s.deliveryNumber.replace('KB-SJD-', 'KB-TRN-');
                } else if (s.deliveryNumber.startsWith('KB-SJ-')) {
                    newNumber = s.deliveryNumber.replace('KB-SJ-', 'KB-TRN-');
                }
            } else {
                // INACTIVE -> Should be KB-TRD-
                if (s.deliveryNumber.startsWith('KB-TRN-')) {
                    newNumber = s.deliveryNumber.replace('KB-TRN-', 'KB-TRD-');
                } else if (s.deliveryNumber.startsWith('KB-SJ-')) {
                    newNumber = s.deliveryNumber.replace('KB-SJ-', 'KB-TRD-');
                }
            }

            if (newNumber !== s.deliveryNumber) {
                // Check Collision for Sales
                const existing = await tx.salesDelivery.findUnique({ where: { deliveryNumber: newNumber } });
                if (existing) {
                    console.warn(`Collision detected for Sales ${newNumber}. Appending suffix.`);
                    newNumber = `${newNumber}-MIG`;
                }

                console.log(`Renaming Sales: ${s.deliveryNumber} -> ${newNumber}`);
                renamedSalesCount++;
                
                await tx.salesDelivery.update({
                    where: { id: s.id },
                    data: { deliveryNumber: newNumber }
                });

                await tx.stockMovement.updateMany({
                    where: { reference: s.deliveryNumber },
                    data: { reference: newNumber }
                });
            }
        }
        console.log(`Renamed ${renamedSalesCount} SalesDelivery records.`);
    }, {
        timeout: 90000 // 90 seconds
    });

    console.log("\n--- Migration Completed Successfully ---");
}

migrate()
    .catch(e => {
        console.error("Migration failed:", e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
