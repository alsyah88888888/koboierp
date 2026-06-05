import { createRequire } from "module";
const require = createRequire(import.meta.url);

function revalidatePath(path: string) {
    try {
        const { revalidatePath: nextRevalidatePath } = require("next/cache");
        nextRevalidatePath(path);
    } catch (e) {
        // Silently ignore when next/cache is not available (e.g. testing)
    }
}

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

        // --- AUTO-GENERATED INVOICE NUMBER LOGIC ---
        let invoiceNumber = data.invoiceNumber || null;
        if (!invoiceNumber) {
            // 1. If linked to an order, check if the SalesOrder itself has a locked invoiceNumber
            if (data.orderId) {
                const linkedOrder = await tx.salesOrder.findUnique({
                    where: { id: data.orderId },
                    select: { invoiceNumber: true }
                });
                if (linkedOrder && linkedOrder.invoiceNumber) {
                    invoiceNumber = linkedOrder.invoiceNumber;
                } else {
                    const existingDelivery = await tx.salesDelivery.findFirst({
                        where: { orderId: data.orderId, NOT: [{ invoiceNumber: null }, { invoiceNumber: "" }] },
                        select: { invoiceNumber: true }
                    });
                    if (existingDelivery) {
                        invoiceNumber = existingDelivery.invoiceNumber;
                    }
                }
            }

            // 2. If still no invoiceNumber (brand new PO or manual delivery), generate a new one automatically
            if (!invoiceNumber) {
                const invPrefix = isPKP ? `KB-TRN-${dateStr}-` : `KB-TRD-${dateStr}-`;
                const latestInv = await tx.salesDelivery.findFirst({
                    where: { invoiceNumber: { startsWith: invPrefix } },
                    orderBy: { invoiceNumber: 'desc' }
                });
                const latestSOInv = await tx.salesOrder.findFirst({
                    where: { invoiceNumber: { startsWith: invPrefix } },
                    orderBy: { invoiceNumber: 'desc' }
                });
                let maxSeq = 0;
                if (latestInv && latestInv.invoiceNumber) {
                    const invParts = latestInv.invoiceNumber.split('-');
                    const lastInvSeq = parseInt(invParts[invParts.length - 1]);
                    if (!isNaN(lastInvSeq) && lastInvSeq > maxSeq) maxSeq = lastInvSeq;
                }
                if (latestSOInv && latestSOInv.invoiceNumber) {
                    const invParts = latestSOInv.invoiceNumber.split('-');
                    const lastInvSeq = parseInt(invParts[invParts.length - 1]);
                    if (!isNaN(lastInvSeq) && lastInvSeq > maxSeq) maxSeq = lastInvSeq;
                }
                const nextInvNum = maxSeq + 1;
                invoiceNumber = `${invPrefix}${String(nextInvNum).padStart(3, '0')}`;
            }
        }

        // --- AUTO-GENERATED SURAT JALAN NUMBER (deliveryNumber) ---
        let deliveryNumber = "";
        
        // 1. Get the sequential number for this day across all deliveries
        const startOfDay = new Date(txDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(txDate);
        endOfDay.setHours(23, 59, 59, 999);

        const latestDayDelivery = await tx.salesDelivery.findFirst({
            where: {
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            orderBy: { deliveryNumber: 'desc' }
        });

        let nextSeq = 1;
        if (latestDayDelivery && latestDayDelivery.deliveryNumber) {
            const parts = latestDayDelivery.deliveryNumber.split('-');
            const lastSeq = parseInt(parts[parts.length - 1]);
            if (!isNaN(lastSeq)) {
                nextSeq = lastSeq + 1;
            }
        }

        // 2. Determine the random number (reuse if this is a partial delivery under the same invoice)
        let randomNum = "";
        const existingDelivery = await tx.salesDelivery.findFirst({
            where: { invoiceNumber: invoiceNumber },
            orderBy: { createdAt: 'asc' }
        });

        if (existingDelivery) {
            const parts = existingDelivery.deliveryNumber.split('-');
            randomNum = parts[1] || String(Math.floor(100 + Math.random() * 900));
        } else {
            randomNum = String(Math.floor(100 + Math.random() * 900));
        }

        deliveryNumber = `SJ-${randomNum}-${dateStr}-${String(nextSeq).padStart(3, '0')}`;

        const delivery = await tx.salesDelivery.create({
            data: {
                deliveryNumber: deliveryNumber,
                orderId: data.orderId || null,
                recipient: data.recipient,
                buyerName: data.buyerName,
                vehicleNumber: data.vehicleNumber,
                poNumber: data.poNumber,
                invoiceNumber: invoiceNumber,
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
        const taxAmount = taxRatePercent > 0 ? Math.floor(dppNilaiLain * 0.12) : 0;
        const grandTotal = Math.ceil((dpp + taxAmount) / 100) * 100;

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

            // --- OUTSTANDING QUANTITY VALIDATION ---
            if (effectiveOrderItemId) {
                const orderItem = await tx.salesOrderItem.findUnique({
                    where: { id: effectiveOrderItemId }
                });
                if (orderItem) {
                    const outstanding = Number(orderItem.quantity) - Number(orderItem.shippedQuantity || 0);
                    if (item.quantity > outstanding) {
                        const product = await tx.product.findUnique({ where: { id: item.productId } });
                        throw new Error(
                            `Jumlah pengiriman (${item.quantity}) melebihi sisa pesanan (outstanding: ${outstanding}) untuk produk ${product?.name || item.productId}`
                        );
                    }
                }
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
                        supplierName: sdItem.vendorName,
                        remainingQty: { gt: 0 },
                        isVoided: false,
                        grItem: {
                            receipt: {
                                warehouseId: createdDelivery.warehouseId,
                                salesPerson: createdDelivery.salesPerson || null
                            }
                        }
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
                            hppAtTime: lot.landedCost ?? lot.purchasePrice
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
        
        const deliveryNumber = oldDelivery.deliveryNumber;
        let invoiceNumber = data.invoiceNumber || oldDelivery.invoiceNumber;
        const oldInvoiceNumber = invoiceNumber;

        // REGENERATE INVOICE NUMBER IF PKP STATUS CHANGED
        if (isPKP !== oldIsPKP || !invoiceNumber) {
            const prefix = isPKP ? `KB-TRN-${dateStr}-` : `KB-TRD-${dateStr}-`;
            const latest = await tx.salesDelivery.findFirst({
                where: { invoiceNumber: { startsWith: prefix } },
                orderBy: { invoiceNumber: 'desc' }
            });

            let nextNum = 1;
            if (latest && latest.invoiceNumber) {
                const parts = latest.invoiceNumber.split('-');
                const lastSeq = parseInt(parts[parts.length - 1]);
                if (!isNaN(lastSeq)) nextNum = lastSeq + 1;
            }
            invoiceNumber = `${prefix}${String(nextNum).padStart(3, '0')}`;

            // Create notification for audit trail
            await tx.notification.create({
                data: {
                    title: "Perubahan Nomor Invoice",
                    message: `Nomor invoice untuk Surat Jalan ${oldDelivery.deliveryNumber} telah diubah dari ${oldInvoiceNumber || 'kosong'} menjadi ${invoiceNumber} karena perubahan status pajak (PKP: ${isPKP}).`,
                    type: "warning",
                    authorId: userId
                }
            });
        }

        await tx.salesDelivery.update({
            where: { id },
            data: {
                deliveryNumber: oldDelivery.deliveryNumber, // Never change deliveryNumber (Surat Jalan number)
                recipient: data.recipient,
                buyerName: data.buyerName,
                vehicleNumber: data.vehicleNumber,
                poNumber: data.poNumber,
                invoiceNumber: invoiceNumber,
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
        const taxAmount = taxRatePercent > 0 ? Math.floor(dppNilaiLain * 0.12) : 0;
        const grandTotal = Math.ceil((dpp + taxAmount) / 100) * 100;

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
                    where: {
                        productId: sdItem.productId,
                        supplierName: sdItem.vendorName,
                        remainingQty: { gt: 0 },
                        isVoided: false,
                        grItem: {
                            receipt: {
                                warehouseId: updatedDelivery.warehouseId,
                                salesPerson: updatedDelivery.salesPerson || null
                            }
                        }
                    },
                    orderBy: { grDate: 'asc' }
                });
                for (const lot of availableLots) {
                    if (remaining <= 0) break;
                    const consume = Math.min(remaining, lot.remainingQty);
                    await tx.lotAllocation.create({
                        data: { lotId: lot.id, sdItemId: sdItem.id, qty: consume, hppAtTime: lot.landedCost ?? lot.purchasePrice }
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

        // Delete associated journal entries
        await tx.journalEntry.deleteMany({
            where: { description: { contains: delivery.deliveryNumber } }
        });

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

        const matchingOrders = await tx.salesOrder.findMany({
            where: {
                OR: [
                    { orderNumber: { startsWith: prefix } },
                    { proformaNumber: { startsWith: prefix } }
                ]
            },
            select: {
                orderNumber: true,
                proformaNumber: true
            }
        });

        let maxSeq = 0;
        for (const order of matchingOrders) {
            if (order.orderNumber && order.orderNumber.startsWith(prefix)) {
                const parts = order.orderNumber.split('-');
                const seq = parseInt(parts[parts.length - 1]);
                if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
            }
            if (order.proformaNumber && order.proformaNumber.startsWith(prefix)) {
                const parts = order.proformaNumber.split('-');
                const seq = parseInt(parts[parts.length - 1]);
                if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
            }
        }
        const orderNumber = `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;

        const subtotal = Math.round(data.items.reduce((acc: number, i: any) => acc + (i.quantity * i.salesPrice) - (i.discount || 0), 0));
        const totalDiscountNominal = Math.round(Number(data.totalDiscount) || 0);
        const dpp = subtotal - totalDiscountNominal;
        const taxRatePercent = Number(data.taxRate) || 0;
        const dppNilaiLain = taxRatePercent > 0 ? Math.round(dpp * 0.916666666666667) : 0;
        const taxAmount = taxRatePercent > 0 ? Math.floor(dppNilaiLain * 0.12) : 0;
        const grandTotal = Math.ceil((dpp + taxAmount) / 100) * 100;

        let invoiceNumber = null;
        if (isConfirm) {
            const invPrefix = taxRatePercent > 0 ? `KB-TRN-${dateStr}-` : `KB-TRD-${dateStr}-`;
            const latestInv = await tx.salesDelivery.findFirst({
                where: { invoiceNumber: { startsWith: invPrefix } },
                orderBy: { invoiceNumber: 'desc' }
            });
            const latestSOInv = await tx.salesOrder.findFirst({
                where: { invoiceNumber: { startsWith: invPrefix } },
                orderBy: { invoiceNumber: 'desc' }
            });
            let maxSeq = 0;
            if (latestInv && latestInv.invoiceNumber) {
                const invParts = latestInv.invoiceNumber.split('-');
                const lastInvSeq = parseInt(invParts[invParts.length - 1]);
                if (!isNaN(lastInvSeq) && lastInvSeq > maxSeq) maxSeq = lastInvSeq;
            }
            if (latestSOInv && latestSOInv.invoiceNumber) {
                const invParts = latestSOInv.invoiceNumber.split('-');
                const lastInvSeq = parseInt(invParts[invParts.length - 1]);
                if (!isNaN(lastInvSeq) && lastInvSeq > maxSeq) maxSeq = lastInvSeq;
            }
            const nextInvNum = maxSeq + 1;
            invoiceNumber = `${invPrefix}${String(nextInvNum).padStart(3, '0')}`;
        }

        const order = await tx.salesOrder.create({
            data: {
                orderNumber,
                proformaNumber: orderNumber.startsWith("KB-PI-") ? orderNumber : null,
                invoiceNumber,
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
        const subtotal = Math.round(data.items.reduce((acc: number, i: any) => acc + (i.quantity * i.salesPrice) - (i.discount || 0), 0));
        const totalDiscountNominal = Math.round(Number(data.totalDiscount) || 0);
        const dpp = subtotal - totalDiscountNominal;
        const taxRatePercent = Number(data.taxRate) || 0;
        const dppNilaiLain = taxRatePercent > 0 ? Math.round(dpp * 0.916666666666667) : 0;
        const taxAmount = taxRatePercent > 0 ? Math.floor(dppNilaiLain * 0.12) : 0;
        const grandTotal = Math.ceil((dpp + taxAmount) / 100) * 100;

        await tx.salesOrderItem.deleteMany({ where: { orderId: id } });

        const oldOrder = await tx.salesOrder.findUnique({ where: { id } });
        if (!oldOrder) throw new Error("Order tidak ditemukan");

        const txDate = new Date(data.date || oldOrder.date || new Date());
        const day = String(txDate.getDate()).padStart(2, '0');
        const month = String(txDate.getMonth() + 1).padStart(2, '0');
        const year = txDate.getFullYear();
        const dateStr = `${day}${month}${year}`;

        // 1. Generate KB-PO- orderNumber if transitioning from DRAFT to CONFIRMED
        let orderNumber = oldOrder.orderNumber;
        let proformaNumber = oldOrder.proformaNumber || (orderNumber.startsWith("KB-PI-") ? orderNumber : null);
        if (oldOrder.status === "DRAFT" && data.status === "CONFIRMED" && orderNumber.startsWith("KB-PI-")) {
            proformaNumber = oldOrder.orderNumber; // Save the old PI number!
            const prefix = `KB-PO-${dateStr}-`;
            const matchingOrders = await tx.salesOrder.findMany({
                where: {
                    OR: [
                        { orderNumber: { startsWith: prefix } },
                        { proformaNumber: { startsWith: prefix } }
                    ]
                },
                select: {
                    orderNumber: true,
                    proformaNumber: true
                }
            });

            let maxSeq = 0;
            for (const order of matchingOrders) {
                if (order.orderNumber && order.orderNumber.startsWith(prefix)) {
                    const parts = order.orderNumber.split('-');
                    const seq = parseInt(parts[parts.length - 1]);
                    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
                }
                if (order.proformaNumber && order.proformaNumber.startsWith(prefix)) {
                    const parts = order.proformaNumber.split('-');
                    const seq = parseInt(parts[parts.length - 1]);
                    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
                }
            }
            orderNumber = `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
        }

        // 2. Generate and lock invoiceNumber if confirmed
        let invoiceNumber = oldOrder.invoiceNumber;
        const isConfirm = data.status === "CONFIRMED";
        const oldIsPKP = (Number(oldOrder.taxRate) || 0) > 0;
        const isPKP = taxRatePercent > 0;

        if (isConfirm) {
            if (!invoiceNumber || oldIsPKP !== isPKP) {
                const invPrefix = isPKP ? `KB-TRN-${dateStr}-` : `KB-TRD-${dateStr}-`;
                const latestInv = await tx.salesDelivery.findFirst({
                    where: { invoiceNumber: { startsWith: invPrefix } },
                    orderBy: { invoiceNumber: 'desc' }
                });
                const latestSOInv = await tx.salesOrder.findFirst({
                    where: { invoiceNumber: { startsWith: invPrefix } },
                    orderBy: { invoiceNumber: 'desc' }
                });
                let maxSeq = 0;
                if (latestInv && latestInv.invoiceNumber) {
                    const invParts = latestInv.invoiceNumber.split('-');
                    const lastInvSeq = parseInt(invParts[invParts.length - 1]);
                    if (!isNaN(lastInvSeq) && lastInvSeq > maxSeq) maxSeq = lastInvSeq;
                }
                if (latestSOInv && latestSOInv.invoiceNumber) {
                    const invParts = latestSOInv.invoiceNumber.split('-');
                    const lastInvSeq = parseInt(invParts[invParts.length - 1]);
                    if (!isNaN(lastInvSeq) && lastInvSeq > maxSeq) maxSeq = lastInvSeq;
                }
                const nextInvNum = maxSeq + 1;
                invoiceNumber = `${invPrefix}${String(nextInvNum).padStart(3, '0')}`;
            }
        } else {
            // If reverted back to DRAFT or OPEN, clear the invoice number
            invoiceNumber = null;
        }

        const newRevision = (oldOrder.revision || 0) + 1;

        const order = await tx.salesOrder.update({
            where: { id },
            data: {
                orderNumber,
                proformaNumber,
                invoiceNumber,
                status: data.status,
                buyerName: data.buyerName,
                recipient: data.recipient,
                warehouseId: data.warehouseId,
                salesPerson: data.salesPerson,
                date: txDate,
                subtotal,
                totalDiscount: totalDiscountNominal,
                taxRate: taxRatePercent,
                taxAmount,
                grandTotal,
                revision: newRevision,
                revisionNote: data.revisionNote || null,
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

        // 3. Propagate updated invoice number to all linked deliveries
        if (invoiceNumber !== oldOrder.invoiceNumber) {
            await tx.salesDelivery.updateMany({
                where: { orderId: id },
                data: { invoiceNumber: invoiceNumber }
            });
        }

        revalidatePath("/sales");
        return { success: true };
    });
}

export async function deleteSalesOrderService(id: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    return await prisma.$transaction(async (tx: any) => {
        const order = await tx.salesOrder.findUnique({
            where: { id },
            include: { deliveries: true }
        });

        if (!order) throw new Error("Order tidak ditemukan");
        
        const activeDeliveries = order.deliveries.filter((d: any) => !d.isVoid);
        if (activeDeliveries.length > 0) {
            throw new Error("Tidak dapat menghapus PO yang sudah memiliki pengiriman (SJ) aktif. Batalkan SJ terlebih dahulu.");
        }

        // Unlink any voided deliveries so we can delete the SalesOrder without foreign key issues
        await tx.salesDelivery.updateMany({
            where: { orderId: id },
            data: { orderId: null }
        });

        await tx.salesOrderItem.deleteMany({ where: { orderId: id } });
        await tx.salesOrder.delete({ where: { id } });

        revalidatePath("/sales");
        return { success: true };
    }, { timeout: 30000 });
}
