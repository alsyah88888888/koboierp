import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import prisma from "@/lib/prisma";

export interface CreatePOItem {
    productId: string;
    quantity: number;
    price: number;
}

export async function createPurchaseOrder(vendorId: string, items: CreatePOItem[]) {
    const poNumber = `PO-${Date.now()}`;

    return await prisma.purchaseOrder.create({
        data: {
            number: poNumber,
            vendorId,
            items: {
                create: items.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: new Decimal(item.price)
                }))
            }
        },
        include: {
            items: true
        }
    });
}

/**
 * Handles the 'Purchase to Warehouse' flow.
 * When goods are received, stock is updated and a movement record is created.
 */
export async function receivePurchaseOrder(poId: string, warehouseId: string) {
    return await prisma.$transaction(async (tx: any) => {
        // 1. Get PO items
        const po = await tx.purchaseOrder.findUnique({
            where: { id: poId },
            include: {
                items: true,
                vendor: { select: { name: true } }
            }
        });

        if (!po) throw new Error("Purchase Order not found");
        if (po.status === "RECEIVED") throw new Error("Purchase Order already received");

        // 2. Update Stock and create StockMovements
        const vendorName = po.vendor?.name || "UMUM";
        for (const item of (po.items as any[])) {
            // Update or Create Stock record
            await tx.stock.upsert({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: item.productId,
                        warehouseId: warehouseId,
                        vendorName: vendorName
                    }
                },
                update: {
                    quantity: { increment: item.quantity }
                },
                create: {
                    productId: item.productId,
                    warehouseId: warehouseId,
                    vendorName: vendorName,
                    quantity: item.quantity
                }
            });

            // Log Stock Movement
            await tx.stockMovement.create({
                data: {
                    productId: item.productId,
                    warehouseId: warehouseId,
                    vendorName: vendorName,
                    quantity: item.quantity,
                    type: "GOODS_RECEIPT", // Changed from PURCHASE_RECEIPT to match other actions
                    reference: po.number
                }
            });
        }

        // 3. Update PO status
        return await tx.purchaseOrder.update({
            where: { id: poId },
            data: { status: "RECEIVED" }
        });
    });
}
