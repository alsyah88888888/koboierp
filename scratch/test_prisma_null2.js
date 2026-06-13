const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const herId = "cmqbtm6mw00ayl1jw1pops10h";
    
    const countTotal = await prisma.goodsReceipt.count({
        where: { createdById: herId }
    });
    
    const countFiltered = await prisma.goodsReceipt.count({
        where: {
            OR: [{ salesPerson: "BC" }, { createdById: herId }],
            NOT: { salesPerson: "PF" }
        }
    });
    
    console.log("Total for her:", countTotal);
    console.log("Filtered for her:", countFiltered);
}
main().finally(() => prisma.$disconnect());
