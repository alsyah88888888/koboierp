
import { revalidatePath } from "next/cache";

/**
 * SALES SERVICES
 * Strictly server-side logic for sales operations.
 */

export async function createSalesDeliveryService(data: any, userId: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    const txDate = data.createdAt || new Date();
    const day = String(txDate.getDate()).padStart(2, '0');
    const month = String(txDate.getMonth() + 1).padStart(2, '0');
    const year = txDate.getFullYear();
    const dateStr = `${day}${month}${year}`;

    return await prisma.$transaction(async (tx: any) => {
        const isPKP = data.isPKP === true || (Number(data.taxRate) || 0) > 0;

        const prefix = isPKP ? `KB-TRN-${dateStr}-` : `KB-TRD-${dateStr}-`;

        const latest = await tx.salesDelivery.findFirst({
            where: { deliveryNumber: { startsWith: prefix } },
            orderBy: { deliveryNumber: 'desc' }
        });

        let nextNum = 1;
        if (latest) {
            const parts = latest.deliveryNumber.split('-');
            const lastSeq = parseInt(parts[parts.length - 1]);
            if (!isNaN(lastSeq)) nextNum = lastSeq + 1;
        }
        const deliveryNumber = `${prefix}${String(nextNum).padStart(3, '0')}`;

        const delivery = await tx.salesDelivery.create({
            data: {
                deliveryNumber: deliveryNumber,
                orderId: data.orderId || null,
                recipient: data.recipient,
                buyerName: data.buyerName,
                vehicleNumber: data.vehicleNumber,
                poNumber: data.poNumber,
                warehouseId: data.warehouseId,
                salesPerson: data.salesPerson,
                date: txDate,
                createdAt: txDate,
                createdById: userId,
                items: {
                    create: data.items.map((item: any) => ({
                        productId: item.productId,
                        orderItemId: item.orderItemId || null,
                        quantity: item.quantity,
                        salesPrice: item.salesPrice as any,
                        uom: item.uom,
                        vendorName: item.vendorName || "UMUM"
                    }))
                }
            },
            include: { items: true }
        });

        let grossAmount = 0;
        let totalItemDiscounts = 0;
        data.items.forEach((i: any) => {
            const lineGross = i.quantity * i.salesPrice;
            const lineDiscount = Number(i.discount || 0);
            grossAmount += lineGross;
            totalItemDiscounts += lineDiscount;
        });

        const subtotal = Math.round(grossAmount - totalItemDiscounts);
        const totalDiscountNominal = Math.round(Number(data.totalDiscount) || 0);
        const taxRatePercent = Number(data.taxRate) || 0;
        const dpp = subtotal - totalDiscountNominal;
        const dppNilaiLain = taxRatePercent > 0 ? Math.round(dpp * 0.916666666666667) : 0;
        const taxAmount = taxRatePercent > 0 ? Math.round(dppNilaiLain * 0.12) : 0;
        const grandTotal = Math.round(dpp + taxAmount);

        await tx.salesDelivery.update({
            where: { id: delivery.id },
            data: {
                subtotal: subtotal,
                totalDiscount: totalDiscountNominal,
                taxRate: taxRatePercent,
                taxAmount: taxAmount,
                grandTotal: grandTotal
            }
        });

        for (const inputItem of data.items) {
            if (inputItem.discount && inputItem.discount > 0) {
                await tx.salesDeliveryItem.updateMany({
                    where: { deliveryId: delivery.id, productId: inputItem.productId },
                    data: { discount: inputItem.discount }
                });
            }
        }

        // 4. Process items, update stock, and update PO quantities
        for (const item of data.items) {
            const vendorName = item.vendorName || "UMUM";
            
            // --- AUTO-LINK LOGIC ---
            // If linked to an Order but this specific item line doesn't have an orderItemId,
            // try to find a matching product in the order to ensure quantities are tracked.
            let effectiveOrderItemId = item.orderItemId;
            if (data.orderId && !effectiveOrderItemId) {
                const matchingOrderItem = await tx.salesOrderItem.findFirst({
                    where: { 
                        orderId: data.orderId,
                        productId: item.productId
                    }
                });
                if (matchingOrderItem) effectiveOrderItemId = matchingOrderItem.id;
            }

            // Update Stock
            const currentStock = await tx.stock.findUnique({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: item.productId,
                        warehouseId: data.warehouseId,
                        vendorName: vendorName
                    }
                }
            });

            if (!currentStock || currentStock.quantity < item.quantity) {
                const product = await tx.product.findUnique({ where: { id: item.productId } });
                throw new Error(`Stok tidak mencukupi untuk produk ${product?.name || item.productId} dari vendor ${vendorName}`);
            }

            await tx.stock.update({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: item.productId,
                        warehouseId: data.warehouseId,
                        vendorName: vendorName
                    }
                },
                data: { quantity: { decrement: item.quantity } }
            });

            await tx.stockMovement.create({
                data: {
                    productId: item.productId,
                    warehouseId: data.warehouseId,
                    vendorName: vendorName,
                    quantity: -item.quantity,
                    type: "SALE",
                    reference: deliveryNumber
                }
            });

            // If linked to a PO (explicitly or via Auto-Link), update shipped quantity
            if (effectiveOrderItemId) {
                // Update the SalesDeliveryItem record we just created to include the link
                await tx.salesDeliveryItem.updateMany({
                    where: { deliveryId: delivery.id, productId: item.productId, orderItemId: null },
                    data: { orderItemId: effectiveOrderItemId }
                });

                await tx.salesOrderItem.update({
                    where: { id: effectiveOrderItemId },
                    data: { shippedQuantity: { increment: item.quantity } }
                });
            }
        }
        
        // 5. Update Sales Order status if all items are shipped
        if (data.orderId) {
            const orderItems = await tx.salesOrderItem.findMany({
                where: { orderId: data.orderId }
            });
            const allShipped = orderItems.every((oi: any) => oi.shippedQuantity >= oi.quantity);
            const someShipped = orderItems.some((oi: any) => oi.shippedQuantity > 0);
            
            await tx.salesOrder.update({
                where: { id: data.orderId },
                data: { status: allShipped ? "CLOSED" : someShipped ? "PARTIAL" : "OPEN" }
            });
        }

        // ─── FASE 2b: FIFO Lot Allocation ─────────────────────────────────
        // Fetch the SalesDeliveryItems we just created (with their IDs)
        const createdDelivery = await tx.salesDelivery.findUnique({
            where: { id: delivery.id },
            include: { items: true }
        });

        if (createdDelivery) {
            for (const sdItem of createdDelivery.items) {
                let remaining = sdItem.quantity;

                // Get available lots for this product, FIFO order (oldest first)
                const availableLots = await tx.productLot.findMany({
                    where: {
                        productId: sdItem.productId,
                        remainingQty: { gt: 0 },
                        isVoided: false
                    },
                    orderBy: { grDate: 'asc' }
                });

                for (const lot of availableLots) {
                    if (remaining <= 0) break;
                    const consume = Math.min(remaining, lot.remainingQty);

                    // Create LotAllocation record
                    await tx.lotAllocation.create({
                        data: {
                            lotId: lot.id,
                            sdItemId: sdItem.id,
                            qty: consume,
                            hppAtTime: lot.purchasePrice
                        }
                    });

                    // Decrement lot remaining qty
                    await tx.productLot.update({
                        where: { id: lot.id },
                        data: { remainingQty: { decrement: consume } }
                    });

                    remaining -= consume;
                }
                // If remaining > 0: unallocated qty (stok beli belum ada / historis)
                // This is safe — report-service will still handle it gracefully
            }
        }
        // ─────────────────────────────────────────────────────────────────

        revalidatePath("/sales");
        revalidatePath("/warehouse");
        revalidatePath("/finance");
        revalidatePath("/");

        return { success: true, deliveryNumber };
    }, { timeout: 30000 });
}

export async function updateSalesDeliveryService(id: string, data: any, userId: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    return await prisma.$transaction(async (tx: any) => {
        const oldDelivery = await tx.salesDelivery.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!oldDelivery) throw new Error("Delivery not found");

        // Restore Old Stock before applying new updates
        for (const item of oldDelivery.items) {
            await tx.stock.upsert({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: item.productId,
                        warehouseId: oldDelivery.warehouseId,
                        vendorName: item.vendorName
                    }
                },
                create: {
                    productId: item.productId,
                    warehouseId: oldDelivery.warehouseId,
                    vendorName: item.vendorName,
                    quantity: item.quantity
                },
                update: { quantity: { increment: item.quantity } }
            });

            // ─── FASE 3c: Revoke old Lot allocations on Update ──────────
            const allocations = await tx.lotAllocation.findMany({
                where: { sdItemId: item.id }
            });
            for (const alloc of allocations) {
                await tx.productLot.update({
                    where: { id: alloc.lotId },
                    data: { remainingQty: { increment: alloc.qty } }
                });
                await tx.lotAllocation.delete({ where: { id: alloc.id } });
            }
            // ────────────────────────────────────────────────────────────
        }

        await tx.salesDeliveryItem.deleteMany({ where: { deliveryId: id } });

        const txDate = data.createdAt || new Date();
        const day = String(txDate.getDate()).padStart(2, '0');
        const month = String(txDate.getMonth() + 1).padStart(2, '0');
        const year = txDate.getFullYear();
        const dateStr = `${day}${month}${year}`;

        const isPKP = data.isPKP === true || (Number(data.taxRate) || 0) > 0;
        const oldIsPKP = Number(oldDelivery.taxRate) > 0;
        
        let deliveryNumber = oldDelivery.deliveryNumber;
        const oldNumber = deliveryNumber;

        // REGENERATE NUMBER IF PKP STATUS CHANGED
        if (isPKP !== oldIsPKP) {
            const prefix = isPKP ? `KB-TRN-${dateStr}-` : `KB-TRD-${dateStr}-`;
            const latest = await tx.salesDelivery.findFirst({
                where: { deliveryNumber: { startsWith: prefix } },
                orderBy: { deliveryNumber: 'desc' }
            });

            let nextNum = 1;
            if (latest) {
                const parts = latest.deliveryNumber.split('-');
                const lastSeq = parseInt(parts[parts.length - 1]);
                if (!isNaN(lastSeq)) nextNum = lastSeq + 1;
            }
            deliveryNumber = `${prefix}${String(nextNum).padStart(3, '0')}`;

            // Create notification for audit trail
            await tx.notification.create({
                data: {
                    title: "Perubahan Nomor Transaksi",
                    message: `Nomor transaksi ${oldNumber} telah diubah menjadi ${deliveryNumber} karena perubahan status pajak (PKP: ${isPKP}).`,
                    type: "warning",
                    authorId: userId
                }
            });

            // Update related stock movements reference
            await tx.stockMovement.updateMany({
                where: { reference: oldNumber },
                data: { reference: deliveryNumber }
            });
        }

        await tx.salesDelivery.update({
            where: { id },
            data: {
                deliveryNumber: deliveryNumber,
                recipient: data.recipient,
                buyerName: data.buyerName,
                vehicleNumber: data.vehicleNumber,
                poNumber: data.poNumber,
                warehouseId: data.warehouseId,
                salesPerson: data.salesPerson,
                date: txDate,
                createdAt: txDate
            }
        });

        for (const item of data.items) {
            const vendorName = item.vendorName || "UMUM";

            const currentStock = await tx.stock.findUnique({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: item.productId,
                        warehouseId: data.warehouseId,
                        vendorName: vendorName
                    }
                }
            });

            if (!currentStock || currentStock.quantity < item.quantity) {
                const product = await tx.product.findUnique({ where: { id: item.productId } });
                throw new Error(`Stok tidak mencukupi untuk produk ${product?.name || item.productId} dari vendor ${vendorName}. Tersedia: ${currentStock?.quantity || 0}, Dibutuhkan: ${item.quantity}`);
            }

            await tx.salesDeliveryItem.create({
                data: {
                    deliveryId: id,
                    productId: item.productId,
                    quantity: item.quantity,
                    salesPrice: item.salesPrice as any,
                    uom: item.uom,
                    vendorName: vendorName
                }
            });

            await tx.stock.update({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: item.productId,
                        warehouseId: data.warehouseId,
                        vendorName: vendorName
                    }
                },
                data: { quantity: { decrement: item.quantity } }
            });

            await tx.stockMovement.create({
                data: {
                    productId: item.productId,
                    warehouseId: data.warehouseId,
                    vendorName: vendorName,
                    quantity: -item.quantity,
                    type: "SALE_UPDATE",
                    reference: deliveryNumber
                }
            });
        }

        let grossAmount = 0;
        let totalItemDiscounts = 0;
        data.items.forEach((i: any) => {
            const lineGross = i.quantity * i.salesPrice;
            const lineDiscount = Number(i.discount || 0);
            grossAmount += lineGross;
            totalItemDiscounts += lineDiscount;
        });

        const subtotal = Math.round(grossAmount - totalItemDiscounts);
        const totalDiscountNominal = Math.round(Number(data.totalDiscount) || 0);
        const taxRatePercent = Number(data.taxRate) || 0;
        const dpp = subtotal - totalDiscountNominal;
        const dppNilaiLain = taxRatePercent > 0 ? Math.round(dpp * 0.916666666666667) : 0;
        const taxAmount = taxRatePercent > 0 ? Math.round(dppNilaiLain * 0.12) : 0;
        const grandTotal = Math.round(dpp + taxAmount);

        await tx.salesDelivery.update({
            where: { id },
            data: {
                subtotal: subtotal,
                totalDiscount: totalDiscountNominal,
                taxRate: taxRatePercent,
                taxAmount: taxAmount,
                grandTotal: grandTotal
            }
        });

        for (const inputItem of data.items) {
            if (inputItem.discount && inputItem.discount > 0) {
                await tx.salesDeliveryItem.updateMany({
                    where: { deliveryId: id, productId: inputItem.productId },
                    data: { discount: inputItem.discount }
                });
            }
        }

        revalidatePath("/sales");
        revalidatePath("/warehouse");
        revalidatePath("/finance");
        revalidatePath("/");

        // ─── FASE 3c: Re-allocate Lots for the updated items ────────────
        const updatedDelivery = await tx.salesDelivery.findUnique({
            where: { id },
            include: { items: true }
        });
        if (updatedDelivery) {
            for (const sdItem of updatedDelivery.items) {
                let remaining = sdItem.quantity;
                const availableLots = await tx.productLot.findMany({
                    where: { productId: sdItem.productId, remainingQty: { gt: 0 }, isVoided: false },
                    orderBy: { grDate: 'asc' }
                });
                for (const lot of availableLots) {
                    if (remaining <= 0) break;
                    const consume = Math.min(remaining, lot.remainingQty);
                    await tx.lotAllocation.create({
                        data: { lotId: lot.id, sdItemId: sdItem.id, qty: consume, hppAtTime: lot.purchasePrice }
                    });
                    await tx.productLot.update({
                        where: { id: lot.id },
                        data: { remainingQty: { decrement: consume } }
                    });
                    remaining -= consume;
                }
            }
        }
        // ────────────────────────────────────────────────────────────────

        return { success: true, deliveryNumber: deliveryNumber };
    }, { timeout: 30000 });
}


export async function deleteSalesDeliveryService(id: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    return await prisma.$transaction(async (tx: any) => {
        const delivery = await tx.salesDelivery.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!delivery) throw new Error("Delivery not found");

        for (const item of delivery.items) {
            await tx.stock.upsert({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: item.productId,
                        warehouseId: delivery.warehouseId,
                        vendorName: item.vendorName
                    }
                },
                create: {
                    productId: item.productId,
                    warehouseId: delivery.warehouseId,
                    vendorName: item.vendorName,
                    quantity: item.quantity
                },
                update: { quantity: { increment: item.quantity } }
            });

            await tx.stockMovement.create({
                data: {
                    productId: item.productId,
                    warehouseId: delivery.warehouseId,
                    vendorName: item.vendorName,
                    quantity: item.quantity,
                    type: "SALE_DELETE",
                    reference: delivery.deliveryNumber
                }
            });

            // ─── FASE 2d: Restore Lot allocations on Delete ────────────────
            const allocations = await tx.lotAllocation.findMany({
                where: { sdItemId: item.id }
            });
            for (const alloc of allocations) {
                await tx.productLot.update({
                    where: { id: alloc.lotId },
                    data: { remainingQty: { increment: alloc.qty } }
                });
                await tx.lotAllocation.delete({ where: { id: alloc.id } });
            }
            // ──────────────────────────────────────────────────────────────
        }

        await tx.salesDeliveryItem.deleteMany({ where: { deliveryId: id } });
        await tx.salesDelivery.delete({ where: { id } });

        revalidatePath("/sales");
        revalidatePath("/warehouse");
        revalidatePath("/finance");
        revalidatePath("/");

        return { success: true };
    }, { timeout: 30000 });
}

export async function voidSalesDeliveryService(id: string, reason: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    return await prisma.$transaction(async (tx: any) => {
        const delivery = await tx.salesDelivery.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!delivery) throw new Error("Delivery not found");
        if (delivery.isVoid) throw new Error("Delivery is already voided");

        // ─── FASE 2d: Restore Lot allocations on Void ─────────────────────
        const deliveryWithItems = await tx.salesDelivery.findUnique({
            where: { id },
            include: { items: { include: { lotAllocations: true } } }
        });
        if (deliveryWithItems) {
            for (const sdItem of deliveryWithItems.items) {
                for (const alloc of sdItem.lotAllocations) {
                    // Restore remainingQty back to the lot
                    await tx.productLot.update({
                        where: { id: alloc.lotId },
                        data: { remainingQty: { increment: alloc.qty } }
                    });
                    // Delete the allocation record
                    await tx.lotAllocation.delete({ where: { id: alloc.id } });
                }
            }
        }
        // ─────────────────────────────────────────────────────────────────

        for (const item of delivery.items) {
            // Restore Stock
            await tx.stock.upsert({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: item.productId,
                        warehouseId: delivery.warehouseId,
                        vendorName: item.vendorName
                    }
                },
                create: {
                    productId: item.productId,
                    warehouseId: delivery.warehouseId,
                    vendorName: item.vendorName,
                    quantity: item.quantity
                },
                update: { quantity: { increment: item.quantity } }
            });

            // Create Reversing Movement
            await tx.stockMovement.create({
                data: {
                    productId: item.productId,
                    warehouseId: delivery.warehouseId,
                    vendorName: item.vendorName,
                    quantity: item.quantity,
                    type: "SALE_VOID",
                    reference: delivery.deliveryNumber
                }
            });
        }

        // Mark as Voided
        await tx.salesDelivery.update({
            where: { id },
            data: {
                isVoid: true,
                voidReason: reason
            }
        });

        revalidatePath("/sales");
        revalidatePath("/warehouse");
        revalidatePath("/finance");
        revalidatePath("/tracking");
        revalidatePath("/");

        return { success: true };
    }, { timeout: 30000 });
}

export async function createSalesOrderService(data: any, userId: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    const txDate = data.date || new Date();
    const day = String(txDate.getDate()).padStart(2, '0');
    const month = String(txDate.getMonth() + 1).padStart(2, '0');
    const year = txDate.getFullYear();
    const dateStr = `${day}${month}${year}`;

    return await prisma.$transaction(async (tx: any) => {
        const isConfirm = data.status === "CONFIRMED";
        const prefix = isConfirm ? `KB-PO-${dateStr}-` : `KB-PI-${dateStr}-`;

        const latest = await tx.salesOrder.findFirst({
            where: { orderNumber: { startsWith: prefix } },
            orderBy: { orderNumber: 'desc' }
        });

        let nextNum = 1;
        if (latest) {
            const parts = latest.orderNumber.split('-');
            const lastSeq = parseInt(parts[parts.length - 1]);
            if (!isNaN(lastSeq)) nextNum = lastSeq + 1;
        }
        const orderNumber = `${prefix}${String(nextNum).padStart(3, '0')}`;

        const subtotal = data.items.reduce((acc: number, i: any) => acc + (i.quantity * i.salesPrice) - (i.discount || 0), 0);
        const totalDiscountNominal = Math.round(Number(data.totalDiscount) || 0);
        const dpp = subtotal - totalDiscountNominal;
        const taxRatePercent = Number(data.taxRate) || 0;
        const dppNilaiLain = taxRatePercent > 0 ? Math.round(dpp * 0.916666666666667) : 0;
        const taxAmount = taxRatePercent > 0 ? Math.round(dppNilaiLain * 0.12) : 0;
        const grandTotal = Math.round(dpp + taxAmount);

        const order = await tx.salesOrder.create({
            data: {
                orderNumber,
                status: data.status || "DRAFT",
                buyerName: data.buyerName,
                recipient: data.recipient,
                warehouseId: data.warehouseId,
                salesPerson: data.salesPerson,
                date: txDate,
                createdById: userId,
                subtotal,
                totalDiscount: totalDiscountNominal,
                taxRate: taxRatePercent,
                taxAmount,
                grandTotal,
                items: {
                    create: data.items.map((item: any) => ({
                        productId: item.productId,
                        quantity: Math.round(Number(item.quantity) || 0),
                        salesPrice: Number(item.salesPrice) || 0,
                        discount: Number(item.discount || 0),
                        uom: item.uom
                    }))
                }
            }
        });

        revalidatePath("/sales");
        return { success: true, orderNumber };
    });
}

export async function updateSalesOrderService(id: string, data: any) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    return await prisma.$transaction(async (tx: any) => {
        const subtotal = data.items.reduce((acc: number, i: any) => acc + (i.quantity * i.salesPrice) - (i.discount || 0), 0);
        const totalDiscountNominal = Math.round(Number(data.totalDiscount) || 0);
        const dpp = subtotal - totalDiscountNominal;
        const taxRatePercent = Number(data.taxRate) || 0;
        const dppNilaiLain = taxRatePercent > 0 ? Math.round(dpp * 0.916666666666667) : 0;
        const taxAmount = taxRatePercent > 0 ? Math.round(dppNilaiLain * 0.12) : 0;
        const grandTotal = Math.round(dpp + taxAmount);

        await tx.salesOrderItem.deleteMany({ where: { orderId: id } });

        const order = await tx.salesOrder.update({
            where: { id },
            data: {
                status: data.status,
                buyerName: data.buyerName,
                recipient: data.recipient,
                warehouseId: data.warehouseId,
                salesPerson: data.salesPerson,
                date: new Date(data.date),
                subtotal,
                totalDiscount: totalDiscountNominal,
                taxRate: taxRatePercent,
                taxAmount,
                grandTotal,
                items: {
                    create: data.items.map((item: any) => ({
                        productId: item.productId,
                        quantity: Math.round(Number(item.quantity) || 0),
                        salesPrice: Number(item.salesPrice) || 0,
                        discount: Number(item.discount || 0),
                        uom: item.uom
                    }))
                }
            }
        });

        revalidatePath("/sales");
        return { success: true };
    });
}
