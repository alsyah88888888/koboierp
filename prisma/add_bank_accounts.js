const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const newAccounts = [
        { code: '106', name: 'Bank BCA 678', type: 'ASSET' },
        { code: '107', name: 'Bank BCA 461', type: 'ASSET' },
        { code: '108', name: 'Bank BCA 718 (PKP)', type: 'ASSET' },
        { code: '109', name: 'Maybank 269', type: 'ASSET' },
    ];

    console.log('Adding new bank accounts...');
    for (const acc of newAccounts) {
        await prisma.financeAccount.upsert({
            where: { code: acc.code },
            update: { name: acc.name, type: acc.type },
            create: acc
        });
        console.log(`Synced: ${acc.code} - ${acc.name}`);
    }
    console.log('Bank accounts added successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
