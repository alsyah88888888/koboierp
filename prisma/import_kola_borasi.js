const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function main() {
    console.log('Importing Master Data from CSV...');

    const csvPath = path.join(__dirname, '../Master Data Kola Borasi.csv');
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = fileContent.split('\n');

    let importedCount = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',');
        // ID, Category, Brand, SKU, Product Name, Barcode, UOM, Stock Status
        // 0,  1,        2,     3,   4,            5,       6,   7

        if (parts.length < 5) continue;

        const category = parts[1]?.trim();
        const brand = parts[2]?.trim();
        const sku = parts[3]?.trim();
        const name = parts[4]?.trim();
        const barcode = parts[5]?.trim();
        const uom = parts[6]?.trim();

        if (!sku || !name || sku === 'SKU') continue;

        try {
            await prisma.product.upsert({
                where: { sku: sku },
                update: {
                    name: name,
                    category: category,
                    brand: brand,
                    barcode: barcode,
                    uom: uom
                },
                create: {
                    sku: sku,
                    name: name,
                    category: category,
                    brand: brand,
                    barcode: barcode,
                    uom: uom,
                    lowStockThreshold: 10
                }
            });
            importedCount++;
        } catch (err) {
            // Skip errors
        }
    }

    // Create a default warehouse if not exists
    await prisma.warehouse.upsert({
        where: { id: 'default-wh' },
        update: {},
        create: {
            id: 'default-wh',
            name: 'Gudang Utama',
            location: 'Jakarta'
        }
    });

    // Create a default vendor if not exists
    await prisma.vendor.upsert({
        where: { id: 'default-vendor' },
        update: {},
        create: {
            id: 'default-vendor',
            name: 'Supplier Umum',
            email: 'vendor@example.com'
        }
    });

    // Create a default customer/buyer
    await prisma.customer.upsert({
        where: { id: 'default-customer' },
        update: {},
        create: {
            id: 'default-customer',
            name: 'Customer Umum',
            email: 'customer@example.com'
        }
    });

    // Finance Accounts
    const defaultAccounts = [
        { code: '101', name: 'Kas Utama', type: 'ASSET' },
        { code: '102', name: 'Bank BCA', type: 'ASSET' },
        { code: '103', name: 'Bank Mandiri', type: 'ASSET' },
        { code: '104', name: 'Persediaan Barang', type: 'ASSET' },
        { code: '105', name: 'Piutang Usaha', type: 'ASSET' },
        { code: '201', name: 'Hutang Usaha', type: 'LIABILITY' },
        { code: '401', name: 'Pendapatan Penjualan', type: 'INCOME' },
        { code: '501', name: 'Biaya Gaji', type: 'EXPENSE' },
        { code: '502', name: 'Biaya Listrik & Air', type: 'EXPENSE' },
        { code: '503', name: 'Biaya Sewa', type: 'EXPENSE' },
        { code: '504', name: 'Biaya Operasional Lain', type: 'EXPENSE' },
    ];

    for (const acc of defaultAccounts) {
        await prisma.financeAccount.upsert({
            where: { code: acc.code },
            update: { name: acc.name, type: acc.type },
            create: acc
        });
    }

    console.log(`Successfully imported ${importedCount} products and initialized default entities.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
