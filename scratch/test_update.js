const { updateSalesDeliveryService } = require('../src/lib/services/sales-service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const delivery = await prisma.salesDelivery.findFirst({
        where: { invoiceNumber: 'KB-TRN-18062026-002' },
        include: { items: true }
    });

    if (!delivery) {
        console.log("Delivery not found");
        return;
    }

    const item = delivery.items[0];

    // Find the SOFRIYATIN lot for this product
    const lot = await prisma.productLot.findFirst({
        where: {
            productId: item.productId,
            supplierName: 'SOFRIYATIN'
        }
    });

    console.log("Found SOFRIYATIN lot:", lot?.id, lot?.supplierName, "remainingQty:", lot?.remainingQty);

    const data = {
        invoiceNumber: delivery.invoiceNumber,
        warehouseId: delivery.warehouseId,
        items: [{
            productId: item.productId,
            quantity: item.quantity,
            salesPrice: Number(item.salesPrice),
            uom: item.uom,
            vendorName: 'SOFRIYATIN',
            selectedLotId: lot.id
        }]
    };

    console.log("Calling updateSalesDeliveryService...");
    await updateSalesDeliveryService(delivery.id, data, delivery.createdById);
    console.log("Done.");
}

test().catch(console.error).finally(() => prisma.$disconnect());
