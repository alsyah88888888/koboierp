
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function finalFix() {
    console.log("Restoring original numbers from existing SalesOrder records...");
    const orders = await prisma.salesOrder.findMany({ include: { deliveries: true } });
    for (const o of orders) {
        for (const d of o.deliveries) {
            await prisma.salesDelivery.update({
                where: { id: d.id },
                data: { deliveryNumber: o.orderNumber }
            });
        }
    }

    console.log("Forcing SQL cleanup...");
    await prisma.$executeRawUnsafe(`UPDATE "SalesDeliveryItem" SET "orderItemId" = NULL`);
    await prisma.$executeRawUnsafe(`UPDATE "SalesDelivery" SET "orderId" = NULL`);
    await prisma.$executeRawUnsafe(`DELETE FROM "SalesOrderItem"`);
    await prisma.$executeRawUnsafe(`DELETE FROM "SalesOrder"`);

    console.log("Starting PURE 1-to-1 Migration...");
    const deliveries = await prisma.salesDelivery.findMany({
        include: { items: { include: { product: true } } }
    });

    let count = 0;
    for (const d of deliveries) {
        try {
            await prisma.$transaction(async (tx) => {
                const order = await tx.salesOrder.create({
                    data: {
                        orderNumber: d.deliveryNumber,
                        recipient: d.recipient,
                        buyerName: d.buyerName,
                        salesPerson: d.salesPerson,
                        date: d.date,
                        warehouseId: d.warehouseId,
                        status: "CLOSED",
                        subtotal: d.subtotal,
                        totalDiscount: d.totalDiscount,
                        taxRate: d.taxRate,
                        taxAmount: d.taxAmount,
                        grandTotal: d.grandTotal,
                        createdById: d.createdById,
                        createdAt: d.createdAt,
                        items: {
                            create: d.items.map((i: any) => ({
                                productId: i.productId,
                                quantity: i.quantity,
                                shippedQuantity: i.quantity,
                                salesPrice: i.salesPrice || 0,
                                discount: i.discount || 0,
                                uom: i.uom || i.product?.uom || "",
                                vendorName: i.vendorName || "UMUM"
                            }))
                        }
                    },
                    include: { items: true }
                });

                // For the NEW SJ number, we use a GUARANTEED unique format
                // because we need to satisfy the unique constraint on SalesDelivery.deliveryNumber
                const dateObj = new Date(d.date);
                const dateStr = `${String(dateObj.getDate()).padStart(2, '0')}${String(dateObj.getMonth() + 1).padStart(2, '0')}${dateObj.getFullYear()}`;
                
                // Use the ID to be absolutely safe
                const shortId = d.id.slice(-6).toUpperCase();
                const newSjNumber = `KB-SJ-${dateStr}-${shortId}-1`;

                await tx.salesDelivery.update({
                    where: { id: d.id },
                    data: {
                        orderId: order.id,
                        deliveryNumber: newSjNumber
                    }
                });

                await tx.stockMovement.updateMany({
                    where: { reference: d.deliveryNumber },
                    data: { reference: newSjNumber }
                });

                for (const item of d.items) {
                    const orderItem = order.items.find((oi: any) => oi.productId === item.productId);
                    if (orderItem) {
                        await tx.salesDeliveryItem.update({
                            where: { id: item.id },
                            data: { orderItemId: orderItem.id }
                        });
                    }
                }
                count++;
            });
        } catch (err: any) {
            console.error(`Failed ${d.deliveryNumber}:`, err.message);
        }
    }
    console.log(`Migration Finished. Total Success: ${count}`);
}

finalFix().finally(() => prisma.$disconnect());
