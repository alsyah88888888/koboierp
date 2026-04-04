
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function backupTotals() {
    console.log("🛡️ Starting Database Totals Backup...");

    const receipts = await prisma.goodsReceipt.findMany({
        select: {
            id: true,
            receiptNumber: true,
            subtotal: true,
            taxAmount: true,
            grandTotal: true
        }
    });

    const deliveries = await prisma.salesDelivery.findMany({
        select: {
            id: true,
            deliveryNumber: true,
            subtotal: true,
            taxAmount: true,
            grandTotal: true
        }
    });

    const backupData = {
        timestamp: new Date().toISOString(),
        goodsReceipts: receipts,
        salesDeliveries: deliveries
    };

    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir);
    }

    const filename = `rounding_backup_${Date.now()}.json`;
    const filePath = path.join(backupDir, filename);
    
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
    
    console.log(`✅ Backup Successful! File saved to: scripts/../backups/${filename}`);
    console.log(`📊 Backed up ${receipts.length} LPB and ${deliveries.length} Penjualan records.`);
}

backupTotals()
    .catch(e => {
        console.error("❌ Backup Failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
