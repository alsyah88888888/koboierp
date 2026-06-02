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

export async function getAccountingDataAction() {
    const { getAuthOptions } = require("@/lib/auth");
    const { getServerSession } = require("next-auth");
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    const session = (await getServerSession(getAuthOptions())) as any;
    if (!session?.user) throw new Error("Unauthorized");

    const isAdmin = session.user.role?.toUpperCase() === "ADMIN";
    const userFilter = isAdmin ? {} : {
        OR: [
            { goodsReceipt: { createdById: session.user.id } },
            { salesDelivery: { createdById: session.user.id } },
            { financeTransaction: { createdById: session.user.id } },
            { purchaseReturn: { createdById: session.user.id } },
            { salesReturn: { createdById: session.user.id } }
        ]
    };

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

    const isAdmin = session.user.role?.toUpperCase() === "ADMIN";
    const userFilter = isAdmin ? {} : { createdById: session.user.id };

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
