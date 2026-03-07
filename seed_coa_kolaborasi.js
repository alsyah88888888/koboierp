const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const accounts = [
        // ASET (100)
        { code: '101', name: 'Kas Tunai / Kas Kecil', type: 'ASSET' },
        { code: '102', name: 'Bank BCA', type: 'ASSET' },
        { code: '103', name: 'Bank Lainnya', type: 'ASSET' },
        { code: '104', name: 'Persediaan Barang Dagang', type: 'ASSET' },
        { code: '105', name: 'Piutang Usaha / Pelanggan', type: 'ASSET' },
        { code: '106', name: 'PPN Masukan / Input VAT', type: 'ASSET' },
        { code: '120', name: 'Aset Tetap', type: 'ASSET' },
        { code: '121', name: 'Akumulasi Penyusutan Aset Tetap', type: 'ASSET' },

        // LIABILITAS (200)
        { code: '201', name: 'Hutang Usaha / Supplier', type: 'LIABILITY' },
        { code: '202', name: 'PPN Keluaran / Output VAT', type: 'LIABILITY' },
        { code: '203', name: 'Hutang Pajak Lainnya', type: 'LIABILITY' },
        { code: '204', name: 'Hutang Gaji', type: 'LIABILITY' },

        // EKUITAS (300)
        { code: '301', name: 'Modal Disetor', type: 'EQUITY' },
        { code: '302', name: 'Laba Ditahan', type: 'EQUITY' },

        // PENDAPATAN (400)
        { code: '401', name: 'Pendapatan Penjualan', type: 'INCOME' },
        { code: '402', name: 'Potongan Penjualan', type: 'INCOME' },
        { code: '403', name: 'Retur Penjualan', type: 'INCOME' },
        { code: '404', name: 'Pendapatan Lain-lain', type: 'INCOME' },

        // HARGA POKOK & BIAYA (500)
        { code: '501', name: 'Harga Pokok Penjualan (HPP)', type: 'EXPENSE' },
        { code: '502', name: 'Potongan Pembelian', type: 'INCOME' }, // Income or Contra-Expense
        { code: '503', name: 'Retur Pembelian', type: 'INCOME' },
        { code: '504', name: 'Biaya Angkut Pembelian', type: 'EXPENSE' },

        // BIAYA OPERASIONAL (600)
        { code: '601', name: 'Biaya Operasional (BBM, Parkir, dll)', type: 'EXPENSE' },
        { code: '602', name: 'Biaya Gaji, Upah, & Tunjangan', type: 'EXPENSE' },
        { code: '603', name: 'Biaya Utilitas (Listrik, Air & WiFi)', type: 'EXPENSE' },
        { code: '604', name: 'Biaya Pemasaran & Promosi', type: 'EXPENSE' },
        { code: '605', name: 'Biaya Sewa Bangunan / Gudang', type: 'EXPENSE' },
        { code: '606', name: 'Biaya Penyusutan', type: 'EXPENSE' },
        { code: '607', name: 'Biaya Lain-lain', type: 'EXPENSE' },
    ];

    console.log('Menyinkronkan Chart of Accounts untuk PT Kolaborasi Indonesia...');
    for (const acc of accounts) {
        await prisma.financeAccount.upsert({
            where: { code: acc.code },
            update: { name: acc.name, type: acc.type },
            create: acc
        });
        console.log(`[OK] => ${acc.code} - ${acc.name}`);
    }
    console.log('Sinkronisasi COA Selesai!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
