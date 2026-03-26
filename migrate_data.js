const { PrismaClient: PostgresClient } = require('@prisma/client');
const { PrismaClient: SqliteClient } = require('@prisma/client-sqlite');

const pg = new PostgresClient();
const sq = new SqliteClient();

const delay = ms => new Promise(r => setTimeout(r, ms));

async function main() {
    console.log("Starting Migration from SQLite to PostgreSQL...");

    const order = [
        "user", "systemSetting", "financeAccount", "warehouse", "product", "vendor", "customer",
        "stock",
        "purchaseRequest", "purchaseRequestItem",
        "purchaseOrder", "purchaseOrderItem",
        "salesDelivery", "salesDeliveryItem",
        "goodsReceipt", "goodsReceiptItem", "goodsReceiptVerification",
        "purchaseReturn", "purchaseReturnItem",
        "salesReturn", "salesReturnItem",
        "financeTransaction", "journalEntry",
        "stockMovement",
        "notification", "notificationRead",
        "account", "session"
    ];

    for (const modelName of order) {
        if (!sq[modelName] || !pg[modelName]) {
            console.log(`Skipping unknown model: ${modelName}`);
            continue;
        }

        try {
            const records = await sq[modelName].findMany();
            if (records.length === 0) {
                console.log(`[OK] 0 records for ${modelName}`);
                continue;
            }

            console.log(`Migrating ${records.length} records for ${modelName}...`);
            
            // Due to constraints like foreign keys, inserting batch might sometimes fail if cyclic, 
            // but our ordered list handles it. Also Postgres doesn't need to generate IDs, we can insert the old IDs.
            let successCount = 0;
            for (const record of records) {
                try {
                    // Try to insert one by one safely
                    // Upsert isn't available for all models without unique identifiers, so we try create, or find first.
                    // For SystemSetting, it has id='global'
                    const existing = await pg[modelName].findUnique({
                        where: { id: record.id }
                    }).catch(e => null);

                    if (existing) {
                        // Skip if already exists
                        successCount++;
                        continue;
                    }

                    await pg[modelName].create({
                        data: record
                    });
                    successCount++;
                } catch (e) {
                    if (e.code === 'P2002') {
                        // Unique constraint failure, ignore safely (e.g., email exists)
                        successCount++;
                    } else {
                        console.error(`Failed to migrate record ${record.id} in ${modelName}:`, e.message);
                    }
                }
            }
            console.log(`[OK] Migrated ${successCount}/${records.length} for ${modelName}`);
        } catch (error) {
            console.error(`Error processing model ${modelName}:`, error.message);
        }
    }

    console.log("Migration Complete!");
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await sq.$disconnect();
        await pg.$disconnect();
    });
