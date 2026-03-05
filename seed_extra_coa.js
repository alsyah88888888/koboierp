const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const accounts = [
        { code: '106', name: 'PPN Masukan (VAT Input)', type: 'ASSET' },
        { code: '502', name: 'Potongan Pembelian (Purchase Discount)', type: 'INCOME' } // Recorded as income/contra-expense
    ];

    console.log('Seeding extra COA accounts...');
    for (const acc of accounts) {
        await prisma.financeAccount.upsert({
            where: { code: acc.code },
            update: { name: acc.name, type: acc.type },
            create: acc
        });
        console.log(`Synced account: ${acc.code} - ${acc.name}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
