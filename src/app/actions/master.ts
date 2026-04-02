"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { serializeDecimal } from "@/lib/utils";

/**
 * MASTER DATA: Products
 */
export async function createProductAction(data: {
    sku: string;
    name: string;
    category?: string;
    uom?: string;
    barcode?: string;
    purchasePrice?: number;
    salesPrice?: number;
    lowStockThreshold?: number;
}) {
    const session = await getServerSession(authOptions) as any;
    if (!["ADMIN", "PURCHASE", "SALES"].includes(session?.user?.role)) throw new Error("Hanya Admin/Purchase/Sales yang bisa menambah produk.");

    try {
        await (prisma.product as any).create({
            data: {
                sku: data.sku,
                name: data.name,
                category: data.category || null,
                uom: data.uom || null,
                barcode: data.barcode || null,
                purchasePrice: data.purchasePrice || 0,
                salesPrice: data.salesPrice || 0,
                lowStockThreshold: data.lowStockThreshold || 10,
                createdById: session.user.id,
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

export async function updateProductAction(id: string, data: {
    sku: string;
    name: string;
    category?: string;
    uom?: string;
    barcode?: string;
    purchasePrice?: number;
    salesPrice?: number;
    lowStockThreshold?: number;
}) {
    const session = await getServerSession(authOptions) as any;
    if (!["ADMIN", "PURCHASE", "SALES"].includes(session?.user?.role)) throw new Error("Hanya Admin/Purchase/Sales yang bisa mengubah produk.");

    try {
        await (prisma.product as any).update({
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

export async function deleteProductAction(id: string) {
    const inUse = await prisma.product.findUnique({
        where: { id },
        include: {
            _count: {
                select: {
                    receiptItems: true,
                    salesItems: true,
                    purchaseOrderItems: true,
                    purchaseReturnItems: true,
                    salesReturnItems: true,
                    verifications: true
                }
            }
        }
    });

    if (
        inUse?._count.receiptItems ||
        inUse?._count.salesItems ||
        inUse?._count.purchaseOrderItems ||
        inUse?._count.purchaseReturnItems ||
        inUse?._count.salesReturnItems ||
        inUse?._count.verifications
    ) {
        throw new Error("Produk tidak bisa dihapus karena sudah memiliki riwayat transaksi.");
    }

    await prisma.$transaction([
        prisma.stock.deleteMany({ where: { productId: id } }),
        prisma.stockMovement.deleteMany({ where: { productId: id } }),
        prisma.product.delete({ where: { id } })
    ]);

    revalidatePath("/warehouse");
    revalidatePath("/");

    return { success: true };
}

export async function importProductsAction(products: any[]) {
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

/**
 * MASTER DATA: Vendors
 */
export async function createVendorAction(data: { name: string; email?: string; phone?: string; address?: string }) {
    const session = await getServerSession(authOptions) as any;
    try {
        await prisma.vendor.create({
            data: { ...data, createdById: session?.user?.id }
        });
        revalidatePath("/settings");
        return { success: true };
    } catch (error: any) {
        if (error.code === 'P2002') throw new Error("Vendor sudah terdaftar.");
        throw error;
    }
}

export async function updateVendorAction(id: string, data: { name: string; email?: string; phone?: string; address?: string }) {
    await prisma.vendor.update({ where: { id }, data });
    revalidatePath("/settings");
    return { success: true };
}

export async function deleteVendorAction(id: string) {
    const vendor = await prisma.vendor.findUnique({
        where: { id },
        include: { _count: { select: { purchaseOrders: true } } }
    });
    if (vendor?._count.purchaseOrders || (vendor?.balance && Number(vendor.balance) !== 0)) {
        throw new Error("Vendor tidak bisa dihapus karena memiliki riwayat transaksi atau saldo.");
    }
    await prisma.vendor.delete({ where: { id } });
    revalidatePath("/settings");
    return { success: true };
}

/**
 * MASTER DATA: Customers
 */
export async function createCustomerAction(data: { name: string; email?: string; phone?: string; address?: string }) {
    const session = await getServerSession(authOptions) as any;
    try {
        await prisma.customer.create({
            data: { ...data, createdById: session?.user?.id }
        });
        revalidatePath("/settings");
        return { success: true };
    } catch (error: any) {
        if (error.code === 'P2002') throw new Error("Customer sudah terdaftar.");
        throw error;
    }
}

export async function updateCustomerAction(id: string, data: { name: string; email?: string; phone?: string; address?: string }) {
    await prisma.customer.update({ where: { id }, data });
    revalidatePath("/settings");
    return { success: true };
}

export async function deleteCustomerAction(id: string) {
    const customer = await prisma.customer.findUnique({ where: { id } });
    const usageCount = await prisma.salesDelivery.count({ where: { buyerName: customer?.name } });
    if (usageCount > 0 || (customer?.balance && Number(customer.balance) !== 0)) {
        throw new Error("Customer tidak bisa dihapus karena memiliki riwayat transaksi atau saldo.");
    }
    await prisma.customer.delete({ where: { id } });
    revalidatePath("/settings");
    return { success: true };
}

/**
 * MASTER DATA: Warehouses
 */
export async function createWarehouseAction(data: { name: string; location: string }) {
    await prisma.warehouse.create({ data });
    revalidatePath("/settings");
    revalidatePath("/warehouse");
    return { success: true };
}

export async function updateWarehouseAction(id: string, data: { name: string; location: string }) {
    await prisma.warehouse.update({ where: { id }, data });
    revalidatePath("/settings");
    revalidatePath("/warehouse");
    return { success: true };
}

export async function deleteWarehouseAction(id: string) {
    const stocks = await prisma.stock.count({ where: { warehouseId: id } });
    if (stocks > 0) throw new Error("Gudang tidak bisa dihapus karena masih ada stok.");
    await prisma.warehouse.delete({ where: { id } });
    revalidatePath("/settings");
    return { success: true };
}

/**
 * MASTER DATA: Fetch All (for management)
 */
export async function getMDAction() {
    const session = await getServerSession(authOptions) as any;
    const isAdmin = session?.user?.role?.toUpperCase() === "ADMIN";
    const userFilter = isAdmin ? {} : { createdById: session?.user?.id };

    const [vendors, customers, warehouses, coa, products] = await Promise.all([
        prisma.vendor.findMany({ where: userFilter, orderBy: { name: 'asc' } }),
        prisma.customer.findMany({ where: userFilter, orderBy: { name: 'asc' } }),
        prisma.warehouse.findMany({ orderBy: { name: 'asc' } }),
        prisma.financeAccount.findMany({ orderBy: { code: 'asc' } }),
        prisma.product.findMany({ where: userFilter, orderBy: { name: 'asc' } }),
    ]);

    return serializeDecimal({ vendors, customers, warehouses, coa, products });
}
