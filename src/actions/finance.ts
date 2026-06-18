"use server";

import { revalidatePath } from "next/cache";

/**
 * FINANCE ACTIONS
 * Entry points for finance-related operations.
 * Use dynamic imports for services to satisfy build boundaries.
 */

export async function updatePaymentStatusAction(
    type: "PURCHASE" | "SALE", 
    id: string, 
    status: "PAID" | "CREDIT" | "PENDING" | "PARTIAL", 
    partialAmount?: number, 
    paymentDate?: Date,
    bankAccountId?: string
) {
    const { getAuthOptions } = require("@/lib/auth");
    const { getServerSession } = require("next-auth");
    const { updatePaymentStatusService } = require("@/lib/services/finance-service");
 
    const session = (await getServerSession(getAuthOptions())) as any;
    if (!session?.user?.id) throw new Error("Unauthorized");
 
    return await updatePaymentStatusService(type, id, status, partialAmount, paymentDate, session.user.id, bankAccountId);
}

export async function createFinanceTransactionAction(data: any) {
    const { getAuthOptions } = require("@/lib/auth");
    const { getServerSession } = require("next-auth");
    const { createFinanceTransactionService } = require("@/lib/services/finance-service");

    const session = (await getServerSession(getAuthOptions())) as any;
    if (!session?.user?.id) throw new Error("Unauthorized");

    return await createFinanceTransactionService(data, session.user.id);
}

export async function getApprovalHistoryAction(period: 'daily' | 'weekly' | 'monthly', dateStr: string, prefix?: 'PF' | 'BC' | 'ALL') {
    const { getAuthOptions } = require("@/lib/auth");
    const { getServerSession } = require("next-auth");
    const { getApprovalHistoryService } = require("@/lib/services/finance-history-service");

    const session = (await getServerSession(getAuthOptions())) as any;
    if (!session?.user?.id) throw new Error("Unauthorized");

    return await getApprovalHistoryService(period, dateStr, prefix);
}

export async function getAccountingDataAction() {
    const { getAuthOptions } = require("@/lib/auth");
    const { getServerSession } = require("next-auth");
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    const session = (await getServerSession(getAuthOptions())) as any;
    if (!session?.user) throw new Error("Unauthorized");

    const isAdminOrFinance = ["ADMIN", "FINANCE"].includes(session.user.role?.toUpperCase());
    const userFilter = isAdminOrFinance ? {} : { createdById: session.user.id };

    const [journals, accounts] = await Promise.all([
        prisma.journalEntry.findMany({
            where: userFilter,
            orderBy: { date: 'desc' },
            include: {
                account: true,
                transaction: true
            }
        }),
        prisma.financeAccount.findMany({
            orderBy: { code: 'asc' }
        })
    ]);

    return { journals, accounts };
}

export async function getFinanceTransactionsAction() {
    const { getAuthOptions } = require("@/lib/auth");
    const { getServerSession } = require("next-auth");
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    const session = (await getServerSession(getAuthOptions())) as any;
    if (!session?.user?.id) throw new Error("Unauthorized");

    const userFilter = {};

    return await prisma.financeTransaction.findMany({
        where: userFilter,
        orderBy: { date: 'desc' },
        take: 200 
    });
}

export async function deleteFinanceTransactionAction(id: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    return await prisma.$transaction(async (tx: any) => {
        const oldTx = await tx.financeTransaction.findUnique({
            where: { id },
            select: { receiptNumber: true, amount: true, transactionType: true }
        });

        if (oldTx && oldTx.receiptNumber && oldTx.transactionType === "PAYMENT") {
            const goodsReceipt = await tx.goodsReceipt.findUnique({
                where: { receiptNumber: oldTx.receiptNumber },
                include: { items: true }
            });
            if (goodsReceipt && goodsReceipt.items.length > 0) {
                const totalQty = goodsReceipt.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
                if (totalQty > 0) {
                    const extraCostPerUnit = Number(oldTx.amount) / totalQty;
                    const lots = await tx.productLot.findMany({
                        where: { grNumber: oldTx.receiptNumber }
                    });
                    for (const lot of lots) {
                        const currentLandedCost = Number(lot.landedCost || lot.purchasePrice);
                        await tx.productLot.update({
                            where: { id: lot.id },
                            data: {
                                landedCost: Math.max(Number(lot.purchasePrice), currentLandedCost - extraCostPerUnit)
                            }
                        });
                    }
                }
            }
        }

        await tx.journalEntry.deleteMany({
            where: { transactionId: id }
        });

        await tx.financeTransaction.delete({
            where: { id }
        });

        revalidatePath("/finance");
        revalidatePath("/");

        return { success: true };
    });
}

export async function deleteJournalEntryAction(id: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    await prisma.journalEntry.delete({
        where: { id }
    });

    revalidatePath("/finance");
    revalidatePath("/");

    return { success: true };
}

export async function createJournalEntryAction(data: {
    description: string;
    amount: number;
    type: "DEBIT" | "CREDIT";
    accountId: string;
}) {
    const { getAuthOptions } = require("@/lib/auth");
    const { getServerSession } = require("next-auth");
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    const session = (await getServerSession(getAuthOptions())) as any;
    await prisma.journalEntry.create({
        data: {
            description: data.description,
            amount: data.amount as any,
            type: data.type,
            accountId: data.accountId,
            createdById: session?.user?.id
        }
    });

    revalidatePath("/finance");
    revalidatePath("/");
}

export async function getMonthlyClosingReportAction(month?: number, year?: number, prefix?: 'PF' | 'BC' | 'ALL') {
    const { getMonthlyClosingReportService } = require("@/lib/services/report-service");
    return await getMonthlyClosingReportService(month, year, prefix);
}

export async function lookupSalesReferenceAction(referenceNumber: string) {
    const { getAuthOptions } = require("@/lib/auth");
    const { getServerSession } = require("next-auth");
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    const session = (await getServerSession(getAuthOptions())) as any;
    if (!session?.user?.id) throw new Error("Unauthorized");

    if (!referenceNumber) {
        return { success: false, message: "Reference number is empty" };
    }

    const cleanedRef = referenceNumber.trim();

    // 1. Search in SalesDelivery (Delivery Number or Invoice Number)
    const delivery = await prisma.salesDelivery.findFirst({
        where: {
            OR: [
                { deliveryNumber: { equals: cleanedRef, mode: 'insensitive' } },
                { invoiceNumber: { equals: cleanedRef, mode: 'insensitive' } }
            ],
            isVoid: false
        },
        select: {
            salesPerson: true,
            invoiceNumber: true,
            deliveryNumber: true,
            buyerName: true
        }
    });

    if (delivery) {
        return {
            success: true,
            type: "SALES",
            salesPerson: delivery.salesPerson || "",
            invoiceNumber: delivery.invoiceNumber || delivery.deliveryNumber,
            buyerName: delivery.buyerName
        };
    }

    // 2. Search in SalesOrder (Order Number or Invoice Number)
    const order = await prisma.salesOrder.findFirst({
        where: {
            OR: [
                { orderNumber: { equals: cleanedRef, mode: 'insensitive' } },
                { invoiceNumber: { equals: cleanedRef, mode: 'insensitive' } }
            ]
        },
        select: {
            salesPerson: true,
            invoiceNumber: true,
            orderNumber: true,
            buyerName: true
        }
    });

    if (order) {
        return {
            success: true,
            type: "SALES",
            salesPerson: order.salesPerson || "",
            invoiceNumber: order.invoiceNumber || order.orderNumber,
            buyerName: order.buyerName
        };
    }

    return { success: false, message: "No matching sales reference found" };
}

export async function getRecentSalesReferencesAction() {
    const { getAuthOptions } = require("@/lib/auth");
    const { getServerSession } = require("next-auth");
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    const session = (await getServerSession(getAuthOptions())) as any;
    if (!session?.user?.id) throw new Error("Unauthorized");

    // Fetch recent sales deliveries
    const deliveries = await prisma.salesDelivery.findMany({
        where: { isVoid: false },
        orderBy: { date: 'desc' },
        take: 2000,
        select: {
            deliveryNumber: true,
            invoiceNumber: true,
            salesPerson: true,
            buyerName: true,
            grandTotal: true,
            date: true
        }
    });

    // Fetch recent sales orders
    const orders = await prisma.salesOrder.findMany({
        orderBy: { date: 'desc' },
        take: 2000,
        select: {
            orderNumber: true,
            invoiceNumber: true,
            salesPerson: true,
            buyerName: true,
            grandTotal: true,
            date: true
        }
    });

    // Map and consolidate
    const itemsMap = new Map<string, {
        invoiceNumber: string;
        salesPerson: string;
        buyerName: string;
        grandTotal: number;
        date: string;
        type: 'DELIVERY' | 'ORDER';
        label: string;
    }>();

    // Add deliveries first
    for (const d of deliveries) {
        const key = d.invoiceNumber || d.deliveryNumber;
        if (!key) continue;
        
        const sjPart = d.deliveryNumber ? ` (${d.deliveryNumber})` : "";
        const label = `${key}${sjPart} - ${d.buyerName || "No Buyer"} [${d.salesPerson || "No Sales"}]`;

        if (!itemsMap.has(key)) {
            itemsMap.set(key, {
                invoiceNumber: key,
                salesPerson: d.salesPerson || "",
                buyerName: d.buyerName || "",
                grandTotal: Number(d.grandTotal || 0),
                date: d.date.toISOString(),
                type: 'DELIVERY',
                label
            });
        }
    }

    // Add orders
    for (const o of orders) {
        const key = o.invoiceNumber || o.orderNumber;
        if (!key) continue;

        if (itemsMap.has(key)) continue;

        const soPart = o.orderNumber ? ` (${o.orderNumber})` : "";
        const label = `${key}${soPart} - ${o.buyerName || "No Buyer"} [${o.salesPerson || "No Sales"}]`;

        itemsMap.set(key, {
            invoiceNumber: key,
            salesPerson: o.salesPerson || "",
            buyerName: o.buyerName || "",
            grandTotal: Number(o.grandTotal || 0),
            date: o.date.toISOString(),
            type: 'ORDER',
            label
        });
    }

    // Convert map to array and sort by date desc
    const sortedList = Array.from(itemsMap.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return sortedList;
}

export async function updateFinanceTransactionAction(id: string, data: any) {
    const { getAuthOptions } = require("@/lib/auth");
    const { getServerSession } = require("next-auth");
    const { updateFinanceTransactionService } = require("@/lib/services/finance-service");

    const session = (await getServerSession(getAuthOptions())) as any;
    if (!session?.user?.id) throw new Error("Unauthorized");

    return await updateFinanceTransactionService(id, data, session.user.id);
}

export async function editSettledPaymentAction(
    type: "PURCHASE" | "SALE",
    id: string,
    newPaidAmount: number,
    paymentDate?: Date,
    bankAccountId?: string
) {
    const { getAuthOptions } = require("@/lib/auth");
    const { getServerSession } = require("next-auth");
    const { editSettledPaymentService } = require("@/lib/services/finance-service");

    const session = (await getServerSession(getAuthOptions())) as any;
    if (!session?.user?.id) throw new Error("Unauthorized");

    return await editSettledPaymentService(type, id, newPaidAmount, paymentDate, session.user.id, bankAccountId);
}

export async function getAgingReportAction() {
    const { getAuthOptions } = require("@/lib/auth");
    const { getServerSession } = require("next-auth");
    const { getAgingReportService } = require("@/lib/services/aging-service");

    const session = (await getServerSession(getAuthOptions())) as any;
    if (!session?.user?.id) throw new Error("Unauthorized");

    return await getAgingReportService();
}
