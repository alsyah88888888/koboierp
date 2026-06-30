import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('=== UPDATING PAYMENT JOURNAL ENTRIES ===');
    
    // 1. Find the target entry: Debit of 5,950,000 for Pak Hari/SJ-573-29062026-008
    const targetEntry = await prisma.journalEntry.findFirst({
        where: {
            description: { contains: 'SJ-573-29062026-008' },
            amount: 5950000,
            type: 'DEBIT'
        }
    });

    if (!targetEntry) {
        console.error('Target entry of 5,950,000 not found!');
        return;
    }

    console.log(`Found Entry: ${targetEntry.id} | Desc: ${targetEntry.description} | Current Account Code: ${targetEntry.accountId}`);

    // Find account ID for Kas Tunai / Kas Kecil (Code: 101)
    const kasAccount = await prisma.financeAccount.findFirst({
        where: { code: '101' }
    });

    if (!kasAccount) {
        console.error('Kas Tunai account (101) not found!');
        return;
    }

    // 2. Update the entry to point to Kas account and adjust description if necessary
    const updated = await prisma.journalEntry.update({
        where: { id: targetEntry.id },
        data: {
            accountId: kasAccount.id,
            description: targetEntry.description.replace('Kas Bank', 'Kas Tunai')
        },
        include: {
            account: true
        }
    });

    console.log(`\nUpdated Entry: ${updated.id} | Desc: ${updated.description} | New Account: ${updated.account?.name} (${updated.account?.code})`);

    // Verify all entries for SJ-573-29062026-008
    const entries = await prisma.journalEntry.findMany({
        where: {
            description: { contains: 'SJ-573-29062026-008' }
        },
        include: {
            account: true
        }
    });
    console.log('\n=== VERIFY CURRENT JOURNAL ENTRIES ===');
    for (const e of entries) {
        console.log(`ID: ${e.id} | Date: ${e.date?.toISOString().slice(0, 10)} | Desc: ${e.description} | Type: ${e.type} | Amount: ${e.amount} | Account: ${e.account?.name} (${e.account?.code})`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
