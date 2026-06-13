const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const receipts = await prisma.goodsReceipt.findMany({
        where: {
            OR: [{ salesPerson: "BC" }, { createdById: "cmqbtm6mw00ayl1jw1pops10h" }],
            NOT: { salesPerson: "PF" }
        }
    });
    console.log("Filtered count:", receipts.length);
}
main().finally(() => prisma.$disconnect());
