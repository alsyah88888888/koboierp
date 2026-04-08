import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPrefixes() {
    const sales = await prisma.salesDelivery.findMany({
        select: { deliveryNumber: true }
    });
    
    const prefixes: Record<string, number> = {};
    sales.forEach(s => {
        const prefix = s.deliveryNumber.substring(0, s.deliveryNumber.lastIndexOf('-', s.deliveryNumber.lastIndexOf('-') - 1) + 1);
        // Better: just get the part before the date
        const matches = s.deliveryNumber.match(/^(KB-[A-Z]+)-/);
        if (matches) {
            const p = matches[1];
            prefixes[p] = (prefixes[p] || 0) + 1;
        } else {
            prefixes["OTHER"] = (prefixes["OTHER"] || 0) + 1;
        }
    });

    console.log("Sales Prefix Distribution:");
    console.log(prefixes);
}

checkPrefixes()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
