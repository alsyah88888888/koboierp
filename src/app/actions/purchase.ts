"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Purchase Request Actions (Pengajuan Pembelian)
 */
export async function createPurchaseRequestAction(data: {
    items: { itemName: string; quantity: number; estimatedPrice: number }[];
    notes?: string;
}) {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user?.id) throw new Error("Unauthorized");

    const txDate = new Date();
    const day = String(txDate.getDate()).padStart(2, '0');
    const month = String(txDate.getMonth() + 1).padStart(2, '0');
    const year = txDate.getFullYear();
    const dateStr = `${year}${month}${day}`;

    return await prisma.$transaction(async (tx: any) => {
        // Generate Number: PR-YYYYMMDD-XXXX
        const count = await tx.purchaseRequest.count({
            where: {
                createdAt: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    lt: new Date(new Date().setHours(23, 59, 59, 999))
                }
            }
        });
        const prNumber = `PR-${dateStr}-${String(count + 1).padStart(4, '0')}`.replace(/\s+/g, '');

        await tx.purchaseRequest.create({
            data: {
                number: prNumber,
                notes: data.notes,
                requestedById: session.user.id,
                items: {
                    create: data.items.map((i: any) => ({
                        itemName: i.itemName,
                        quantity: i.quantity,
                        estimatedPrice: i.estimatedPrice as any
                    }))
                }
            }
        });

        revalidatePath("/purchase");
        return { success: true, prNumber };
    });
}

export async function updatePurchaseRequestStatusAction(id: string, status: "APPROVED_BY_ADMIN" | "VERIFIED_BY_FINANCE" | "REJECTED") {
    try {
        const session = await getServerSession(authOptions) as any;
        if (!session?.user?.id) throw new Error("Unauthorized: Sesi tidak ditemukan.");
        const role = session.user.role?.toUpperCase();

        const pr = await prisma.purchaseRequest.findUnique({
            where: { id },
            include: { items: true }
        });
        if (!pr) throw new Error("Request tidak ditemukan di database.");

        // Logic Check
        if (status === "APPROVED_BY_ADMIN" && role !== "ADMIN") throw new Error("Hanya Admin Utama yang bisa menyetujui.");
        if (status === "VERIFIED_BY_FINANCE" && role !== "FINANCE" && role !== "ADMIN") throw new Error("Hanya Finance atau Admin yang bisa memverifikasi.");
        if (status === "VERIFIED_BY_FINANCE" && pr.status !== "APPROVED_BY_ADMIN") throw new Error("Harus disetujui Admin Utama terlebih dahulu.");

        const updateData: any = { status };
        if (status === "APPROVED_BY_ADMIN") {
            updateData.approvedById = session.user.id;
            updateData.approvedAt = new Date();
        } else if (status === "VERIFIED_BY_FINANCE") {
            updateData.verifiedById = session.user.id;
            updateData.verifiedAt = new Date();
        }

        await prisma.$transaction(async (tx: any) => {
            await tx.purchaseRequest.update({
                where: { id },
                data: updateData
            });

            // Create Journal Entries if Verified by Finance
            if (status === "VERIFIED_BY_FINANCE") {
                const expenseAccount = await tx.financeAccount.findUnique({ where: { code: '601' } }); // Biaya Operasional
                const bankAccount = await tx.financeAccount.findUnique({ where: { code: '102' } }); // Bank DCA
                
                if (expenseAccount && bankAccount) {
                    const totalAmount = pr.items.reduce((sum: number, item: any) => sum + (item.quantity * Number(item.estimatedPrice)), 0);

                    // Debit Expense
                    await tx.journalEntry.create({
                        data: {
                            description: `Biaya Operasional (PR): ${pr.number}`,
                            amount: totalAmount as any,
                            type: "DEBIT",
                            accountId: expenseAccount.id,
                            date: new Date()
                        }
                    });

                    // Credit Bank
                    await tx.journalEntry.create({
                        data: {
                            description: `Pencairan Dana (PR): ${pr.number}`,
                            amount: totalAmount as any,
                            type: "CREDIT",
                            accountId: bankAccount.id,
                            date: new Date()
                        }
                    });
                } else if (!expenseAccount || !bankAccount) {
                    console.warn("Account 601 or 102 not found, skipping journal creation.");
                }
            }
        });

        revalidatePath("/purchase");
        revalidatePath("/finance");
        return { success: true };
    } catch (error: any) {
        console.error("Error in updatePurchaseRequestStatusAction:", error);
        return { success: false, error: error.message || "Gagal memperbarui status pengajuan." };
    }
}

export async function deletePurchaseRequestAction(id: string) {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user?.id) throw new Error("Unauthorized");
    const role = session.user.role?.toUpperCase();

    const pr = await prisma.purchaseRequest.findUnique({ where: { id } });
    if (!pr) throw new Error("Request not found");

    if (role !== "ADMIN" && pr.requestedById !== session.user.id) {
        throw new Error("Hanya Admin atau Pembuat Request yang bisa menghapus.");
    }

    if (pr.status !== "PENDING" && role !== "ADMIN") {
        throw new Error("Hanya Admin yang bisa menghapus request yang sudah diproses.");
    }

    await prisma.$transaction(async (tx: any) => {
        await tx.purchaseRequestItem.deleteMany({ where: { purchaseRequestId: id } });
        await tx.purchaseRequest.delete({ where: { id } });
    });

    revalidatePath("/purchase");
    return { success: true };
}

export async function getPurchaseRequestsAction() {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user?.id) throw new Error("Unauthorized");

    const isAdmin = session.user.role?.toUpperCase() === "ADMIN";
    const userFilter = isAdmin ? {} : { requestedById: session.user.id };

    return await prisma.purchaseRequest.findMany({
        where: userFilter,
        include: {
            items: true,
            requestedBy: { select: { name: true } },
            approvedBy: { select: { name: true } },
            verifiedBy: { select: { name: true } }
        },
        orderBy: { updatedAt: 'desc' }
    });
}

/**
 * Goods Receipt Actions (Penerimaan Barang)
 */
export async function createGoodsReceiptAction(data: {
    receiptNumber?: string;
    receivedFrom: string;
    warehouseId: string;
    date?: Date;
    taxInvoiceDate?: Date;
    taxInvoiceNumber?: string;
    salesPerson?: string;
    subtotal?: number;
    totalDiscount?: number;
    taxRate?: number;
    taxAmount?: number;
    grandTotal?: number;
    items: { productId: string; quantity: number; purchasePrice: number; discount: number; uom?: string }[];
}) {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user?.id) throw new Error("Unauthorized");

    const txDate = data.date || new Date();

    try {
        return await prisma.$transaction(async (tx: any) => {
            let finalReceiptNumber = data.receiptNumber;
            if (!finalReceiptNumber) {
                const day = String(txDate.getDate()).padStart(2, '0');
                const month = String(txDate.getMonth() + 1).padStart(2, '0');
                const year = txDate.getFullYear();
                const fullDateStr = `${year}${month}${day}`;
                
                const hasItemDiscount = data.items.some((item: any) => (Number(item.discount) || 0) > 0);
                const hasTotalDiscount = (Number(data.totalDiscount) || 0) > 0;
                const hasTax = (Number(data.taxRate) || 0) > 0;
                
                const prefixLabel = (hasItemDiscount || hasTotalDiscount || hasTax || (data.receiptNumber?.startsWith("KB-LPBD"))) ? "KB-LPBD" : "KB-LPB";
                const prefix = `${prefixLabel}-${fullDateStr}-`;

                const latest = await tx.goodsReceipt.findFirst({
                    where: { receiptNumber: { startsWith: prefix } },
                    orderBy: { receiptNumber: 'desc' }
                });

                let nextNum = 1;
                if (latest) {
                    const parts = latest.receiptNumber.split('-');
                    let seqPart = parts[parts.length - 1];
                    if (seqPart === 'P' && parts.length > 1) {
                        seqPart = parts[parts.length - 2];
                    }
                    const lastSeq = parseInt(seqPart);
                    if (!isNaN(lastSeq)) nextNum = lastSeq + 1;
                }
                finalReceiptNumber = `${prefix}${String(nextNum).padStart(3, '0')}`;
            }

            const hasItemDiscount = data.items.some((item: any) => (Number(item.discount) || 0) > 0);
            const hasTotalDiscount = (Number(data.totalDiscount) || 0) > 0;
            const hasTax = (Number(data.taxRate) || 0) > 0;
            if (finalReceiptNumber) {
                if ((hasItemDiscount || hasTotalDiscount || hasTax) && finalReceiptNumber.includes("KB-LPB-")) {
                    finalReceiptNumber = finalReceiptNumber.replace("KB-LPB-", "KB-LPBD-");
                } else if (!hasItemDiscount && !hasTotalDiscount && !hasTax && finalReceiptNumber.includes("KB-LPBD-")) {
                    finalReceiptNumber = finalReceiptNumber.replace("KB-LPBD-", "KB-LPB-");
                }
            }

            if (data.taxInvoiceNumber && finalReceiptNumber && !finalReceiptNumber.endsWith("-P")) {
                finalReceiptNumber += "-P";
            }

            const dayForm = String(txDate.getDate()).padStart(2, '0');
            const monthForm = String(txDate.getMonth() + 1).padStart(2, '0');
            const yearForm = txDate.getFullYear();
            const dateStrForm = `${yearForm}${monthForm}${dayForm}`;
            const formPrefix = `PO-${dateStrForm}`;

            const latestForm = await tx.goodsReceipt.findFirst({
                where: { formNumber: { startsWith: formPrefix } },
                orderBy: { formNumber: 'desc' }
            });

            let nextFormNum = 1;
            if (latestForm) {
                const lastPart = latestForm.formNumber.replace(formPrefix, '');
                const lastSeq = parseInt(lastPart);
                if (!isNaN(lastSeq)) nextFormNum = lastSeq + 1;
            }
            const formNumber = `${formPrefix}${String(nextFormNum).padStart(4, '0')}`;

            const roundedSubtotal = Math.round(data.subtotal || 0);
            const roundedTotalDiscount = Math.round(data.totalDiscount || 0);
            const roundedTaxAmount = Math.round(data.taxAmount || 0);
            const roundedGrandTotal = Math.round(data.grandTotal || 0);

            const receipt = await tx.goodsReceipt.create({
                data: {
                    receiptNumber: finalReceiptNumber,
                    receivedFrom: data.receivedFrom,
                    date: txDate,
                    taxInvoiceDate: data.taxInvoiceDate,
                    taxInvoiceNumber: data.taxInvoiceNumber,
                    salesPerson: data.salesPerson,
                    formNumber: formNumber,
                    warehouseId: data.warehouseId,
                    subtotal: roundedSubtotal,
                    totalDiscount: roundedTotalDiscount,
                    taxRate: data.taxRate || 0,
                    taxAmount: roundedTaxAmount,
                    grandTotal: roundedGrandTotal,
                    createdById: session?.user?.id,
                    items: {
                        create: data.items.map((item: any) => ({
                            productId: item.productId,
                            quantity: Math.round(item.quantity),
                            purchasePrice: item.purchasePrice as any,
                            discount: item.discount as any,
                            uom: item.uom
                        }))
                    }
                }
            });

            for (const item of data.items) {
                const roundedQty = Math.round(item.quantity);
                await tx.stock.upsert({
                    where: {
                        productId_warehouseId_vendorName: {
                            productId: item.productId,
                            warehouseId: data.warehouseId,
                            vendorName: data.receivedFrom
                        }
                    },
                    update: { quantity: { increment: roundedQty } },
                    create: {
                        productId: item.productId,
                        warehouseId: data.warehouseId,
                        vendorName: data.receivedFrom,
                        quantity: roundedQty
                    }
                });

                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        warehouseId: data.warehouseId,
                        vendorName: data.receivedFrom,
                        quantity: roundedQty,
                        type: "GOODS_RECEIPT",
                        reference: finalReceiptNumber
                    }
                });
            }

            revalidatePath("/purchase");
            revalidatePath("/warehouse");
            revalidatePath("/finance");
            revalidatePath("/");

            return receipt;
        });
    } catch (error: any) {
        if (error.code === 'P2002') {
            const target = error.meta?.target || "";
            if (target.includes('receiptNumber')) {
                throw new Error(`Nomor Surat Jalan "${data.receiptNumber}" sudah terdaftar. Gunakan nomor lain.`);
            }
            if (target.includes('formNumber')) {
                throw new Error(`Terjadi tabrakan nomor FORM otomatis. Silakan coba simpan kembali.`);
            }
            throw new Error(`Data dengan nomor tersebut sudah ada. Harap gunakan nomor yang berbeda.`);
        }
        throw error;
    }
}

/**
 * PR DASHBOARD: Get PR-specific statistics
 */
export async function getPurchaseRequestSummaryAction() {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user?.id) throw new Error("Unauthorized");

    const isAdmin = session.user.role?.toUpperCase() === "ADMIN";
    const userFilter = isAdmin ? {} : { requestedById: session.user.id };

    const allRequests = await prisma.purchaseRequest.findMany({
        where: userFilter,
        include: { items: true }
    });

    const stats = {
        pending: allRequests.filter((r: any) => r.status === "PENDING").length,
        approved: allRequests.filter((r: any) => r.status === "APPROVED_BY_ADMIN").length,
        verified: allRequests.filter((r: any) => r.status === "VERIFIED_BY_FINANCE").length,
        totalEstimation: allRequests
            .filter((r: any) => r.status !== "REJECTED")
            .reduce((acc: number, r: any) => {
                const prTotal = r.items.reduce((sum: number, item: any) => sum + (item.quantity * Number(item.estimatedPrice)), 0);
                return acc + prTotal;
            }, 0)
    };

    return stats;
}

/**
 * PURCHASE RETURN: Create a new Return Request (Warehouse / Purchase)
 */
export async function createPurchaseReturnAction(data: {
    receiptId: string;
    items: { productId: string; quantity: number; reason: string }[];
    notes?: string;
}) {
    return await prisma.$transaction(async (tx: any) => {
        const today = new Date();
        const dateStr = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
        const prefix = `RET-${dateStr}-`;
        const latest = await tx.purchaseReturn.findFirst({
            where: { returnNumber: { startsWith: prefix } },
            orderBy: { returnNumber: 'desc' }
        });

        let nextNum = 1;
        if (latest) {
            const parts = latest.returnNumber.split('-');
            const lastSeq = parseInt(parts[parts.length - 1]);
            if (!isNaN(lastSeq)) nextNum = lastSeq + 1;
        }
        const returnNumber = `${prefix}${String(nextNum).padStart(3, '0')}`;

        const session = await getServerSession(authOptions) as any;
        const ret = await tx.purchaseReturn.create({
            data: {
                returnNumber,
                receiptId: data.receiptId,
                notes: data.notes,
                createdById: session?.user?.id,
                items: {
                    create: data.items.map(i => ({
                        productId: i.productId,
                        quantity: i.quantity,
                        reason: i.reason
                    }))
                }
            }
        });

        const receipt = await tx.goodsReceipt.findUnique({ where: { id: data.receiptId } });
        if (receipt) {
            const vendorName = receipt.receivedFrom || "UMUM";
            for (const item of data.items) {
                await tx.stock.update({
                    where: {
                        productId_warehouseId_vendorName: {
                            productId: item.productId,
                            warehouseId: receipt.warehouseId,
                            vendorName: vendorName
                        }
                    },
                    data: { quantity: { decrement: item.quantity } }
                });

                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        warehouseId: receipt.warehouseId,
                        vendorName: vendorName,
                        quantity: -item.quantity,
                        type: "ADJUSTMENT",
                        reference: returnNumber
                    }
                });
            }
        }

        revalidatePath("/purchase");
        revalidatePath("/finance");
        revalidatePath("/warehouse");
        return ret;
    });
}

/**
 * PURCHASE RETURN: Verify Return by Finance
 */
export async function verifyPurchaseReturnAction(id: string) {
    const session = await getServerSession(authOptions) as any;
    return await prisma.$transaction(async (tx: any) => {
        const ret = await tx.purchaseReturn.findUnique({
            where: { id },
            include: {
                receipt: { include: { items: true } },
                items: true
            }
        });

        if (!ret || ret.status !== "PENDING") throw new Error("Invalid or already verified return");

        let totalValue = 0;
        ret.items.forEach((retItem: any) => {
            const receiptItem = ret.receipt.items.find((i: any) => i.productId === retItem.productId);
            if (receiptItem) {
                totalValue += (retItem.quantity * Number(receiptItem.purchasePrice));
            }
        });

        await tx.purchaseReturn.update({
            where: { id },
            data: { status: "VERIFIED_BY_FINANCE" }
        });

        const vendor = await tx.vendor.findFirst({ where: { name: ret.receipt.receivedFrom } });
        if (vendor) {
            await tx.vendor.update({
                where: { id: vendor.id },
                data: { balance: { decrement: totalValue } }
            });
        }

        const apAccount = await tx.financeAccount.findUnique({ where: { code: '201' } }); // Hutang
        const invAccount = await tx.financeAccount.findUnique({ where: { code: '104' } }); // Persediaan

        if (apAccount && invAccount) {
            await tx.journalEntry.create({ data: { description: `Retur Pembelian: ${ret.returnNumber}`, amount: totalValue as any, type: "DEBIT", accountId: apAccount.id, date: new Date(), createdById: session?.user?.id } });
            await tx.journalEntry.create({ data: { description: `Persediaan Keluar (Retur): ${ret.returnNumber}`, amount: totalValue as any, type: "CREDIT", accountId: invAccount.id, date: new Date(), createdById: session?.user?.id } });
        }

        revalidatePath("/finance");
        revalidatePath("/");
        return { success: true };
    });
}

/**
 * PURCHASE RETURN: Delete Return
 */
export async function deletePurchaseReturnAction(id: string) {
    return await prisma.$transaction(async (tx: any) => {
        const ret = await tx.purchaseReturn.findUnique({
            where: { id },
            include: { items: true, receipt: true }
        });
        if (!ret) throw new Error("Return not found");

        // Revert Stock
        const vendorName = ret.receipt.receivedFrom || "UMUM";
        for (const item of ret.items) {
            await tx.stock.update({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: item.productId,
                        warehouseId: ret.receipt.warehouseId,
                        vendorName: vendorName
                    }
                },
                data: { quantity: { increment: item.quantity } }
            });

            // Remove Stock Movement
            await tx.stockMovement.deleteMany({
                where: { reference: ret.returnNumber, productId: item.productId }
            });
        }

        // Revert Finance if Verified
        if (ret.status === "VERIFIED_BY_FINANCE") {
            let totalValue = 0;
            for (const retItem of ret.items) {
                const receiptItem = await tx.goodsReceiptItem.findFirst({
                    where: { receiptId: ret.receiptId, productId: retItem.productId }
                });
                if (receiptItem) {
                    totalValue += (retItem.quantity * Number(receiptItem.purchasePrice));
                }
            }

            const vendor = await tx.vendor.findFirst({ where: { name: ret.receipt.receivedFrom } });
            if (vendor) {
                await tx.vendor.update({
                    where: { id: vendor.id },
                    data: { balance: { increment: totalValue } }
                });
            }

            // Delete Journal Entries
            await tx.journalEntry.deleteMany({
                where: { description: { contains: ret.returnNumber } }
            });
        }

        await tx.purchaseReturnItem.deleteMany({ where: { purchaseReturnId: id } });
        await tx.purchaseReturn.delete({ where: { id } });

        revalidatePath("/purchase");
        revalidatePath("/finance");
        revalidatePath("/warehouse");
    });
}

/**
 * PURCHASE RETURN: Update Return
 */
export async function updatePurchaseReturnAction(id: string, data: {
    items: { productId: string; quantity: number; reason: string }[];
    notes?: string;
}) {
    return await prisma.$transaction(async (tx: any) => {
        const ret = await tx.purchaseReturn.findUnique({
            where: { id },
            include: { items: true, receipt: true }
        });
        if (!ret) throw new Error("Return not found");
        if (ret.status === "VERIFIED_BY_FINANCE") throw new Error("Cannot edit verified return");

        // 1. Revert Old Stock
        const vendorName = ret.receipt.receivedFrom || "UMUM";
        for (const oldItem of ret.items) {
            await tx.stock.update({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: oldItem.productId,
                        warehouseId: ret.receipt.warehouseId,
                        vendorName: vendorName
                    }
                },
                data: { quantity: { increment: oldItem.quantity } }
            });
        }

        // 2. Clear Old Items
        await tx.purchaseReturnItem.deleteMany({ where: { purchaseReturnId: id } });

        // 3. Apply New Stock & Create New Items
        for (const newItem of data.items) {
            await tx.stock.update({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: newItem.productId,
                        warehouseId: ret.receipt.warehouseId,
                        vendorName: vendorName
                    }
                },
                data: { quantity: { decrement: newItem.quantity } }
            });

            await tx.purchaseReturnItem.create({
                data: {
                    purchaseReturnId: id,
                    productId: newItem.productId,
                    quantity: newItem.quantity,
                    reason: newItem.reason
                }
            });

            // Update Stock Movement
            await tx.stockMovement.updateMany({
                where: { reference: ret.returnNumber, productId: newItem.productId },
                data: { quantity: -newItem.quantity }
            });
        }

        await tx.purchaseReturn.update({
            where: { id },
            data: { notes: data.notes }
        });

        revalidatePath("/purchase");
        revalidatePath("/warehouse");
    });
}

export async function updateGoodsReceiptAction(id: string, data: {
    receiptNumber?: string;
    receivedFrom: string;
    warehouseId: string;
    date?: Date;
    taxInvoiceDate?: Date;
    taxInvoiceNumber?: string;
    salesPerson?: string;
    subtotal?: number;
    totalDiscount?: number;
    taxRate?: number;
    taxAmount?: number;
    grandTotal?: number;
    items: { productId: string; quantity: number; purchasePrice: number; discount: number; uom?: string }[];
}) {
    try {
        await prisma.$transaction(async (tx: any) => {
            const existing = await (tx.goodsReceipt as any).findUnique({
                where: { id },
                include: { items: true }
            });
            if (!existing) throw new Error("Penerimaan barang tidak ditemukan.");

            for (const item of existing.items) {
                await tx.stock.updateMany({
                    where: {
                        productId: item.productId,
                        warehouseId: existing.warehouseId,
                        vendorName: existing.receivedFrom
                    },
                    data: { quantity: { decrement: item.quantity } }
                });
            }

            let finalReceiptNumber = data.receiptNumber || existing.receiptNumber;

            const hasItemDiscount = data.items.some((item: any) => (Number(item.discount) || 0) > 0);
            const hasTotalDiscount = (Number(data.totalDiscount) || 0) > 0;
            const hasTax = (Number(data.taxRate) || 0) > 0;
            if ((hasItemDiscount || hasTotalDiscount || hasTax) && finalReceiptNumber.includes("KB-LPB-")) {
                finalReceiptNumber = finalReceiptNumber.replace("KB-LPB-", "KB-LPBD-");
            } else if (!hasItemDiscount && !hasTotalDiscount && !hasTax && finalReceiptNumber.includes("KB-LPBD-")) {
                finalReceiptNumber = finalReceiptNumber.replace("KB-LPBD-", "KB-LPB-");
            }

            if (data.taxInvoiceNumber && finalReceiptNumber && !finalReceiptNumber.endsWith("-P")) {
                finalReceiptNumber += "-P";
            }
            const roundedSubtotal = Math.round(data.subtotal || 0);
            const roundedTotalDiscount = Math.round(data.totalDiscount || 0);
            const roundedTaxAmount = Math.round(data.taxAmount || 0);
            const roundedGrandTotal = Math.round(data.grandTotal || 0);

            await tx.goodsReceipt.update({
                where: { id },
                data: {
                    receiptNumber: finalReceiptNumber,
                    receivedFrom: data.receivedFrom,
                    warehouseId: data.warehouseId,
                    date: data.date || existing.date,
                    taxInvoiceDate: data.taxInvoiceDate,
                    taxInvoiceNumber: data.taxInvoiceNumber,
                    salesPerson: data.salesPerson,
                    subtotal: roundedSubtotal,
                    totalDiscount: roundedTotalDiscount,
                    taxRate: data.taxRate || 0,
                    taxAmount: roundedTaxAmount,
                    grandTotal: roundedGrandTotal
                }
            });

            try {
                await tx.goodsReceiptItem.deleteMany({ where: { receiptId: id } });
                await tx.goodsReceiptItem.createMany({
                    data: data.items.map((item: any) => ({
                        receiptId: id,
                        productId: item.productId,
                        quantity: Math.round(item.quantity),
                        purchasePrice: item.purchasePrice as any,
                        discount: item.discount as any,
                        uom: item.uom
                    }))
                });
            } catch (err: any) {
                if (err.code === 'P2003') {
                    throw new Error("Gagal mengupdate barang karena sudah ada riwayat verifikasi/retur pada barang ini. Hanya informasi header yang bisa diubah.");
                }
                throw err;
            }

            for (const item of data.items) {
                const roundedQty = Math.round(item.quantity);
                await tx.stock.upsert({
                    where: {
                        productId_warehouseId_vendorName: {
                            productId: item.productId,
                            warehouseId: data.warehouseId,
                            vendorName: data.receivedFrom
                        }
                    },
                    update: { quantity: { increment: roundedQty } },
                    create: {
                        productId: item.productId,
                        warehouseId: data.warehouseId,
                        vendorName: data.receivedFrom,
                        quantity: roundedQty
                    }
                });

                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        warehouseId: data.warehouseId,
                        vendorName: data.receivedFrom,
                        quantity: roundedQty,
                        type: "GOODS_RECEIPT_UPDATE",
                        reference: finalReceiptNumber
                    }
                });
            }
        });

        revalidatePath("/purchase");
        revalidatePath("/warehouse");
        revalidatePath("/finance");
        revalidatePath("/");

        return { success: true };
    } catch (error: any) {
        console.error("Update Goods Receipt Error:", error);
        if (error.code === 'P2002') {
            const target = error.meta?.target || "";
            if (target.includes('receiptNumber')) {
                throw new Error(`Nomor Surat Jalan "${data.receiptNumber}" sudah terdaftar pada data lain.`);
            }
            throw new Error(`Terjadi duplikasi data unik saat update.`);
        }
        throw new Error(error.message || "Terjadi kesalahan saat menyimpan perubahan.");
    }
}

export async function verifyGoodsReceiptAction(id: string, verifiedBy: string, checkedItems?: Record<string, number>) {
    const session = await getServerSession(authOptions) as any;
    return await prisma.$transaction(async (tx: any) => {
        const receipt = await tx.goodsReceipt.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!receipt) throw new Error("Penerimaan barang tidak ditemukan.");
        if (receipt.isVerified) throw new Error("Penerimaan barang sudah diverifikasi.");

        for (const item of receipt.items) {
            const actualQty = checkedItems?.[item.id] !== undefined ? checkedItems[item.id] : item.quantity;
            const expectedQty = item.quantity;

            if (actualQty > 0) {
                await tx.stock.upsert({
                    where: {
                        productId_warehouseId_vendorName: {
                            productId: item.productId,
                            warehouseId: receipt.warehouseId,
                            vendorName: receipt.receivedFrom
                        }
                    },
                    update: { quantity: { increment: actualQty } },
                    create: {
                        productId: item.productId,
                        warehouseId: receipt.warehouseId,
                        vendorName: receipt.receivedFrom,
                        quantity: actualQty
                    }
                });

                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        warehouseId: receipt.warehouseId,
                        vendorName: receipt.receivedFrom,
                        quantity: actualQty,
                        type: "GOODS_RECEIPT",
                        reference: receipt.receiptNumber
                    }
                });
            }

            await tx.goodsReceiptVerification.create({
                data: {
                    receiptId: id,
                    productId: item.productId,
                    expectedQuantity: expectedQty,
                    actualQuantity: actualQty,
                    expectedPrice: item.purchasePrice,
                    actualPrice: item.purchasePrice,
                    verifiedBy: session?.user?.name || verifiedBy || "System",
                    notes: actualQty === expectedQty 
                        ? "Sesuai dokumen" 
                        : `Selisih: ${actualQty - expectedQty} (Dokumen: ${expectedQty}, Fisik: ${actualQty})`
                }
            });
        }

        await tx.goodsReceipt.update({
            where: { id },
            data: {
                isVerified: true,
                verifiedAt: new Date(),
                verifiedBy: session?.user?.name || verifiedBy || "System"
            }
        });
        
        revalidatePath("/purchase");
        revalidatePath("/warehouse");
        revalidatePath("/finance");
        revalidatePath("/");

        return { success: true };
    });
}

export async function deleteGoodsReceiptAction(id: string) {
    return await prisma.$transaction(async (tx: any) => {
        const receipt = await tx.goodsReceipt.findUnique({
            where: { id },
            include: { 
                items: true,
                returns: { include: { items: true } },
                verifications: true
            }
        });

        if (!receipt) throw new Error("Receipt not found");
        
        if (receipt.paymentStatus !== "PENDING") {
            const vendor = await tx.vendor.findFirst({ where: { name: receipt.receivedFrom } });
            if (vendor) {
                await tx.vendor.update({
                    where: { id: vendor.id },
                    data: { balance: { decrement: Number(receipt.grandTotal || 0) } }
                });
            }
        }

        if (receipt.isVerified) {
            for (const item of receipt.items) {
                try {
                    await tx.stock.update({
                        where: {
                            productId_warehouseId_vendorName: {
                                productId: item.productId,
                                warehouseId: receipt.warehouseId,
                                vendorName: receipt.receivedFrom
                            }
                        },
                        data: { quantity: { decrement: item.quantity } }
                    });
                } catch (_) {}

                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        warehouseId: receipt.warehouseId,
                        vendorName: receipt.receivedFrom,
                        quantity: -item.quantity,
                        type: "GOODS_RECEIPT_CANCEL",
                        reference: receipt.receiptNumber
                    }
                });
            }
        }

        for (const ret of (receipt.returns || [])) {
            await tx.purchaseReturnItem.deleteMany({ where: { purchaseReturnId: ret.id } });
            await tx.purchaseReturn.delete({ where: { id: ret.id } });
        }

        await tx.goodsReceiptVerification.deleteMany({ where: { receiptId: id } });
        await tx.goodsReceiptItem.deleteMany({ where: { receiptId: id } });
        await tx.goodsReceipt.delete({ where: { id } });

        revalidatePath("/purchase");
        revalidatePath("/warehouse");
        revalidatePath("/finance");
        revalidatePath("/");

        return { success: true };
    });
}
