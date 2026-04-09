
import { serializeDecimal } from "@/lib/utils";
import { revalidatePath } from "next/cache";

/**
 * SYSTEM SERVICES
 * This file contains strictly server-side business logic.
 * It is only imported by Server Actions or Server Components.
 */

export async function getDashboardSummaryService(userId: string, prefix: string, isAdmin: boolean) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    const userFilter = isAdmin ? {} : { createdById: userId };

    const fetchJournals = async (criteria: any) => {
        const journals = await prisma.journalEntry.findMany({
            where: {
                ...criteria,
                ...(isAdmin ? {} : { createdById: userId })
            },
            select: { type: true, amount: true }
        });
        const groups: Record<string, number> = {};
        journals.forEach((j: any) => {
            groups[j.type] = (groups[j.type] || 0) + Number(j.amount);
        });
        return Object.entries(groups).map(([type, amount]) => ({ type, _sum: { amount } }));
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
                    { product: { is: { createdById: userId } } },
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
                    { salesPerson: prefix || null },
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

    const [deliveries, receipts, expenses, countRequests, countDeliveries, purchaseVolRes, salesPaidRes, purchasePaidRes] = await Promise.all([
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
                ...(isAdmin ? {} : { requestedById: userId }), 
                createdAt: { gte: todayStart } 
            } 
        }),
        prisma.salesDelivery.count({ where: { ...userFilter, createdAt: { gte: todayStart } } }),
        prisma.goodsReceiptItem.aggregate({
            _sum: { quantity: true },
            where: { receipt: { ...userFilter, createdAt: { gte: todayStart } } }
        }),
        prisma.salesDelivery.aggregate({
            where: userFilter,
            _sum: { paidAmount: true }
        }),
        prisma.goodsReceipt.aggregate({
            where: { ...userFilter, isVerified: true },
            _sum: { paidAmount: true }
        })
    ]);

    const activeOrdersToday = countRequests + countDeliveries;
    const purchaseVol = Number(purchaseVolRes._sum?.quantity || 0);
    const totalPaidSales = Number(salesPaidRes._sum?.paidAmount || 0);
    const totalPaidPurchases = Number(purchasePaidRes._sum?.paidAmount || 0);

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
        totalPaidSales,
        totalPaidPurchases,
        totalPiutangPending: totalPiutang, // Already calculated as (DEBIT - CREDIT)
        totalHutangPending: totalHutang,
        weeklyStats: await getWeeklyStatsService(userId, isAdmin)
    };

    return serializeDecimal(summary);
}

async function getWeeklyStatsService(userId: string, isAdmin: boolean) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();
    const userFilter = isAdmin ? {} : { createdById: userId };

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
