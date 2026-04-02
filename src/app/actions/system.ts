"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { serializeDecimal } from "@/lib/utils";

/**
 * DASHBOARD & ANALYTICS: Summary Stats
 */
export async function getDashboardSummaryAction() {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user?.id) throw new Error("Unauthorized");

    const isAdmin = session.user.role?.toUpperCase() === "ADMIN";
    const userFilter = isAdmin ? {} : { createdById: session.user.id };

    const fetchJournals = async (criteria: any) => {
        const journals = await prisma.journalEntry.findMany({
            where: {
                ...criteria,
                ...(isAdmin ? {} : { createdById: session.user.id })
            },
            select: { type: true, amount: true }
        });
        const agg: any[] = [];
        const groups: Record<string, number> = {};
        journals.forEach((j: any) => {
            groups[j.type] = (groups[j.type] || 0) + Number(j.amount);
        });
        Object.entries(groups).forEach(([type, amount]) => {
            agg.push({ type, _sum: { amount } });
        });
        return agg;
    };

    const [
        inventoryTotals,
        cashBankAgg,
        debtAgg,
        receivableAgg,
        revenueAgg,
        purchaseAgg,
        expenseAgg
    ] = await Promise.all([
        prisma.stock.findMany({
            where: isAdmin ? {} : { 
                OR: [
                    { product: { is: { createdById: session.user.id } } },
                    { product: { is: { createdById: null } } }
                ]
            },
            select: {
                quantity: true,
                product: {
                    select: {
                        lowStockThreshold: true,
                        id: true,
                        receiptItems: {
                            select: { purchasePrice: true },
                            orderBy: { receipt: { date: 'desc' } },
                            take: 1
                        }
                    }
                }
            }
        }),
        fetchJournals({
            account: { OR: [{ code: { startsWith: '101' } }, { code: { startsWith: '102' } }] }
        }),
        fetchJournals({
            account: { code: '201' }
        }),
        fetchJournals({
            account: { code: '105' }
        }),
        prisma.salesDelivery.aggregate({
            where: isAdmin ? {} : { 
                OR: [
                    { salesPerson: session.user.prefix || null },
                    { salesPerson: null }
                ]
            },
            _sum: { subtotal: true, totalDiscount: true }
        }),
        prisma.goodsReceipt.aggregate({
            where: { ...userFilter, isVerified: true },
            _sum: { subtotal: true }
        }),
        prisma.financeTransaction.aggregate({
            where: {
                ...userFilter,
                journals: { some: { account: { code: { startsWith: '6' } } } }
            },
            _sum: { amount: true }
        })
    ]);

    let assetValue = 0;
    let totalStockQty = 0;
    const productStocks: Record<string, { qty: number, threshold: number }> = {};

    inventoryTotals.forEach((s: any) => {
        const latestPrice = Number(s.product.receiptItems[0]?.purchasePrice || 0);
        assetValue += s.quantity * latestPrice;
        totalStockQty += s.quantity;
        if (!productStocks[s.product.id]) {
            productStocks[s.product.id] = { qty: 0, threshold: s.product.lowStockThreshold || 10 };
        }
        productStocks[s.product.id].qty += s.quantity;
    });

    const lowStockCount = Object.values(productStocks).filter((p: any) => p.qty < p.threshold).length;

    const getSum = (agg: any[], type: "DEBIT" | "CREDIT") => 
        Number(agg.find((a: any) => a.type === type)?._sum?.amount || 0);

    const cashBalance = getSum(cashBankAgg, "DEBIT") - getSum(cashBankAgg, "CREDIT");
    const totalHutang = getSum(debtAgg, "CREDIT") - getSum(debtAgg, "DEBIT");
    const totalPiutang = getSum(receivableAgg, "DEBIT") - getSum(receivableAgg, "CREDIT");

    const totalRevenue = Number(revenueAgg._sum.subtotal || 0) - Number(revenueAgg._sum.totalDiscount || 0);
    const totalPurchaseCost = Number(purchaseAgg._sum.subtotal || 0);
    const totalOperationalExpenses = Number(expenseAgg._sum.amount || 0);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [deliveries, receipts, expenses, countRequests, countDeliveries, purchaseVolRes] = await Promise.all([
        prisma.salesDelivery.findMany({ 
            where: userFilter,
            select: { subtotal: true, totalDiscount: true, salesPerson: true } 
        }),
        prisma.goodsReceipt.findMany({
            where: { ...userFilter, isVerified: true },
            select: { subtotal: true, salesPerson: true }
        }),
        prisma.financeTransaction.findMany({
            where: { ...userFilter, journals: { some: { account: { code: { startsWith: '6' } } } } },
            select: { amount: true, transactionType: true, salesPerson: true }
        }),
        prisma.purchaseRequest.count({ 
            where: { 
                ...(isAdmin ? {} : { requestedById: session.user.id }), 
                createdAt: { gte: todayStart } 
            } 
        }),
        prisma.salesDelivery.count({ where: { ...userFilter, createdAt: { gte: todayStart } } }),
        prisma.goodsReceiptItem.aggregate({
            _sum: { quantity: true },
            where: { receipt: { ...userFilter, createdAt: { gte: todayStart } } }
        })
    ]);

    const activeOrdersToday = countRequests + countDeliveries;
    const purchaseVol = Number(purchaseVolRes._sum?.quantity || 0);

    let revenueBC = 0, revenuePF = 0;
    deliveries.forEach((d: any) => {
        const net = Number(d.subtotal || 0) - Number(d.totalDiscount || 0);
        if (d.salesPerson === 'BC') revenueBC += net;
        else if (d.salesPerson === 'PF') revenuePF += net;
    });

    let purchaseBC = 0, purchasePF = 0;
    receipts.forEach((r: any) => {
        const cost = Number(r.subtotal || 0);
        if (r.salesPerson === 'BC') purchaseBC += cost;
        else if (r.salesPerson === 'PF') purchasePF += cost;
    });

    let expBC = 0, expPF = 0;
    expenses.forEach((t: any) => {
        const amt = (t.transactionType === "PAYMENT") ? Number(t.amount) : -Number(t.amount);
        if (t.salesPerson === 'BC') expBC += amt;
        else if (t.salesPerson === 'PF') expPF += amt;
    });

    const nettMarginSales = (totalRevenue - totalPurchaseCost) - totalOperationalExpenses;
    const nettMarginBC = (revenueBC - purchaseBC) - expBC;
    const nettMarginPF = (revenuePF - purchasePF) - expPF;

    const summary = {
        totalRevenue,
        assetValue,
        cashBalance,
        totalHutang,
        totalPiutang,
        nettMarginSales,
        nettMarginBC,
        nettMarginPF,
        productCount: inventoryTotals.length,
        lowStockCount,
        activeOrdersToday,
        purchaseVol,
        weeklyStats: await getWeeklyStats(userFilter)
    };

    return serializeDecimal(summary);
}

async function getWeeklyStats(userFilter: any = {}) {
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
    let settings;
    try {
        settings = await (prisma as any).systemSetting.findUnique({ where: { id: "global" } });
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
    try {
        await (prisma as any).systemSetting.upsert({
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
    const session = await getServerSession(authOptions) as any;
    const notification = await (prisma as any).notification.create({
        data: { ...data, type: data.type || "broadcast", authorId: session.user.id }
    });
    revalidatePath("/");
    return { success: true, notification };
}

export async function getNotificationsAction() {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user?.id) return [];
    return await (prisma as any).notification.findMany({
        where: { NOT: { reads: { some: { userId: session.user.id } } } },
        orderBy: { createdAt: 'desc' },
        take: 20
    });
}

export async function markNotificationAsReadAction(notificationId: string) {
    const session = await getServerSession(authOptions) as any;
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
    const session = await getServerSession(authOptions) as any;
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
