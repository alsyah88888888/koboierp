import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyDettolOps() {
    console.log("=== VERIFIKASI OPS: SJ-450-12062026-012 / KB-TRN-09062026-002 ===\n");

    // 1. Sales Delivery
    const sd = await prisma.salesDelivery.findFirst({
        where: { deliveryNumber: 'SJ-450-12062026-012' },
        include: {
            items: { include: { product: { select: { name: true, barcode: true } } } }
        }
    });

    if (!sd) return console.log("SD not found!");

    console.log(`📄 ${sd.deliveryNumber} | Invoice: ${sd.invoiceNumber}`);
    console.log(`   Buyer: ${sd.buyerName} | Sales: ${sd.salesPerson}`);
    console.log(`   Date: ${sd.date?.toISOString().split('T')[0]}`);
    console.log(`   Items: ${sd.items.length}`);
    const totalQty = sd.items.reduce((s, i) => s + i.quantity, 0);
    console.log(`   Total Qty: ${totalQty}`);

    // 2. Check ALL finance transactions that contain this invoice number
    const invoiceNumber = sd.invoiceNumber || sd.deliveryNumber;
    console.log(`\n=== Finance Transactions containing "${invoiceNumber}" ===\n`);

    const transactions = await prisma.financeTransaction.findMany({
        where: { invoiceNumber: { contains: invoiceNumber } },
        orderBy: { date: 'asc' }
    });

    console.log(`Found ${transactions.length} transactions:\n`);
    let totalOps = 0;
    for (const t of transactions) {
        const amt = Number(t.amount);
        console.log(`  ID: ${t.id.substring(0, 8)}...`);
        console.log(`  Type: ${t.transactionType} | Category: ${t.category}`);
        console.log(`  Date: ${t.date?.toISOString().split('T')[0]}`);
        console.log(`  Amount: Rp ${amt.toLocaleString()}`);
        console.log(`  Description: ${t.description}`);
        console.log(`  InvoiceNumber: ${t.invoiceNumber}`);
        console.log(`  Partner: ${t.partnerName}`);
        console.log();

        // OPS calculation logic from report
        const isOps = (t.transactionType === "PAYMENT" || t.transactionType === "EXPENSE" || amt < 0);
        const opsAmt = isOps ? Math.abs(amt) : -Math.abs(amt);
        totalOps += opsAmt;
    }

    console.log(`=== Total OPS (calculated): Rp ${totalOps.toLocaleString()} ===`);

    // 3. Check if the invoice number is shared with other deliveries
    console.log(`\n=== Other deliveries with same invoice "${invoiceNumber}" ===\n`);
    const otherDeliveries = await prisma.salesDelivery.findMany({
        where: { 
            OR: [
                { invoiceNumber: invoiceNumber },
                { invoiceNumber: { contains: invoiceNumber } }
            ],
            isVoid: false
        },
        include: { items: true }
    });

    for (const d of otherDeliveries) {
        const qty = d.items.reduce((s, i) => s + i.quantity, 0);
        console.log(`  ${d.deliveryNumber} | Invoice: ${d.invoiceNumber} | Qty: ${qty} | Date: ${d.date?.toISOString().split('T')[0]}`);
    }

    // 4. Also check transactions that might have comma-separated invoice numbers
    console.log(`\n=== Transactions with comma-separated invoices containing "${invoiceNumber}" ===`);
    const commaTransactions = await prisma.financeTransaction.findMany({
        where: { invoiceNumber: { contains: ',' } },
        select: { invoiceNumber: true, amount: true, transactionType: true, description: true }
    });

    for (const t of commaTransactions) {
        if (t.invoiceNumber && t.invoiceNumber.includes(invoiceNumber)) {
            console.log(`  Invoice: ${t.invoiceNumber}`);
            console.log(`  Amount: Rp ${Number(t.amount).toLocaleString()} | Type: ${t.transactionType}`);
            console.log(`  Desc: ${t.description}`);
            const invoices = t.invoiceNumber.split(',').map(s => s.trim());
            console.log(`  Shared with ${invoices.length} invoices: ${invoices.join(', ')}`);
            console.log();
        }
    }
}

verifyDettolOps()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
