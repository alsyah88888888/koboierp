const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    const deliveryNumber = 'SJ-829-22062026-018';
    const lotIdToAssign = 'cmqq6speu01v9l12bq96s6gnz'; // SOFRIYATIN

    const delivery = await prisma.salesDelivery.findUnique({
        where: { deliveryNumber },
        include: { items: { include: { lotAllocations: true, product: true } } }
    });

    if (!delivery) return console.log("Not found");

    const item = delivery.items.find(i => i.product.sku === 'BEVKAP-993' || i.productId === 'cmo9vtgr0006ml1s9nikmws75');

    const currentAllocation = item.lotAllocations[0];
    console.log("Current allocation:", currentAllocation.lotId);

    if (currentAllocation.lotId === lotIdToAssign) {
        console.log("Already assigned");
        return;
    }

    // Restore old lot
    await prisma.productLot.update({
        where: { id: currentAllocation.lotId },
        data: { remainingQty: { increment: currentAllocation.qty } }
    });

    // Deduct new lot
    await prisma.productLot.update({
        where: { id: lotIdToAssign },
        data: { remainingQty: { decrement: currentAllocation.qty } }
    });

    const newLot = await prisma.productLot.findUnique({ where: { id: lotIdToAssign } });

    // Update allocation
    await prisma.lotAllocation.update({
        where: { id: currentAllocation.id },
        data: { lotId: lotIdToAssign, hppAtTime: newLot.purchasePrice }
    });

    // Update vendorName
    await prisma.salesDeliveryItem.update({
        where: { id: item.id },
        data: { vendorName: 'SOFRIYATIN' }
    });

    // Bump updatedAt
    await prisma.salesDelivery.update({
        where: { id: delivery.id },
        data: { updatedAt: new Date() }
    });

    console.log("Fixed!");
}

fix().catch(console.error).finally(() => prisma.$disconnect());
