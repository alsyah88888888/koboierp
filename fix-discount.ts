const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const gr = await prisma.goodsReceipt.update({
        where: { id: 'cmq9bn3rz006fl1duybvqif44' },
        data: {
            totalDiscount: 1,
            grandTotal: 51285000,
            paidAmount: 51285000
        }
    });
    console.log("Updated GR successfully:", gr.grandTotal);
}
main().catch(console.error).finally(() => prisma.$disconnect());
