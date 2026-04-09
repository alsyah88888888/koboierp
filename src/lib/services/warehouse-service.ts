
import { revalidatePath } from "next/cache";

/**
 * WAREHOUSE SERVICES
 * Strictly server-side logic for warehouse operations.
 */

export async function adjustStockService(data: any) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    return await prisma.$transaction(async (tx: any) => {
        const { productId, warehouseId, vendorName, type, amount, adjustedBy } = data;
        const currentStock = await tx.stock.findUnique({
            where: {
                productId_warehouseId_vendorName: {
                    productId,
                    warehouseId,
                    vendorName
                }
            }
        });

        const currentQty = currentStock ? currentStock.quantity : 0;
        let diff = 0;

        if (type === "ADD") {
            diff = amount;
        } else if (type === "SUBTRACT") {
            diff = -amount;
            if (currentQty + diff < 0) {
                throw new Error(`Stok tidak cukup. Stok saat ini: ${currentQty}`);
            }
        } else if (type === "SET") {
            if (amount < 0) throw new Error("Stok akhir tidak boleh negatif");
            diff = amount - currentQty;
        }

        if (diff === 0) return { success: true, message: "Tidak ada perubahan stok." };

        await tx.stock.upsert({
            where: {
                productId_warehouseId_vendorName: {
                    productId,
                    warehouseId,
                    vendorName
                }
            },
            update: { quantity: { increment: diff } },
            create: {
                productId,
                warehouseId,
                vendorName,
                quantity: diff
            }
        });

        await tx.stockMovement.create({
            data: {
                productId,
                warehouseId,
                vendorName,
                quantity: diff,
                type: "ADJUSTMENT",
                reference: `MANUAL-${adjustedBy.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`
            }
        });

        revalidatePath("/warehouse");
        revalidatePath("/");
        return { success: true };
    });
}

export async function getProductTrackingService(productId: string, userId: string, prefix: string, isAdmin: boolean) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    const salesFilter = isAdmin ? {} : { 
        OR: [
            { salesPerson: prefix },
            { salesPerson: null }
        ]
    };
    const purchaseFilter = isAdmin ? {} : { 
        OR: [
            { createdById: userId },
            { createdBy: { role: "ADMIN" } }
        ],
        NOT: { salesPerson: "PF" }
    };

    const [receipts, deliveries, pReturns, sReturns, product] = await Promise.all([
        prisma.goodsReceiptItem.findMany({
            where: { productId, receipt: purchaseFilter },
            include: { receipt: true }
        }),
        prisma.salesDeliveryItem.findMany({
            where: { productId, delivery: salesFilter },
            include: { delivery: true }
        }),
        prisma.purchaseReturnItem.findMany({
            where: { productId, purchaseReturn: { receipt: purchaseFilter } },
            include: { purchaseReturn: { include: { receipt: true } } }
        }),
        prisma.salesReturnItem.findMany({
            where: { productId, salesReturn: { delivery: salesFilter } },
            include: { salesReturn: { include: { delivery: true } } }
        }),
        prisma.product.findUnique({
            where: { id: productId },
            select: { name: true, sku: true, uom: true }
        })
    ]);

    if (!product) throw new Error("Produk tidak ditemukan");

    const history: any[] = [];
    receipts.forEach((item: any) => {
        history.push({
            id: item.id,
            parentId: item.receipt.id,
            date: item.receipt.date || item.receipt.createdAt,
            type: "PURCHASE",
            ref: item.receipt.receiptNumber,
            partner: item.receipt.receivedFrom,
            qtyIn: item.quantity,
            qtyOut: 0
        });
    });

    deliveries.forEach((item: any) => {
        history.push({
            id: item.id,
            parentId: item.delivery.id,
            date: item.delivery.date || item.delivery.createdAt,
            type: "SALE",
            ref: item.delivery.deliveryNumber,
            partner: item.delivery.buyerName || item.delivery.recipient || "Unknown Customer",
            qtyIn: 0,
            qtyOut: item.quantity
        });
    });

    pReturns.forEach((item: any) => {
        history.push({
            id: item.id,
            parentId: item.purchaseReturn.id,
            date: item.purchaseReturn.date || item.purchaseReturn.createdAt,
            type: "PURCHASE_RETURN",
            ref: item.purchaseReturn.returnNumber,
            partner: item.purchaseReturn.receipt.receivedFrom,
            qtyIn: 0,
            qtyOut: item.quantity
        });
    });

    sReturns.forEach((item: any) => {
        history.push({
            id: item.id,
            parentId: item.salesReturn.id,
            date: item.salesReturn.date || item.salesReturn.createdAt,
            type: "SALES_RETURN",
            ref: item.salesReturn.returnNumber,
            partner: item.salesReturn.delivery.buyerName || "Customer",
            qtyIn: item.quantity,
            qtyOut: 0
        });
    });

    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const { serializeDecimal } = require("@/lib/utils");
    return serializeDecimal({ product, history });
}
export async function verifyGoodsReceiptService(receiptId: string, verifiedBy: string, checkedItems: Record<string, number>) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    return await prisma.$transaction(async (tx: any) => {
        const receipt = await tx.goodsReceipt.findUnique({
            where: { id: receiptId },
            include: { items: { include: { product: true } } }
        });

        if (!receipt) throw new Error("Penerimaan tidak ditemukan.");
        if (receipt.isVerified) throw new Error("Penerimaan sudah diverifikasi sebelumnya.");

        // 1. Mark as verified
        await tx.goodsReceipt.update({
            where: { id: receiptId },
            data: {
                isVerified: true,
                verifiedBy,
                verifiedAt: new Date()
            }
        });

        // 2. Clear previous stock from this receipt if any (idempotency)
        await tx.stockMovement.deleteMany({
            where: { reference: receipt.receiptNumber }
        });

        // 3. Update stock and create movements for each item
        for (const item of receipt.items) {
            const actualQty = checkedItems[item.id] ?? 0;
            if (actualQty <= 0) continue;

            const vendorName = item.vendorName || "UMUM";

            // Update Stock
            await tx.stock.upsert({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: item.productId,
                        warehouseId: receipt.warehouseId,
                        vendorName: vendorName
                    }
                },
                update: { quantity: { increment: actualQty } },
                create: {
                    productId: item.productId,
                    warehouseId: receipt.warehouseId,
                    vendorName: vendorName,
                    quantity: actualQty
                }
            });

            // Create Movement
            await tx.stockMovement.create({
                data: {
                    productId: item.productId,
                    warehouseId: receipt.warehouseId,
                    vendorName: vendorName,
                    quantity: actualQty,
                    type: "GOODS_RECEIPT",
                    reference: receipt.receiptNumber
                }
            });
        }

        revalidatePath("/warehouse");
        revalidatePath("/purchase");
        revalidatePath("/");
        return { success: true };
    });
}

export async function voidGoodsReceiptService(id: string, reason: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    return await prisma.$transaction(async (tx: any) => {
        const receipt = await tx.goodsReceipt.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!receipt) throw new Error("Penerimaan tidak ditemukan.");
        if (receipt.isVoid) throw new Error("Penerimaan sudah dibatalkan.");

        if (receipt.isVerified) {
            // Revert Stock
            for (const item of receipt.items) {
                const vendorName = item.vendorName || "UMUM";
                
                await tx.stock.update({
                    where: {
                        productId_warehouseId_vendorName: {
                            productId: item.productId,
                            warehouseId: receipt.warehouseId,
                            vendorName: vendorName
                        }
                    },
                    data: { quantity: { decrement: item.quantity } }
                });

                // Create Reversing Movement
                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        warehouseId: receipt.warehouseId,
                        vendorName: vendorName,
                        quantity: -item.quantity,
                        type: "PURCHASE_VOID",
                        reference: receipt.receiptNumber
                    }
                });
            }
        }

        // Mark as Voided
        await tx.goodsReceipt.update({
            where: { id },
            data: {
                isVoid: true,
                voidReason: reason
            }
        });

        revalidatePath("/warehouse");
        revalidatePath("/purchase");
        revalidatePath("/tracking");
        revalidatePath("/");
        return { success: true };
    });
}

export async function runStockAuditService() {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    // 1. Get all products with their current stock table values
    const products = await prisma.product.findMany({
        include: {
            stocks: true,
            receiptItems: {
                where: { receipt: { isVerified: true, isVoid: false } },
                select: { quantity: true }
            },
            salesItems: {
                where: { delivery: { isVoid: false } },
                select: { quantity: true }
            },
            purchaseReturnItems: {
                where: { purchaseReturn: { isVoid: false } },
                select: { quantity: true }
            },
            salesReturnItems: {
                where: { salesReturn: { isVoid: false } },
                select: { quantity: true }
            },
            movements: {
                where: { type: "ADJUSTMENT" },
                select: { quantity: true }
            }
        }
    });

    const results = products.map((p: any) => {
        const currentStock = p.stocks.reduce((acc: number, s: any) => acc + (Number(s.quantity) || 0), 0);
        
        const totalPurchased = p.receiptItems.reduce((acc: number, r: any) => acc + (Number(r.quantity) || 0), 0);
        const totalSold = p.salesItems.reduce((acc: number, s: any) => acc + (Number(s.quantity) || 0), 0);
        const totalPurchReturned = p.purchaseReturnItems.reduce((acc: number, pr: any) => acc + (Number(pr.quantity) || 0), 0);
        const totalSalesReturned = p.salesReturnItems.reduce((acc: number, sr: any) => acc + (Number(sr.quantity) || 0), 0);
        const totalAdjustments = p.movements.reduce((acc: number, m: any) => acc + (Number(m.quantity) || 0), 0);

        const calculatedStock = totalPurchased - totalSold - totalPurchReturned + totalSalesReturned + totalAdjustments;
        const discrepancy = currentStock - calculatedStock;

        return {
            id: p.id,
            sku: p.sku,
            name: p.name,
            currentStock,
            calculatedStock,
            discrepancy,
            totalPurchased,
            totalSold,
            totalPurchReturned,
            totalSalesReturned,
            totalAdjustments
        };
    });

    const { serializeDecimal } = require("@/lib/utils");
    return serializeDecimal(results);
}

export async function syncProductStockService(productId: string, syncBy: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    return await prisma.$transaction(async (tx: any) => {
        // 1. Calculate History
        const p = await tx.product.findUnique({
            where: { id: productId },
            include: {
                stocks: true,
                receiptItems: { where: { receipt: { isVerified: true, isVoid: false } }, select: { quantity: true } },
                salesItems: { where: { delivery: { isVoid: false } }, select: { quantity: true } },
                purchaseReturnItems: { where: { purchaseReturn: { isVoid: false } }, select: { quantity: true } },
                salesReturnItems: { where: { salesReturn: { isVoid: false } }, select: { quantity: true } },
                movements: { where: { type: "ADJUSTMENT" }, select: { quantity: true } }
            }
        });

        if (!p) throw new Error("Produk tidak ditemukan");

        const currentStockTotal = p.stocks.reduce((acc: number, s: any) => acc + (Number(s.quantity) || 0), 0);
        const totalPurchased = p.receiptItems.reduce((acc: number, r: any) => acc + (Number(r.quantity) || 0), 0);
        const totalSold = p.salesItems.reduce((acc: number, s: any) => acc + (Number(s.quantity) || 0), 0);
        const totalPurchReturned = p.purchaseReturnItems.reduce((acc: number, pr: any) => acc + (Number(pr.quantity) || 0), 0);
        const totalSalesReturned = p.salesReturnItems.reduce((acc: number, sr: any) => acc + (Number(sr.quantity) || 0), 0);
        const totalAdjustments = p.movements.reduce((acc: number, m: any) => acc + (Number(m.quantity) || 0), 0);

        const calculatedStock = totalPurchased - totalSold - totalPurchReturned + totalSalesReturned + totalAdjustments;
        const discrepancy = calculatedStock - currentStockTotal;

        if (discrepancy === 0) return { success: true, message: "Stok sudah sinkron." };

        // 2. We apply the correction to the 'UMUM' vendor stock in the primary warehouse (or first found)
        const primaryStock = p.stocks[0] || await tx.stock.findFirst({ where: { productId } });
        
        if (!primaryStock) {
            // If no stock record exists at all, we create one in a default warehouse
            const warehouse = await tx.warehouse.findFirst();
            if (!warehouse) throw new Error("Tidak ada gudang terdefinisi untuk sinkronisasi");
            
            await tx.stock.create({
                data: {
                    productId,
                    warehouseId: warehouse.id,
                    vendorName: "UMUM",
                    quantity: calculatedStock
                }
            });

            await tx.stockMovement.create({
                data: {
                    productId,
                    warehouseId: warehouse.id,
                    vendorName: "UMUM",
                    quantity: calculatedStock,
                    type: "ADJUSTMENT",
                    reference: `SYNC-INITIAL-${syncBy.substring(0, 3).toUpperCase()}`
                }
            });
        } else {
            // Apply compensator movement
            await tx.stock.update({
                where: { id: primaryStock.id },
                data: { quantity: { increment: discrepancy } }
            });

            await tx.stockMovement.create({
                data: {
                    productId,
                    warehouseId: primaryStock.warehouseId,
                    vendorName: primaryStock.vendorName,
                    quantity: discrepancy,
                    type: "ADJUSTMENT",
                    reference: `SYNC-AUDIT-${syncBy.substring(0, 3).toUpperCase()}`
                }
            });
        }

        revalidatePath("/warehouse");
        revalidatePath("/tracking");
        revalidatePath("/");
        
        return { success: true, discrepancy };
    });
}
