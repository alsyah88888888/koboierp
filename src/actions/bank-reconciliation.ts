"use server";

import { revalidatePath } from "next/cache";

export async function importBankMutationsAction(bank: string, rows: any[]) {
    const { getAuthOptions } = require("@/lib/auth");
    const { getServerSession } = require("next-auth");
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    const session = (await getServerSession(getAuthOptions())) as any;
    if (!session?.user?.id) throw new Error("Unauthorized");

    let importedCount = 0;
    let skippedCount = 0;

    for (const row of rows) {
        if (!row.date || !row.description || !row.amount) continue;

        const dateObj = new Date(row.date);
        const amountVal = Number(row.amount);
        const typeVal = row.type === "CR" || row.type === "CREDIT" ? "CR" : "DB";

        // Deduplication: check if this exact mutation was already uploaded
        const existing = await prisma.bankMutation.findFirst({
            where: {
                bank,
                date: dateObj,
                description: row.description,
                type: typeVal,
                amount: amountVal,
            }
        });

        if (!existing) {
            await prisma.bankMutation.create({
                data: {
                    bank,
                    date: dateObj,
                    description: row.description,
                    type: typeVal,
                    amount: amountVal,
                }
            });
            importedCount++;
        } else {
            skippedCount++;
        }
    }

    revalidatePath("/finance");
    return { success: true, importedCount, skippedCount };
}

export async function getBankMutationsAction(bank?: string, isReconciled?: boolean) {
    const { getAuthOptions } = require("@/lib/auth");
    const { getServerSession } = require("next-auth");
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    const session = (await getServerSession(getAuthOptions())) as any;
    if (!session?.user?.id) throw new Error("Unauthorized");

    const where: any = {};
    if (bank && bank !== "ALL") where.bank = bank;
    if (isReconciled !== undefined) where.isReconciled = isReconciled;

    const mutations = await prisma.bankMutation.findMany({
        where,
        include: {
            financeTransaction: true
        },
        orderBy: {
            date: "desc"
        }
    });

    return mutations;
}

export async function reconcileMutationAction(mutationId: string, transactionId: string) {
    const { getAuthOptions } = require("@/lib/auth");
    const { getServerSession } = require("next-auth");
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    const session = (await getServerSession(getAuthOptions())) as any;
    if (!session?.user?.id) throw new Error("Unauthorized");

    // Reconcile bank mutation with internal ERP transaction
    await prisma.bankMutation.update({
        where: { id: mutationId },
        data: {
            isReconciled: true,
            transactionId: transactionId
        }
    });

    revalidatePath("/finance");
    return { success: true };
}

export async function unreconcileMutationAction(mutationId: string) {
    const { getAuthOptions } = require("@/lib/auth");
    const { getServerSession } = require("next-auth");
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    const session = (await getServerSession(getAuthOptions())) as any;
    if (!session?.user?.id) throw new Error("Unauthorized");

    await prisma.bankMutation.update({
        where: { id: mutationId },
        data: {
            isReconciled: false,
            transactionId: null
        }
    });

    revalidatePath("/finance");
    return { success: true };
}
