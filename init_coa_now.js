
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const STANDARD_ACCOUNTS = [
    { code: '101', name: 'Kas Kantor', type: 'ASSET' },
    { code: '102', name: 'Bank BCA', type: 'ASSET' },
    { code: '104', name: 'Persediaan Barang', type: 'ASSET' },
    { code: '105', name: 'Piutang Pelanggan (AR)', type: 'ASSET' },
    { code: '201', name: 'Hutang Supplier (AP)', type: 'LIABILITY' },
    { code: '401', name: 'Pendapatan Penjualan', type: 'REVENUE' },
    { code: '501', name: 'Harga Pokok Penjualan (HPP)', type: 'EXPENSE' },
    { code: '601', name: 'Biaya Operasional', type: 'EXPENSE' },
    { code: '602', name: 'Biaya Gaji & Upah', type: 'EXPENSE' },
    { code: '603', name: 'Biaya Listrik, Air & WiFi', type: 'EXPENSE' },
];

async function main() {
    console.log('Ensuring Standard COA Accounts exist...');
    for (const acc of STANDARD_ACCOUNTS) {
        const existing = await prisma.financeAccount.findUnique({
            where: { code: acc.code }
        });
        if (!existing) {
            await prisma.financeAccount.create({ data: acc });
            console.log(`Created: ${acc.code}`);
        } else {
            console.log(`Exists: ${acc.code}`);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
