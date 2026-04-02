const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ADMIN_ID = 'cmm3yw5uu0000uusg3lndstul'; // admin@kolaborasi.id

async function main() {
    console.log(`Starting fix for NULL owners. Target Admin: ${ADMIN_ID}`);

    const models = [
        'goodsReceipt',
        'purchaseReturn',
        'salesDelivery',
        'salesReturn',
        'financeTransaction',
        'vendor',
        'customer',
        'product'
    ];

    for (const model of models) {
        try {
            const count = await prisma[model].count({
                where: { createdById: null }
            });

            if (count > 0) {
                console.log(`Updating ${count} records in ${model}...`);
                await prisma[model].updateMany({
                    where: { createdById: null },
                    data: { createdById: ADMIN_ID }
                });
                console.log(`[DONE] ${model} updated.`);
            } else {
                console.log(`[SKIP] No NULL owners in ${model}.`);
            }
        } catch (error) {
            console.error(`Error updating ${model}:`, error.message);
        }
    }

    console.log("Fix complete!");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
