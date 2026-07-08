import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const startDate = new Date('2026-06-01T00:00:00Z');
    const endDate = new Date('2026-06-30T23:59:59Z');

    const unlinkedOps = await prisma.financeTransaction.findMany({
        where: {
            date: { gte: startDate, lte: endDate },
            category: 'OPERASIONAL',
            OR: [{ invoiceNumber: null }, { invoiceNumber: '' }],
            salesPerson: { startsWith: 'BC' }
        },
        orderBy: { date: 'asc' }
    });

    let total = 0;
    console.log("=== BREAKDOWN BIAYA UMUM (UNLINKED) BC - JUNI 2026 ===\n");
    unlinkedOps.forEach((op: any) => {
        const amt = Number(op.amount);
        total += amt;
        console.log(`Tgl: ${op.date.toISOString().split('T')[0]} | Rp ${Math.abs(amt)} | Ref: ${op.reference || '-'} | Ket: ${op.description}`);
    });
    
    console.log(`\nTOTAL BIAYA UMUM BC: Rp ${total}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
