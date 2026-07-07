import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const tx = await prisma.financeTransaction.findUnique({
        where: { id: 'cmqau7buc00abl1ft86xr9bz8' }
    });
    console.log("Finance Transaction cmqau7buc00abl1ft86xr9bz8:");
    console.log(tx);
}

main().catch(console.error).finally(() => prisma.$disconnect());
