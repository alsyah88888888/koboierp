
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function absoluteCleanupAndMigrate() {
    console.log("Starting ABSOLUTE cleanup...");
    
    try {
        // 1. Unlink everything from SalesOrder and SalesOrderItem
        await prisma.salesDeliveryItem.updateMany({ data: { orderItemId: null } });
        await prisma.salesDelivery.updateMany({ data: { orderId: null } });
        
        // 2. Delete children first
        await prisma.salesOrderItem.deleteMany({});
        
        // 3. Delete SalesOrder
        await prisma.salesOrder.deleteMany({});
        
        console.log("Cleanup successful. Database is ready.");
    } catch (e: any) {
        console.error("Cleanup failed:", e.message);
        return;
    }

    console.log("Starting migration for 671+ records...");

    const deliveries = await prisma.salesDelivery.findMany({
        include: { items: { include: { product: true } } }
    });

    let successCount = 0;
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

                const date = new Date(d.date);
                const dateStr = `${String(date.getDate()).padStart(2, '0')}${String(date.getMonth() + 1).padStart(2, '0')}${date.getFullYear()}`;
                const parts = d.deliveryNumber.split('-');
                const typeCode = parts[1] || "SJ";
                const seq = parts[parts.length - 1] || "000";
                const shortId = d.id.slice(-4).toUpperCase();
                
                // Keep the number as user requested: KB-SJ-date-seq-shipmentCount
                // Adding typeCode to ensure uniqueness between TRN/TRD
                const newSjNumber = `KB-SJ-${dateStr}-${typeCode}-${seq}-1`;

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
                successCount++;
            });
        } catch (err: any) {
            console.error(`Failed to migrate ${d.deliveryNumber}:`, err.message);
        }
    }

    console.log(`Migration COMPLETED. Total Migrated: ${successCount}`);
}

absoluteCleanupAndMigrate().finally(() => prisma.$disconnect());
