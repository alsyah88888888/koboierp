"use server";

import { revalidatePath } from "next/cache";

/**
 * MASTER ACTIONS
 * Entry points for master data operations.
 * Use dynamic imports for services and prisma to satisfy build boundaries.
 */

export async function createProductAction(data: any) {
    const { getAuthOptions } = require("@/lib/auth");
    const { getServerSession } = require("next-auth");
    const { createProductService } = require("@/lib/services/master-service");

    const session = (await getServerSession(getAuthOptions())) as any;
    return await createProductService(data, session?.user?.id, session?.user?.role);
}

export async function updateProductAction(id: string, data: any) {
    const { getAuthOptions } = require("@/lib/auth");
    const { getServerSession } = require("next-auth");
    const { updateProductService } = require("@/lib/services/master-service");

    const session = (await getServerSession(getAuthOptions())) as any;
    return await updateProductService(id, data, session?.user?.role);
}

export async function deleteProductAction(id: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

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
    const { importProductsService } = require("@/lib/services/master-service");
    return await importProductsService(products);
}

export async function createVendorAction(data: any) {
    const { getAuthOptions } = require("@/lib/auth");
    const { getServerSession } = require("next-auth");
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    const session = (await getServerSession(getAuthOptions())) as any;
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

export async function updateVendorAction(id: string, data: any) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    await prisma.vendor.update({ where: { id }, data });
    revalidatePath("/settings");
    return { success: true };
}

export async function deleteVendorAction(id: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

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

export async function createCustomerAction(data: any) {
    const { getAuthOptions } = require("@/lib/auth");
    const { getServerSession } = require("next-auth");
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    const session = (await getServerSession(getAuthOptions())) as any;
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

export async function updateCustomerAction(id: string, data: any) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    await prisma.customer.update({ where: { id }, data });
    revalidatePath("/settings");
    return { success: true };
}

export async function deleteCustomerAction(id: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    const customer = await prisma.customer.findUnique({ where: { id } });
    const usageCount = await prisma.salesDelivery.count({ where: { buyerName: customer?.name } });
    if (usageCount > 0 || (customer?.balance && Number(customer.balance) !== 0)) {
        throw new Error("Customer tidak bisa dihapus karena memiliki riwayat transaksi atau saldo.");
    }
    await prisma.customer.delete({ where: { id } });
    revalidatePath("/settings");
    return { success: true };
}

export async function createWarehouseAction(data: any) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    await prisma.warehouse.create({ data });
    revalidatePath("/settings");
    revalidatePath("/warehouse");
    return { success: true };
}

export async function updateWarehouseAction(id: string, data: any) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    await prisma.warehouse.update({ where: { id }, data });
    revalidatePath("/settings");
    revalidatePath("/warehouse");
    return { success: true };
}

export async function deleteWarehouseAction(id: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    const stocks = await prisma.stock.count({ where: { warehouseId: id } });
    if (stocks > 0) throw new Error("Gudang tidak bisa dihapus karena masih ada stok.");
    await prisma.warehouse.delete({ where: { id } });
    revalidatePath("/settings");
    return { success: true };
}

export async function getMDAction() {
    const { getAuthOptions } = require("@/lib/auth");
    const { getServerSession } = require("next-auth");
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    const session = (await getServerSession(getAuthOptions())) as any;
    const userFilter = {};

    const [vendors, customers, warehouses, coa, products] = await Promise.all([
        prisma.vendor.findMany({ where: userFilter, orderBy: { name: 'asc' } }),
        prisma.customer.findMany({ where: userFilter, orderBy: { name: 'asc' } }),
        prisma.warehouse.findMany({ orderBy: { name: 'asc' } }),
        prisma.financeAccount.findMany({ orderBy: { code: 'asc' } }),
        prisma.product.findMany({ where: userFilter, orderBy: { name: 'asc' } }),
    ]);

    const { serializeDecimal } = require("@/lib/utils");
    return serializeDecimal({ vendors, customers, warehouses, coa, products });
}
