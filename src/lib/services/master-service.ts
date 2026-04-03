
import { revalidatePath } from "next/cache";

/**
 * MASTER SERVICES
 * Strictly server-side logic for master data operations.
 */

export async function createProductService(data: any, userId: string, role: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    if (!["ADMIN", "PURCHASE", "SALES"].includes(role)) throw new Error("Hanya Admin/Purchase/Sales yang bisa menambah produk.");

    try {
        await prisma.product.create({
            data: {
                sku: data.sku,
                name: data.name,
                category: data.category || null,
                uom: data.uom || null,
                barcode: data.barcode || null,
                purchasePrice: data.purchasePrice || 0,
                salesPrice: data.salesPrice || 0,
                lowStockThreshold: data.lowStockThreshold || 10,
                createdById: userId,
            }
        });
        revalidatePath("/settings");
        revalidatePath("/warehouse");
        return { success: true };
    } catch (error: any) {
        if (error.code === 'P2002') throw new Error("SKU atau Barcode sudah terdaftar.");
        throw error;
    }
}

export async function updateProductService(id: string, data: any, role: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    if (!["ADMIN", "PURCHASE", "SALES"].includes(role)) throw new Error("Hanya Admin/Purchase/Sales yang bisa mengubah produk.");

    try {
        await prisma.product.update({
            where: { id },
            data: {
                sku: data.sku,
                name: data.name,
                category: data.category || null,
                uom: data.uom || null,
                barcode: data.barcode || null,
                purchasePrice: data.purchasePrice || 0,
                salesPrice: data.salesPrice || 0,
                lowStockThreshold: data.lowStockThreshold || 10,
            }
        });
        revalidatePath("/settings");
        revalidatePath("/warehouse");
        return { success: true };
    } catch (error: any) {
        if (error.code === 'P2002') throw new Error("SKU atau Barcode sudah terdaftar.");
        throw error;
    }
}

export async function importProductsService(products: any[]) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    return await prisma.$transaction(async (tx: any) => {
        const results = [];
        for (const p of products) {
            const upserted = await tx.product.upsert({
                where: { sku: p.sku },
                update: {
                    name: p.name,
                    category: p.category,
                    unit: p.unit,
                    barcode: p.barcode,
                    purchasePrice: p.purchasePrice,
                    salesPrice: p.salesPrice,
                    lowStockThreshold: p.lowStockThreshold
                },
                create: {
                    sku: p.sku,
                    name: p.name,
                    category: p.category,
                    unit: p.unit,
                    barcode: p.barcode,
                    purchasePrice: p.purchasePrice || 0,
                    salesPrice: p.salesPrice || 0,
                    lowStockThreshold: p.lowStockThreshold || 10
                }
            });
            results.push(upserted);
        }
        revalidatePath("/warehouse");
        return { success: true, count: results.length };
    });
}
