
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function listCOA() {
    const accounts = await prisma.financeAccount.findMany({
        orderBy: { code: 'asc' }
    });

    console.log('--- CHART OF ACCOUNTS ---');
    accounts.forEach(a => {
        console.log(`${a.code} | ${a.name} | ${a.type}`);
    });
    console.log('-------------------------');
}

listCOA()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
