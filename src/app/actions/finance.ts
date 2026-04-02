"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Helper: Recalculate vendor balance from actual receipt data (avoid drift)
 */
async function syncVendorBalanceAfterPayment(tx: any, vendorName: string) {
    const receipts = await tx.goodsReceipt.findMany({
        where: { receivedFrom: vendorName },
        select: { grandTotal: true, paidAmount: true, paymentStatus: true }
    });
    const correctBalance = receipts.reduce((sum: number, r: any) => {
        if (r.paymentStatus !== "PAID") {
            return sum + Math.max(0, Number(r.grandTotal || 0) - Number(r.paidAmount || 0));
        }
        return sum;
    }, 0);
    const vendor = await tx.vendor.findFirst({ where: { name: vendorName } });
    if (vendor) {
        await tx.vendor.update({ where: { id: vendor.id }, data: { balance: correctBalance } });
    }
}

/**
 * Finance Actions
 */

/**
 * FINANCE: Update Payment Status (Lunas / Belum Lunas)
 * This handles the actual cash flow to Bank BCA (102)
 */
export async function updatePaymentStatusAction(type: "PURCHASE" | "SALE", id: string, status: "PAID" | "CREDIT" | "PENDING" | "PARTIAL", partialAmount?: number, paymentDate?: Date) {
    const session = await getServerSession(authOptions) as any;
    return await prisma.$transaction(async (tx: any) => {
        let reference = "";
        let amount = 0;
        let party = "";

        if (type === "PURCHASE") {
            const receipt = await (tx.goodsReceipt as any).findUnique({
                where: { id },
                include: { items: true }
            });
            if (!receipt) throw new Error("Receipt not found");

            const previousStatus = receipt.paymentStatus;
            if (previousStatus === status && !partialAmount) return { success: true };

            reference = receipt.receiptNumber;
            party = receipt.receivedFrom;
            amount = Math.round(Number(receipt.grandTotal || 0));
            const currentPaid = Math.round(Number(receipt.paidAmount || 0));
            const toPay = partialAmount ? Math.round(Number(partialAmount)) : (status === "PAID" ? amount - currentPaid : 0);

            let newStatus = status;
            if ((status === "PAID" || status === "PARTIAL") && currentPaid + toPay < amount) {
                newStatus = "PARTIAL";
            } else if (status === "PAID" || (status === "PARTIAL" && currentPaid + toPay >= amount)) {
                newStatus = "PAID";
            }

            await (tx.goodsReceipt as any).update({
                where: { id },
                data: {
                    paymentStatus: newStatus as any,
                    paidAmount: { increment: toPay }
                }
            });

            const invAccount = await tx.financeAccount.findUnique({ where: { code: '104' } }); // Persediaan
            const bankAccount = await tx.financeAccount.findUnique({ where: { code: '102' } }); // Bank BCA
            const apAccount = await tx.financeAccount.findUnique({ where: { code: '201' } }); // Hutang
            const taxAccount = await tx.financeAccount.findUnique({ where: { code: '106' } }); // PPN Masukan
            const discAccount = await tx.financeAccount.findUnique({ where: { code: '502' } }); // Potongan Pembelian

            if (previousStatus === "PENDING" && (status === "CREDIT" || status === "PARTIAL")) {
                if (invAccount && apAccount) {
                    const subtotal = Math.round(Number(receipt.subtotal || 0));
                    const totalDiscount = Math.round(Number(receipt.totalDiscount || 0));
                    const taxAmount = Math.round(Number(receipt.taxAmount || 0));
                    const finalGrandTotal = Math.round(Number(receipt.grandTotal || 0));

                    const txPaymentDate = paymentDate || new Date();
                    await tx.journalEntry.create({ data: { description: `Persediaan (Hutang): ${reference} (${party})`, amount: subtotal as any, type: "DEBIT", accountId: invAccount.id, date: txPaymentDate, createdById: session?.user?.id } });
                    await tx.journalEntry.create({ data: { description: `Hutang Pembelian: ${reference} (${party})`, amount: finalGrandTotal as any, type: "CREDIT", accountId: apAccount.id, date: txPaymentDate, createdById: session?.user?.id } });

                    if (taxAccount && taxAmount > 0) {
                        await tx.journalEntry.create({ data: { description: `PPN Masukan: ${reference}`, amount: taxAmount as any, type: "DEBIT", accountId: taxAccount.id, date: txPaymentDate, createdById: session?.user?.id } });
                    }
                    if (discAccount && totalDiscount > 0) {
                        await tx.journalEntry.create({ data: { description: `Potongan Pembelian: ${reference}`, amount: totalDiscount as any, type: "CREDIT", accountId: discAccount.id, date: txPaymentDate, createdById: session?.user?.id } });
                    }
                }
                await syncVendorBalanceAfterPayment(tx, party);

                if (status === "PARTIAL" && toPay > 0 && apAccount && bankAccount) {
                    const dpDate = paymentDate || new Date();
                    await tx.journalEntry.create({ data: { description: `Pembayaran DP Hutang: ${reference} (${party})`, amount: toPay as any, type: "DEBIT", accountId: apAccount.id, date: dpDate, createdById: session?.user?.id } });
                    await tx.journalEntry.create({ data: { description: `Kas Bank (Keluar DP): ${reference} (${party})`, amount: toPay as any, type: "CREDIT", accountId: bankAccount.id, date: dpDate, createdById: session?.user?.id } });
                    await syncVendorBalanceAfterPayment(tx, party);
                }
            } else if (previousStatus === "PENDING" && status === "PAID") {
                if (invAccount && bankAccount) {
                    const subtotal = Math.round(Number(receipt.subtotal || 0));
                    const totalDiscount = Math.round(Number(receipt.totalDiscount || 0));
                    const taxAmount = Math.round(Number(receipt.taxAmount || 0));
                    const finalGrandTotal = Math.round(Number(receipt.grandTotal || 0));

                    const payDate = paymentDate || new Date();
                    await tx.journalEntry.create({ data: { description: `Persediaan (Lunas Kas): ${reference} (${party})`, amount: subtotal as any, type: "DEBIT", accountId: invAccount.id, date: payDate, createdById: session?.user?.id } });
                    await tx.journalEntry.create({ data: { description: `Pembelian Tunai (Bank): ${reference} (${party})`, amount: finalGrandTotal as any, type: "CREDIT", accountId: bankAccount.id, date: payDate, createdById: session?.user?.id } });

                    if (taxAccount && taxAmount > 0) {
                        await tx.journalEntry.create({ data: { description: `PPN Masukan: ${reference}`, amount: taxAmount as any, type: "DEBIT", accountId: taxAccount.id, date: payDate, createdById: session?.user?.id } });
                    }
                    if (discAccount && totalDiscount > 0) {
                        await tx.journalEntry.create({ data: { description: `Potongan Pembelian: ${reference}`, amount: totalDiscount as any, type: "CREDIT", accountId: discAccount.id, date: payDate, createdById: session?.user?.id } });
                    }
                }
            } else if ((previousStatus === "CREDIT" || previousStatus === "PARTIAL") && (status === "PAID" || status === "PARTIAL")) {
                if (apAccount && bankAccount && toPay > 0) {
                    const activePayDate = paymentDate || new Date();
                    await tx.journalEntry.create({ data: { description: `Pembayaran ${status === "PARTIAL" ? "DP/Sebagian" : "Pelunasan"} Hutang: ${reference} (${party})`, amount: toPay as any, type: "DEBIT", accountId: apAccount.id, date: activePayDate, createdById: session?.user?.id } });
                    await tx.journalEntry.create({ data: { description: `Kas Bank (Keluar): ${reference} (${party})`, amount: toPay as any, type: "CREDIT", accountId: bankAccount.id, date: activePayDate, createdById: session?.user?.id } });
                }
                await syncVendorBalanceAfterPayment(tx, party);
            }

        } else {
            const delivery = await (tx.salesDelivery as any).findUnique({
                where: { id },
                include: { items: true }
            });
            if (!delivery) throw new Error("Delivery not found");

            const previousStatus = delivery.paymentStatus;
            if (previousStatus === status && !partialAmount) return { success: true };

            reference = delivery.deliveryNumber;
            party = delivery.buyerName;

            const deliveryRaw: any[] = await tx.$queryRawUnsafe(`SELECT "grandTotal", "taxAmount", "totalDiscount", "paidAmount" FROM "SalesDelivery" WHERE id = $1`, id);
            amount = Math.round(Number(deliveryRaw[0]?.grandTotal || 0));
            const currentPaid = Math.round(Number(deliveryRaw[0]?.paidAmount || 0));
            const toReceive = partialAmount ? Math.round(Number(partialAmount)) : (status === "PAID" ? amount - currentPaid : 0);

            const taxAmountValue = Math.round(Number(deliveryRaw[0]?.taxAmount || 0));
            const totalDiscountNominal = Math.round(Number(deliveryRaw[0]?.totalDiscount || 0));

            let newStatus = status;
            if ((status === "PAID" || status === "PARTIAL") && currentPaid + toReceive < amount) {
                newStatus = "PARTIAL";
            } else if (status === "PAID" || (status === "PARTIAL" && currentPaid + toReceive >= amount)) {
                newStatus = "PAID";
            }

            await (tx.salesDelivery as any).update({
                where: { id },
                data: {
                    paymentStatus: newStatus as any,
                    paidAmount: { increment: toReceive }
                }
            });

            const arAccount = await tx.financeAccount.findUnique({ where: { code: '105' } });   // Piutang
            const bankAccount = await tx.financeAccount.findUnique({ where: { code: '102' } }); // Bank BCA
            const salesAccount = await tx.financeAccount.findUnique({ where: { code: '401' } }); // Pendapatan
            const taxAccountRef = await tx.financeAccount.findUnique({ where: { code: '202' } }); // PPN Keluaran
            const discountAccount = await tx.financeAccount.findUnique({ where: { code: '402' } }); // Potongan

            const grossAmount = Math.round(delivery.items.reduce((sum: number, i: any) => sum + (i.quantity * Number(i.salesPrice)), 0));
            let totalItemDiscounts = 0;
            delivery.items.forEach((i: any) => {
                totalItemDiscounts += Math.round(Number(i.discount) || 0);
            });
            const totalAllDiscounts = Math.round(totalItemDiscounts + totalDiscountNominal);

            if (previousStatus === "PENDING" && (status === "CREDIT" || status === "PARTIAL")) {
                if (arAccount && salesAccount) {
                    const txRecogDate = paymentDate || new Date();
                    await tx.journalEntry.create({ data: { description: `Piutang Penjualan: ${reference} (${party})`, amount: amount as any, type: "DEBIT", accountId: arAccount.id, date: txRecogDate, createdById: session?.user?.id } });
                    await tx.journalEntry.create({ data: { description: `Pendapatan Penjualan: ${reference}`, amount: grossAmount as any, type: "CREDIT", accountId: salesAccount.id, date: txRecogDate, createdById: session?.user?.id } });

                    if (discountAccount && totalAllDiscounts > 0) {
                        await tx.journalEntry.create({ data: { description: `Potongan Penjualan: ${reference}`, amount: totalAllDiscounts as any, type: "DEBIT", accountId: discountAccount.id, date: txRecogDate, createdById: session?.user?.id } });
                    }
                    if (taxAccountRef && taxAmountValue > 0) {
                        await tx.journalEntry.create({ data: { description: `PPN Keluaran: ${reference}`, amount: taxAmountValue as any, type: "CREDIT", accountId: taxAccountRef.id, date: txRecogDate, createdById: session?.user?.id } });
                    }
                }
                const customer = await tx.customer.findFirst({ where: { name: party } });
                if (customer) {
                    await tx.customer.update({ where: { id: customer.id }, data: { balance: { increment: amount } } });
                }

                if (status === "PARTIAL" && toReceive > 0 && arAccount && bankAccount) {
                    const dpRecDate = paymentDate || new Date();
                    await tx.journalEntry.create({ data: { description: `Kas Bank (Terima DP): ${reference} (${party})`, amount: toReceive as any, type: "DEBIT", accountId: bankAccount.id, date: dpRecDate, createdById: session?.user?.id } });
                    await tx.journalEntry.create({ data: { description: `Penyelesaian Piutang (DP): ${reference} (${party})`, amount: toReceive as any, type: "CREDIT", accountId: arAccount.id, date: dpRecDate, createdById: session?.user?.id } });
                    const customerAgain = await tx.customer.findFirst({ where: { name: party } });
                    if (customerAgain) {
                        await tx.customer.update({ where: { id: customerAgain.id }, data: { balance: { decrement: toReceive } } });
                    }
                }
            } else if (previousStatus === "PENDING" && status === "PAID") {
                if (bankAccount && salesAccount) {
                    const fullRecDate = paymentDate || new Date();
                    await tx.journalEntry.create({ data: { description: `Kas Bank (Penjualan Tunai): ${reference} (${party})`, amount: amount as any, type: "DEBIT", accountId: bankAccount.id, date: fullRecDate, createdById: session?.user?.id } });
                    await tx.journalEntry.create({ data: { description: `Pendapatan Penjualan: ${reference}`, amount: grossAmount as any, type: "CREDIT", accountId: salesAccount.id, date: fullRecDate, createdById: session?.user?.id } });

                    if (discountAccount && totalAllDiscounts > 0) {
                        await tx.journalEntry.create({ data: { description: `Potongan Penjualan: ${reference}`, amount: totalAllDiscounts as any, type: "DEBIT", accountId: discountAccount.id, date: fullRecDate, createdById: session?.user?.id } });
                    }
                    if (taxAccountRef && taxAmountValue > 0) {
                        await tx.journalEntry.create({ data: { description: `PPN Keluaran: ${reference}`, amount: taxAmountValue as any, type: "CREDIT", accountId: taxAccountRef.id, date: fullRecDate, createdById: session?.user?.id } });
                    }
                }
            } else if ((previousStatus === "CREDIT" || previousStatus === "PARTIAL") && (status === "PAID" || status === "PARTIAL")) {
                if (bankAccount && arAccount && toReceive > 0) {
                    const instRecDate = paymentDate || new Date();
                    await tx.journalEntry.create({ data: { description: `Penerimaan ${status === "PARTIAL" ? "DP/Sebagian" : "Pelunasan"} Piutang: ${reference} (${party})`, amount: toReceive as any, type: "DEBIT", accountId: bankAccount.id, date: instRecDate, createdById: session?.user?.id } });
                    await tx.journalEntry.create({ data: { description: `Penyelesaian Piutang: ${reference} (${party})`, amount: toReceive as any, type: "CREDIT", accountId: arAccount.id, date: instRecDate, createdById: session?.user?.id } });
                }
                const customer = await tx.customer.findFirst({ where: { name: party } });
                if (customer && toReceive > 0) {
                    await tx.customer.update({ where: { id: customer.id }, data: { balance: { decrement: toReceive } } });
                }
            }
        }

        revalidatePath("/finance");
        revalidatePath("/");
        revalidatePath("/purchase");
        revalidatePath("/sales");

        return { success: true };
    });
}
export async function createFinanceTransactionAction(data: {
    transactionType: "PAYMENT" | "RECEIPT" | "MUTATION";
    bank: string;
    date: Date;
    referenceNumber?: string;
    description: string;
    amount: number;
    accountId: string; 
    bankAccountId?: string; 
    salesPerson?: string; 
}) {
    return await prisma.$transaction(async (tx: any) => {
        const now = new Date();
        const txDate = new Date(data.date);
        if (txDate.toDateString() === now.toDateString()) {
            txDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
        }

        const session = await getServerSession(authOptions) as any;
        const transaction = await tx.financeTransaction.create({
            data: {
                transactionType: data.transactionType,
                bank: data.bank,
                date: txDate,
                referenceNumber: data.referenceNumber,
                description: data.description,
                amount: data.amount as any,
                createdById: session?.user?.id,
                salesPerson: data.salesPerson 
            }
        });

        const isPayment = data.transactionType === "PAYMENT";
        const isMutation = data.transactionType === "MUTATION";

        let typeTargetAccount = isPayment ? "DEBIT" : "CREDIT";
        let typeBankAccount = isPayment ? "CREDIT" : "DEBIT";

        if (isMutation) {
            typeTargetAccount = "DEBIT"; 
            typeBankAccount = "CREDIT";  
        }

        await tx.journalEntry.create({
            data: {
                description: data.description,
                amount: data.amount as any,
                type: typeTargetAccount as any,
                accountId: data.accountId,
                transactionId: transaction.id,
                date: data.date,
                createdById: session?.user?.id
            }
        });

        if (data.bankAccountId) {
            await tx.journalEntry.create({
                data: {
                    description: `${data.transactionType}: ${data.bank} - ${data.referenceNumber || ''}`,
                    amount: data.amount as any,
                    type: typeBankAccount as any,
                    accountId: data.bankAccountId,
                    transactionId: transaction.id,
                    date: txDate,
                    createdById: session?.user?.id
                }
            });
        }

        revalidatePath("/finance");
        revalidatePath("/");

        return { success: true, transactionId: transaction.id };
    });
}

export async function getAccountingDataAction() {
    const session = await getServerSession(authOptions) as any;
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
    const session = await getServerSession(authOptions) as any;
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
    return await prisma.$transaction(async (tx: any) => {
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
    const session = await getServerSession(authOptions) as any;
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
