"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Warehouse Stock Adjustment
 */
export async function updateStockAction(data: {
    productId: string;
    warehouseId: string;
    quantity: number;
    vendorName?: string;
    type: "ADJUSTMENT" | "SALE" | "GOODS_RECEIPT";
    reference?: string;
}) {
    await prisma.$transaction(async (tx: any) => {
        const vendorName = data.vendorName || "UMUM";
        await tx.stock.upsert({
            where: {
                productId_warehouseId_vendorName: {
                    productId: data.productId,
                    warehouseId: data.warehouseId,
                    vendorName: vendorName
                }
            },
            update: { quantity: { increment: data.quantity } },
            create: {
                productId: data.productId,
                warehouseId: data.warehouseId,
                vendorName: vendorName,
                quantity: data.quantity
            }
        });

        await tx.stockMovement.create({
            data: {
                productId: data.productId,
                warehouseId: data.warehouseId,
                vendorName: vendorName,
                quantity: data.quantity,
                type: data.type,
                reference: data.reference
            }
        });
    });

    revalidatePath("/warehouse");
    revalidatePath("/");
}

export async function getStockMovementsAction(filters?: {
    productId?: string;
    warehouseId?: string;
    type?: string;
}) {
    return await prisma.stockMovement.findMany({
        where: filters,
        include: {
            product: { select: { name: true, sku: true } },
            warehouse: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
    });
}

/**
 * WAREHOUSE / ADMIN: Manual Stock Adjustment
 */
export async function adjustStockAction({
    productId,
    warehouseId,
    vendorName,
    type,
    amount,
    notes,
    adjustedBy
}: {
    productId: string;
    warehouseId: string;
    vendorName: string;
    type: "ADD" | "SUBTRACT" | "SET";
    amount: number;
    notes: string;
    adjustedBy: string;
}) {
    if (amount < 0 && type !== "SET") {
        throw new Error("Amount must be positive");
    }

    return await prisma.$transaction(async (tx: any) => {
        // 1. Get current stock
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

        if (diff === 0) {
            return { success: true, message: "Tidak ada perubahan stok." };
        }

        // 2. Update Stock
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

        // 3. Create StockMovement
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
        return { success: true };
    });
}

/**
 * ITEM TRACKING: Product Ledger
 */
export async function getProductTrackingAction(productId: string) {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user?.id) throw new Error("Unauthorized");

    const isAdmin = session.user.role?.toUpperCase() === "ADMIN";
    const prefix = session.user.prefix || null;
    const userId = session.user.id;

    // Filters for non-admin isolation
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
        // Purchases (Receipts)
        prisma.goodsReceiptItem.findMany({
            where: {
                productId,
                receipt: purchaseFilter
            },
            include: { receipt: true }
        }),
        // Sales (Deliveries)
        prisma.salesDeliveryItem.findMany({
            where: {
                productId,
                delivery: salesFilter
            },
            include: { delivery: true }
        }),
        // Purchase Returns
        prisma.purchaseReturnItem.findMany({
            where: {
                productId,
                purchaseReturn: { receipt: purchaseFilter }
            },
            include: { purchaseReturn: { include: { receipt: true } } }
        }),
        // Sales Returns
        prisma.salesReturnItem.findMany({
            where: {
                productId,
                salesReturn: { delivery: salesFilter }
            },
            include: { salesReturn: { include: { delivery: true } } }
        }),
        // Product Info
        prisma.product.findUnique({
            where: { id: productId },
            select: { name: true, sku: true, uom: true }
        })
    ]);

    if (!product) throw new Error("Produk tidak ditemukan");

    // Unified History
    const history: any[] = [];

    const { serializeDecimal } = await import("@/lib/utils");

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

    // Sort by date desc
    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return serializeDecimal({
        product,
        history
    });
}
