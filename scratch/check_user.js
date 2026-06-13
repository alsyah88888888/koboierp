const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({ where: { email: 'fatiatunisia@kolaborasi.id' } });
    console.log("User:", user);
    
    // Check their purchase receipts
    if (user) {
        const receipts = await prisma.goodsReceipt.count({ where: { createdById: user.id } });
        console.log("Receipts count:", receipts);
    }
}
main().finally(() => prisma.$disconnect());
