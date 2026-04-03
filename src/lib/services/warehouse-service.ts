
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
