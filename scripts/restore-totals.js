
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function restoreTotals() {
    console.log("🚑 Starting Emergency Totals Restore...");

    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
        throw new Error("No backup directory found!");
    }

    const files = fs.readdirSync(backupDir).filter(f => f.startsWith('rounding_backup_'));
    if (files.length === 0) {
        throw new Error("No backup files found!");
    }

    // Get latest backup
    const latestFile = files.sort().reverse()[0];
    const filePath = path.join(backupDir, latestFile);
    console.log(`📦 Restoring from: ${latestFile}`);

    const backupData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // 1. Restore Goods Receipts
    for (const gr of backupData.goodsReceipts) {
        await prisma.goodsReceipt.update({
            where: { id: gr.id },
            data: {
                receiptNumber: gr.receiptNumber,
                subtotal: gr.subtotal,
                taxAmount: gr.taxAmount,
                grandTotal: gr.grandTotal
            }
        });
    }

    // 2. Restore Sales Deliveries
    for (const sd of backupData.salesDeliveries) {
        await prisma.salesDelivery.update({
            where: { id: sd.id },
            data: {
                subtotal: sd.subtotal,
                taxAmount: sd.taxAmount,
                grandTotal: sd.grandTotal
            }
        });
    }

    console.log("✅ Emergency Restore Completed Successfully!");
}

restoreTotals()
    .catch(e => {
        console.error("❌ Restore Failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
