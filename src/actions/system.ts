"use server";

import { revalidatePath } from "next/cache";
import { serializeDecimal } from "@/lib/utils";
import { getPrisma } from "@/lib/prisma";
import { getAuthOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { getDashboardSummaryService } from "@/lib/services/system-service";

/**
 * DASHBOARD & ANALYTICS: Summary Stats
 */
export async function getDashboardSummaryAction() {
    const session = (await getServerSession(getAuthOptions())) as any;
    if (!session?.user?.id) throw new Error("Unauthorized");

    const isAdmin = session.user.role?.toUpperCase() === "ADMIN";
    try {
        return await getDashboardSummaryService(session.user.id, session.user.prefix || "", isAdmin);
    } catch (e) {
        console.error("Dashboard Service Error:", e);
        return { totalRevenue: 0, nettMarginSales: 0, nettMarginBC: 0, nettMarginPF: 0, cashBalance: 0, totalHutang: 0, totalPiutang: 0, lowStockCount: 0, activeOrdersToday: 0, weeklyStats: [] };
    }
}

async function getWeeklyStats(userFilter: any = {}) {
    const prisma = getPrisma();
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        last7Days.push(d);
    }

    const sales = await prisma.salesDelivery.findMany({
        where: { ...userFilter, date: { gte: last7Days[0] } },
        select: { date: true, grandTotal: true }
    });

    const purchases = await prisma.goodsReceipt.findMany({
        where: { ...userFilter, date: { gte: last7Days[0] } },
        select: { date: true, subtotal: true }
    });

    return last7Days.map(date => {
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        const daySales = sales
            .filter((s: any) => s.date >= date && s.date < nextDay)
            .reduce((sum: number, s: any) => sum + Number(s.grandTotal || 0), 0);

        const dayPurchases = purchases
            .filter((p: any) => p.date && p.date >= date && p.date < nextDay)
            .reduce((sum: number, r: any) => sum + Number(r.subtotal || 0), 0);

        return {
            name: date.toLocaleDateString('en-US', { weekday: 'short' }),
            sales: daySales,
            purchases: dayPurchases
        };
    });
}

/**
 * SYSTEM: Settings
 */
export async function getSystemSettingsAction() {
    const prisma = getPrisma();
    let settings;
    try {
        settings = await prisma.systemSetting.findUnique({ where: { id: "global" } });
    } catch (e) {
        const results = await prisma.$queryRaw<any[]>`SELECT * FROM SystemSetting WHERE id = 'global' LIMIT 1`;
        if (results && results.length > 0) settings = results[0];
    }

    const [productCount, vendorCount, customerCount, warehouseCount] = await Promise.all([
        prisma.product.count(),
        prisma.vendor.count(),
        prisma.customer.count(),
        prisma.warehouse.count(),
    ]);

    return {
        settings: settings || {
            companyName: "PT. Kola Borasi Indonesia",
            address: "Jl. Arjuna IV Green Kartika Residence Blok EE NO.2, CIBINONG, KAB. BOGOR",
            taxId: "01.234.567.8-012.000",
            website: "www.kolaborasi.id"
        },
        counts: { product: productCount, vendor: vendorCount, customer: customerCount, warehouse: warehouseCount }
    };
}
export async function updateSystemSettingsAction(data: any) {
    const prisma = getPrisma();
    try {
        await prisma.systemSetting.upsert({
            where: { id: "global" },
            update: data,
            create: { id: "global", ...data }
        });
    } catch (e) {
        await prisma.$executeRaw`
            INSERT INTO SystemSetting (id, companyName, address, taxId, website, updatedAt)
            VALUES ('global', ${data.companyName}, ${data.address}, ${data.taxId}, ${data.website}, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET companyName = excluded.companyName, address = excluded.address, taxId = excluded.taxId, website = excluded.website, updatedAt = CURRENT_TIMESTAMP
        `;
    }

    revalidatePath("/settings");
    return { success: true };
}

/**
 * SYSTEM: Database Wipe
 */
export async function wipeDatabaseAction() {
    const prisma = getPrisma();
    return await prisma.$transaction(async (tx: any) => {
        await tx.notificationRead.deleteMany();
        await tx.notification.deleteMany();
        await tx.journalEntry.deleteMany();
        await tx.financeTransaction.deleteMany();
        await tx.purchaseReturnItem.deleteMany();
        await tx.purchaseReturn.deleteMany();
        await tx.goodsReceiptVerification.deleteMany();
        await tx.goodsReceiptItem.deleteMany();
        await tx.goodsReceipt.deleteMany();
        await tx.salesReturnItem.deleteMany();
        await tx.salesReturn.deleteMany();
        await tx.salesDeliveryItem.deleteMany();
        await tx.salesDelivery.deleteMany();
        await tx.purchaseOrderItem.deleteMany();
        await tx.purchaseOrder.deleteMany();
        await tx.purchaseRequestItem.deleteMany();
        await tx.purchaseRequest.deleteMany();
        await tx.stockMovement.deleteMany();
        await tx.stock.deleteMany();
        await tx.vendor.updateMany({ data: { balance: 0 } });
        await tx.customer.updateMany({ data: { balance: 0 } });
        revalidatePath("/");
        return { success: true };
    });
}

/**
 * SYSTEM: Notifications
 */
export async function createNotificationAction(data: { title: string; message: string; type?: string }) {
    const prisma = getPrisma();

    const session = (await getServerSession(getAuthOptions())) as any;
    const notification = await prisma.notification.create({
        data: { ...data, type: data.type || "broadcast", authorId: session.user.id }
    });
    revalidatePath("/");
    return { success: true, notification };
}

export async function getNotificationsAction() {
    const prisma = getPrisma();

    const session = (await getServerSession(getAuthOptions())) as any;
    if (!session?.user?.id) return [];
    return await prisma.notification.findMany({
        where: { NOT: { reads: { some: { userId: session.user.id } } } },
        orderBy: { createdAt: 'desc' },
        take: 20
    });
}

export async function markNotificationAsReadAction(notificationId: string) {
    const prisma = getPrisma();
    const session = (await getServerSession(getAuthOptions())) as any;
    
    await prisma.$transaction(async (tx: any) => {
        await tx.notificationRead.upsert({
            where: { notificationId_userId: { notificationId, userId: session.user.id } },
            update: {},
            create: { notificationId, userId: session.user.id }
        });
    });
    revalidatePath("/");
    return { success: true };
}

/**
 * SYSTEM: Reports
 */
export async function getDailyReportAction() {
    const prisma = getPrisma();
    const session = (await getServerSession(getAuthOptions())) as any;
    const isAdmin = session?.user?.role?.toUpperCase() === "ADMIN";
    const userFilter = isAdmin ? {} : { createdById: session?.user?.id };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const [sales, purchases] = await Promise.all([
        prisma.salesDelivery.findMany({
            where: { ...userFilter, createdAt: { gte: today, lt: tomorrow } },
            include: { createdBy: { select: { name: true } } }
        }),
        prisma.goodsReceipt.findMany({
            where: { ...userFilter, createdAt: { gte: today, lt: tomorrow } },
            include: { createdBy: { select: { name: true } } }
        })
    ]);

    return serializeDecimal({ sales, purchases });
}

/**
 * MIGRATION: Fix Receipt Prefix
 */
export async function fixReceiptPrefixMigrationAction() {
    const prisma = getPrisma();
    try {
        const allReceipts = await prisma.goodsReceipt.findMany({
            where: { receiptNumber: { contains: "KB-LPB-" } },
            include: { items: true }
        });

        let fixedCount = 0;
        for (const receipt of allReceipts) {
            const hasTax = (Number(receipt.taxRate) || 0) > 0;
            const hasItemDiscount = receipt.items.some((item: any) => (Number(item.discount) || 0) > 0);
            const hasTotalDiscount = (Number(receipt.totalDiscount) || 0) > 0;

            if (hasTax || hasItemDiscount || hasTotalDiscount) {
                const newNumber = receipt.receiptNumber.replace("KB-LPB-", "KB-LPBD-");
                const existing = await prisma.goodsReceipt.findFirst({ where: { receiptNumber: newNumber } });
                if (!existing) {
                    await prisma.goodsReceipt.update({ where: { id: receipt.id }, data: { receiptNumber: newNumber } });
                    fixedCount++;
                }
            }
        }
        revalidatePath("/purchase");
        return { success: true, fixedCount };
    } catch (error: any) {
        throw new Error("Gagal menjalankan migrasi prefix: " + error.message);
    }
}

export async function deleteNotificationAction(id: string) {
    const prisma = getPrisma();
    const session = (await getServerSession(getAuthOptions())) as any;
    if (session?.user?.role !== 'ADMIN') throw new Error("Unauthorized");

    await prisma.notification.delete({ where: { id } });
    revalidatePath("/");
    return { success: true };
}

