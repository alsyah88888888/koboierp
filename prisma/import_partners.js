const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

// Simple CSV parser that handles quotes and newlines
function parseCSV(content) {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const nextChar = content[i + 1];

        if (inQuotes) {
            if (char === '"') {
                if (nextChar === '"') {
                    currentField += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                currentField += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                currentRow.push(currentField.trim());
                currentField = '';
            } else if (char === '\n' || char === '\r') {
                if (char === '\r' && nextChar === '\n') i++;
                currentRow.push(currentField.trim());
                if (currentRow.length > 1 || currentRow[0] !== '') {
                    rows.push(currentRow);
                }
                currentRow = [];
                currentField = '';
            } else {
                currentField += char;
            }
        }
    }
    if (currentRow.length > 0 || currentField !== '') {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
    }
    return rows;
}

async function importSuppliers() {
    console.log('Importing Suppliers...');
    const csvPath = path.join(__dirname, '../Daftar Nama Supplier.csv');
    if (!fs.existsSync(csvPath)) {
        console.warn('Supplier CSV not found!');
        return;
    }
    const content = fs.readFileSync(csvPath, 'utf-8');
    const rows = parseCSV(content);

    // Header: No.,ID Pemasok,Nama,Kontak,No. Telp. Bisnis,Handphone,Email,Alamat,Kota,Provinsi,Negara,Kode Pos,Catatan,Hutang,Uang muka,NPWP,NIK,Nama Wajib Pajak
    let count = 0;
    for (const row of rows.slice(1)) {
        if (row.length < 3) continue;
        const code = row[1];
        const name = row[2];
        const phone = row[4] || row[5];
        const email = row[6];
        const address = row[7];
        const city = row[8];
        const province = row[9];
        const postalCode = row[11];
        const npwp = row[15];
        const taxName = row[17];
        const balance = parseFloat((row[13] || "0").replace(/[^0-9.-]/g, "")) || 0;

        await prisma.vendor.upsert({
            where: { code: code },
            update: {
                name, phone, email, address, city, province, postalCode, npwp, taxName, balance
            },
            create: {
                code, name, phone, email, address, city, province, postalCode, npwp, taxName, balance
            }
        });
        count++;
    }
    console.log(`Imported ${count} suppliers.`);
}

async function importBuyers() {
    console.log('Importing Buyers...');
    const csvPath = path.join(__dirname, '../Daftar Nama Buyer.csv');
    if (!fs.existsSync(csvPath)) {
        console.warn('Buyer CSV not found!');
        return;
    }
    const content = fs.readFileSync(csvPath, 'utf-8');
    const rows = parseCSV(content);

    // Header: No.,ID Pelanggan,Nama,Alamat,Kota,Provinsi,Negara,Kode Pos,NPWP,Nama Wajib Pajak,Hutang,Nomor Faktur
    let count = 0;
    for (const row of rows.slice(1)) {
        if (row.length < 3) continue;
        const code = row[1];
        const name = row[2];
        const address = row[3];
        const city = row[4];
        const province = row[5];
        const postalCode = row[7];
        const npwp = row[8];
        const taxName = row[9];
        const balance = parseFloat((row[10] || "0").replace(/[^0-9.-]/g, "")) || 0;

        await prisma.customer.upsert({
            where: { code: code },
            update: {
                name, address, city, province, postalCode, npwp, taxName, balance
            },
            create: {
                code, name, address, city, province, postalCode, npwp, taxName, balance
            }
        });
        count++;
    }
    console.log(`Imported ${count} buyers.`);
}

async function main() {
    await importSuppliers();
    await importBuyers();
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
