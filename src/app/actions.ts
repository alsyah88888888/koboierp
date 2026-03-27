"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateCortexXml } from "@/lib/cortex";
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
    return await prisma.purchaseRequest.findMany({
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
    const txDate = data.date || new Date();

    try {
        return await prisma.$transaction(async (tx: any) => {
            // --- MOVED INSIDE TRANSACTION TO PREVENT COLLISIONS ---
            let finalReceiptNumber = data.receiptNumber;
            if (!finalReceiptNumber) {
                const day = String(txDate.getDate()).padStart(2, '0');
                const month = String(txDate.getMonth() + 1).padStart(2, '0');
                const year = txDate.getFullYear();
                const fullDateStr = `${year}${month}${day}`;
                
                // Determine prefix based on discounts
                const hasItemDiscount = data.items.some(item => (Number(item.discount) || 0) > 0);
                const hasTotalDiscount = (Number(data.totalDiscount) || 0) > 0;
                
                // If user manually set a number with KB-LPBD but values are 0, we still respect the prefix if it was passed
                // But if auto-generating, we check the actual values OR the user's intent
                const prefixLabel = (hasItemDiscount || hasTotalDiscount || (data.receiptNumber?.startsWith("KB-LPBD"))) ? "KB-LPBD" : "KB-LPB";
                const prefix = `${prefixLabel}-${fullDateStr}-`;

                const latest = await tx.goodsReceipt.findFirst({
                    where: { receiptNumber: { startsWith: prefix } },
                    orderBy: { receiptNumber: 'desc' }
                });

                let nextNum = 1;
                if (latest) {
                    const parts = latest.receiptNumber.split('-');
                    // Handle "-P" suffix added for tax invoice receipts (e.g. KB-LPB-20260311-001-P)
                    // The last part could be "P", so we look backwards for a numeric part
                    let seqPart = parts[parts.length - 1];
                    if (seqPart === 'P' && parts.length > 1) {
                        seqPart = parts[parts.length - 2];
                    }
                    const lastSeq = parseInt(seqPart);
                    if (!isNaN(lastSeq)) nextNum = lastSeq + 1;
                }
                finalReceiptNumber = `${prefix}${String(nextNum).padStart(3, '0')}`;
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

            // --- ROUNDING FOR ACCURACY ---
            const roundedSubtotal = Math.round(data.subtotal || 0);
            const roundedTotalDiscount = Math.round(data.totalDiscount || 0);
            const roundedTaxAmount = Math.round(data.taxAmount || 0);
            const roundedGrandTotal = Math.round(data.grandTotal || 0);

            const session = await getServerSession(authOptions) as any;
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
                        create: data.items.map(item => ({
                            productId: item.productId,
                            quantity: Math.round(item.quantity),
                            purchasePrice: item.purchasePrice as any,
                            discount: item.discount as any,
                            uom: item.uom
                        }))
                    }
                }
            });


            // --- AUTOMATIC STOCK UPDATE ON CREATE ---
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

            // Jurnal & Saldo Hutang tidak lagi dicatat di sini. 
            // Akan dicatat oleh Finance saat klik verifikasi (Lunas/Hutang)

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
 * UPDATE: Goods Receipt (Edit existing)
 */
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
            // 1. Check if verified. include items to adjust stock
            const existing = await (tx.goodsReceipt as any).findUnique({
                where: { id },
                include: { items: true }
            });
            if (!existing) throw new Error("Penerimaan barang tidak ditemukan.");

            // --- REVERSE OLD STOCK ---
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

            // 2. Update Header
            let finalReceiptNumber = data.receiptNumber || existing.receiptNumber;
            if (data.taxInvoiceNumber && finalReceiptNumber && !finalReceiptNumber.endsWith("-P")) {
                finalReceiptNumber += "-P";
            }
            // 4. Update Header with Rounded Totals
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

            // 3. Update Items
            // NOTE: If this fails due to foreign keys (verifications/returns), 
            // it means the items are locked and shouldn't be deleted/recreated.
            try {
                await tx.goodsReceiptItem.deleteMany({ where: { receiptId: id } });
                await tx.goodsReceiptItem.createMany({
                    data: data.items.map(item => ({
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

            // --- APPLY NEW STOCK ---
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

        // Revalidate outside transaction for better performance and safety
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

        // Return clear error message for the UI
        throw new Error(error.message || "Terjadi kesalahan saat menyimpan perubahan.");
    }
}

/**
 * ADMIN GUDANG: Verify Goods Receipt (Finalize Stock & Accounting)
 */
export async function verifyGoodsReceiptAction(id: string, verifiedBy: string, checkedItems?: Record<string, number>) {
    return await prisma.$transaction(async (tx: any) => {
        const receipt = await tx.goodsReceipt.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!receipt) throw new Error("Penerimaan barang tidak ditemukan.");
        if (receipt.isVerified) throw new Error("Penerimaan barang sudah diverifikasi.");

        // Adjust stock and recalculate totals if checkedItems are provided
        let currentSubtotal = Number(receipt.subtotal || 0);
        let hasChanges = false;

        if (checkedItems) {
            for (const item of receipt.items) {
                const actualQty = checkedItems[item.id] !== undefined ? checkedItems[item.id] : item.quantity;
                const expectedQty = item.quantity;
                const diff = actualQty - expectedQty;

                if (diff !== 0) {
                    hasChanges = true;
                    
                    // 1. Update Item Quantity in Document
                    await tx.goodsReceiptItem.update({
                        where: { id: item.id },
                        data: { quantity: actualQty }
                    });

                    // 2. Adjust Stock
                    await tx.stock.upsert({
                        where: {
                            productId_warehouseId_vendorName: {
                                productId: item.productId,
                                warehouseId: receipt.warehouseId,
                                vendorName: receipt.receivedFrom
                            }
                        },
                        update: { quantity: { increment: diff } },
                        create: {
                            productId: item.productId,
                            warehouseId: receipt.warehouseId,
                            vendorName: receipt.receivedFrom,
                            quantity: diff
                        }
                    });

                    await tx.stockMovement.create({
                        data: {
                            productId: item.productId,
                            warehouseId: receipt.warehouseId,
                            vendorName: receipt.receivedFrom,
                            quantity: diff,
                            type: "ADJUSTMENT",
                            reference: `${receipt.receiptNumber}-CHECKER`
                        }
                    });

                    // 3. Record Verification log
                    await tx.goodsReceiptVerification.create({
                        data: {
                            receiptId: id,
                            productId: item.productId,
                            expectedQuantity: expectedQty,
                            actualQuantity: actualQty,
                            expectedPrice: item.purchasePrice,
                            actualPrice: item.purchasePrice,
                            verifiedBy: verifiedBy,
                            notes: "Verified via Checker Board (Adjustment Made)"
                        }
                    });

                    // 4. Update Running Subtotal
                    const itemPrice = Number(item.purchasePrice || 0);
                    const itemDiscount = Number(item.discount || 0);
                    const pricePerUnit = itemPrice - itemDiscount;
                    currentSubtotal += (diff * pricePerUnit);
                }
            }
        }

        // Recalculate and update header
        const taxRate = Number(receipt.taxRate || 0);
        const oldTotalDiscount = Number(receipt.totalDiscount || 0);
        // We assume the discount is nominal, so we must be careful. If total qty dropped, we don't automatically drop nominal discount unless it's per-item. 
        // We'll keep the overall manual discount intact.
        const newTaxAmount = Math.round(currentSubtotal * taxRate);
        const newGrandTotal = Math.round(currentSubtotal - oldTotalDiscount + newTaxAmount);

        const oldGrandTotal = Number(receipt.grandTotal || 0);
        const difference = oldGrandTotal - newGrandTotal;

        if (difference !== 0 && receipt.paymentStatus !== "PENDING") {
            // Finance has already recognized the debt, so we must correct the Vendor balance and Accounts
            const vendor = await tx.vendor.findFirst({ where: { name: receipt.receivedFrom } });
            if (vendor) {
                // If new total is less than old total, we decrement the debt.
                await tx.vendor.update({
                    where: { id: vendor.id },
                    data: { balance: { decrement: difference } }
                });
            }

            const invAccount = await tx.financeAccount.findUnique({ where: { code: '104' } }); // Persediaan
            const apAccount = await tx.financeAccount.findUnique({ where: { code: '201' } }); // Hutang
            const taxAccount = await tx.financeAccount.findUnique({ where: { code: '106' } }); // PPN
            
            if (invAccount && apAccount) {
                const subTDiff = Number(receipt.subtotal || 0) - currentSubtotal;
                const taxDiff = Number(receipt.taxAmount || 0) - newTaxAmount;
                
                // Reversing entry (DEBIT Hutang, CREDIT Persediaan & PPN)
                await tx.journalEntry.create({
                    data: {
                        description: `Koreksi Discrepancy Hutang: ${receipt.receiptNumber}`,
                        amount: difference,
                        type: "DEBIT",
                        accountId: apAccount.id,
                        date: new Date()
                    }
                });
                await tx.journalEntry.create({
                    data: {
                        description: `Koreksi Discrepancy Persediaan: ${receipt.receiptNumber}`,
                        amount: subTDiff,
                        type: "CREDIT",
                        accountId: invAccount.id,
                        date: new Date()
                    }
                });
                
                if (taxAccount && taxDiff > 0) {
                    await tx.journalEntry.create({
                        data: {
                            description: `Koreksi Discrepancy PPN: ${receipt.receiptNumber}`,
                            amount: taxDiff,
                            type: "CREDIT",
                            accountId: taxAccount.id,
                            date: new Date()
                        }
                    });
                }
            }
        }

        await tx.goodsReceipt.update({
            where: { id },
            data: {
                isVerified: true,
                verifiedAt: new Date(),
                verifiedBy: verifiedBy,
                subtotal: currentSubtotal,
                taxAmount: newTaxAmount,
                grandTotal: newGrandTotal
            }
        });
        
        revalidatePath("/purchase");
        revalidatePath("/warehouse");
        revalidatePath("/finance");
        revalidatePath("/");

        return { success: true };
    });
}

/**
 * ADMIN: Delete Goods Receipt
 */
export async function deleteGoodsReceiptAction(id: string) {
    return await prisma.$transaction(async (tx: any) => {
        const receipt = await tx.goodsReceipt.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!receipt) throw new Error("Receipt not found");
        
        if (receipt.paymentStatus !== "PENDING") {
            throw new Error("Tidak dapat menghapus transaksi penerimaan yang sudah dicatat oleh Keuangan. Harap gunakan fitur Retur Pembelian.");
        }

        // 1. Reverse Stock
        for (const item of receipt.items) {
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

        await tx.goodsReceiptItem.deleteMany({ where: { receiptId: id } });
        await tx.goodsReceipt.delete({ where: { id } });

        revalidatePath("/purchase");
        revalidatePath("/warehouse");
        revalidatePath("/finance");
        revalidatePath("/");

        return { success: true };
    });
}

/**
 * Sales Delivery Actions (Penjualan)
 */
export async function createSalesDeliveryAction(data: {
    recipient: string;
    buyerName: string;
    warehouseId: string;
    salesPerson?: string;
    totalDiscount?: number;
    taxRate?: number;
    createdAt?: Date;
    items: { productId: string; quantity: number; salesPrice: number; discount?: number; uom?: string; vendorName?: string }[];
}) {
    const txDate = data.createdAt || new Date();
    const day = String(txDate.getDate()).padStart(2, '0');
    const month = String(txDate.getMonth() + 1).padStart(2, '0');
    const year = txDate.getFullYear();
    const dateStr = `${day}${month}${year}`;

    return await prisma.$transaction(async (tx: any) => {
        // --- MOVED INSIDE TRANSACTION ---
        const prefix = `KB-TRN-${dateStr}-`;
        const latest = await tx.salesDelivery.findFirst({
            where: { deliveryNumber: { startsWith: prefix } },
            orderBy: { deliveryNumber: 'desc' }
        });

        let nextNum = 1;
        if (latest) {
            const parts = latest.deliveryNumber.split('-');
            const lastSeq = parseInt(parts[parts.length - 1]);
            if (!isNaN(lastSeq)) nextNum = lastSeq + 1;
        }
        const deliveryNumber = `${prefix}${String(nextNum).padStart(3, '0')}`;

        const session = await getServerSession(authOptions) as any;
        // 1. Create Sales Delivery record (Only known fields)
        const delivery = await tx.salesDelivery.create({
            data: {
                deliveryNumber: deliveryNumber,
                recipient: data.recipient,
                buyerName: data.buyerName,
                warehouseId: data.warehouseId,
                salesPerson: data.salesPerson,
                createdAt: txDate,
                createdById: session?.user?.id,
                items: {
                    create: data.items.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        salesPrice: item.salesPrice as any,
                        uom: item.uom,
                        vendorName: item.vendorName || "UMUM"
                    }))
                }
            },
            include: { items: true }
        });

        // 1.1 Calculate totals
        let grossAmount = 0;
        let totalItemDiscounts = 0;
        data.items.forEach(i => {
            const lineGross = i.quantity * i.salesPrice;
            const lineDiscount = Number(i.discount || 0); // Already nominal from frontend
            grossAmount += lineGross;
            totalItemDiscounts += lineDiscount;
        });

        const subtotal = Math.round(grossAmount - totalItemDiscounts);
        const totalDiscountNominal = Math.round(Number(data.totalDiscount) || 0); // Already nominal from frontend
        const taxRatePercent = Number(data.taxRate) || 0;
        const taxAmount = Math.round((subtotal - totalDiscountNominal) * (taxRatePercent / 100));
        const grandTotal = Math.round(subtotal - totalDiscountNominal + taxAmount);

        // 1.2 Update new fields via raw SQL (Safety for out-of-sync client)
        await tx.$executeRawUnsafe(
            `UPDATE "SalesDelivery" SET "subtotal" = ?, "totalDiscount" = ?, "taxRate" = ?, "taxAmount" = ?, "grandTotal" = ? WHERE id = ?`,
            subtotal, totalDiscountNominal, taxRatePercent, taxAmount, grandTotal, delivery.id
        );

        // 1.3 Update item discounts via raw SQL
        // We match by productId since we just created them in the same transaction
        for (const inputItem of data.items) {
            if (inputItem.discount && inputItem.discount > 0) {
                await tx.$executeRawUnsafe(
                    `UPDATE "SalesDeliveryItem" SET "discount" = ? WHERE "deliveryId" = ? AND "productId" = ?`,
                    inputItem.discount, delivery.id, inputItem.productId
                );
            }
        }

        // 2. Update Stock (Subtract) and Record Movement for each item
        for (const item of data.items) {
            const vendorName = item.vendorName || "UMUM";

            // Check if stock exists and is sufficient
            const currentStock = await tx.stock.findUnique({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: item.productId,
                        warehouseId: data.warehouseId,
                        vendorName: vendorName
                    }
                }
            });

            if (!currentStock || currentStock.quantity < item.quantity) {
                const product = await tx.product.findUnique({ where: { id: item.productId } });
                throw new Error(`Stok tidak mencukupi untuk produk ${product?.name || item.productId} dari vendor ${vendorName}`);
            }

            await tx.stock.update({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: item.productId,
                        warehouseId: data.warehouseId,
                        vendorName: vendorName
                    }
                },
                data: { quantity: { decrement: item.quantity } }
            });

            await tx.stockMovement.create({
                data: {
                    productId: item.productId,
                    warehouseId: data.warehouseId,
                    vendorName: vendorName,
                    quantity: -item.quantity, // Negative for out
                    type: "SALE",
                    reference: deliveryNumber
                }
            });
        }

        // 3. Finance Journals dan Customer Balance tidak ditambahkan di sini.
        // Akan ditambahkan oleh Finance saat verifikasi LUNAS / HUTANG

        revalidatePath("/sales");
        revalidatePath("/warehouse");
        revalidatePath("/finance");
        revalidatePath("/");

        return { success: true, deliveryNumber };
    });
}

export async function updateSalesDeliveryAction(id: string, data: {
    recipient: string;
    buyerName: string;
    warehouseId: string;
    salesPerson?: string;
    totalDiscount?: number;
    taxRate?: number;
    createdAt?: Date;
    items: { productId: string; quantity: number; salesPrice: number; discount?: number; uom?: string; vendorName?: string }[];
}) {
    return await prisma.$transaction(async (tx: any) => {
        const oldDelivery = await tx.salesDelivery.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!oldDelivery) throw new Error("Delivery not found");

        // 1. Reverse Stock for old items
        for (const item of oldDelivery.items) {
            await tx.stock.update({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: item.productId,
                        warehouseId: oldDelivery.warehouseId,
                        vendorName: item.vendorName
                    }
                },
                data: { quantity: { increment: item.quantity } }
            });
        }

        // 2. Clear old items and journal entries
        const oldGrandTotalRaw: any[] = await tx.$queryRawUnsafe(`SELECT "grandTotal" FROM "SalesDelivery" WHERE id = ?`, id);
        const oldGrandTotal = Number(oldGrandTotalRaw[0]?.grandTotal || 0);

        await tx.salesDeliveryItem.deleteMany({ where: { deliveryId: id } });

        // 3. Update Delivery Header (Only known fields)
        const txDate = data.createdAt || new Date();
        await tx.salesDelivery.update({
            where: { id },
            data: {
                recipient: data.recipient,
                buyerName: data.buyerName,
                warehouseId: data.warehouseId,
                salesPerson: data.salesPerson,
                createdAt: txDate
            }
        });

        // 4. Create new items (one by one to get IDs if needed, or just creation)
        for (const item of data.items) {
            const vendorName = item.vendorName || "UMUM";
            await tx.salesDeliveryItem.create({
                data: {
                    deliveryId: id,
                    productId: item.productId,
                    quantity: item.quantity,
                    salesPrice: item.salesPrice as any,
                    uom: item.uom,
                    vendorName: vendorName
                }
            });

            // Update Stock
            await tx.stock.update({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: item.productId,
                        warehouseId: data.warehouseId,
                        vendorName: vendorName
                    }
                },
                data: { quantity: { decrement: item.quantity } }
            });

            await tx.stockMovement.create({
                data: {
                    productId: item.productId,
                    warehouseId: data.warehouseId,
                    vendorName: vendorName,
                    quantity: -item.quantity,
                    type: "SALE_UPDATE",
                    reference: oldDelivery.deliveryNumber
                }
            });
        }

        // 5. Calculate and Update Totals via Raw SQL
        let grossAmount = 0;
        let totalItemDiscounts = 0;
        data.items.forEach(i => {
            const lineGross = i.quantity * i.salesPrice;
            const lineDiscount = Number(i.discount || 0); // Already nominal
            grossAmount += lineGross;
            totalItemDiscounts += lineDiscount;
        });

        const subtotal = Math.round(grossAmount - totalItemDiscounts);
        const totalDiscountNominal = Math.round(Number(data.totalDiscount) || 0); // Already nominal
        const taxRatePercent = Number(data.taxRate) || 0;
        const taxAmount = Math.round((subtotal - totalDiscountNominal) * (taxRatePercent / 100));
        const grandTotal = Math.round(subtotal - totalDiscountNominal + taxAmount);

        await tx.$executeRawUnsafe(
            `UPDATE "SalesDelivery" SET "subtotal" = ?, "totalDiscount" = ?, "taxRate" = ?, "taxAmount" = ?, "grandTotal" = ? WHERE id = ?`,
            subtotal, totalDiscountNominal, taxRatePercent, taxAmount, grandTotal, id
        );

        // Update item discounts
        for (const inputItem of data.items) {
            if (inputItem.discount && inputItem.discount > 0) {
                await tx.$executeRawUnsafe(
                    `UPDATE "SalesDeliveryItem" SET "discount" = ? WHERE "deliveryId" = ? AND "productId" = ?`,
                    inputItem.discount, id, inputItem.productId
                );
            }
        }

        // NO NEW BALANCE/JOURNALS to create (Moved to Finance workflow)

        revalidatePath("/sales");
        revalidatePath("/warehouse");
        revalidatePath("/finance");
        revalidatePath("/");

        return { success: true };
    });
}

/**
 * ADMIN: Delete Sales Delivery
 */
export async function deleteSalesDeliveryAction(id: string) {
    return await prisma.$transaction(async (tx: any) => {
        const delivery = await tx.salesDelivery.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!delivery) throw new Error("Delivery not found");

        // 1. Reverse Stock (Add Back)
        for (const item of delivery.items) {
            await tx.stock.update({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: item.productId,
                        warehouseId: delivery.warehouseId,
                        vendorName: item.vendorName
                    }
                },
                data: { quantity: { increment: item.quantity } }
            });

            await tx.stockMovement.create({
                data: {
                    productId: item.productId,
                    warehouseId: delivery.warehouseId,
                    vendorName: item.vendorName,
                    quantity: item.quantity,
                    type: "SALE_DELETE",
                    reference: delivery.deliveryNumber
                }
            });
        }

        // Customer Balance & Journals are not reversed because they aren't generated by Sales role

        // 3. Delete the Delivery and Items
        await tx.salesDeliveryItem.deleteMany({ where: { deliveryId: id } });
        await tx.salesDelivery.delete({ where: { id } });

        revalidatePath("/sales");
        revalidatePath("/warehouse");
        revalidatePath("/finance");
        revalidatePath("/");

        return { success: true };
    });
}

/**
 * Finance Actions
 */
/**
 * FINANCE: Update Payment Status (Lunas / Belum Lunas)
 * This handles the actual cash flow to Bank BCA (102)
 */
export async function updatePaymentStatusAction(type: "PURCHASE" | "SALE", id: string, status: "PAID" | "CREDIT" | "PENDING" | "PARTIAL", partialAmount?: number, paymentDate?: Date) {
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
                // Initial recognition of debt
                if (invAccount && apAccount) {
                    const subtotal = Math.round(Number(receipt.subtotal || 0));
                    const totalDiscount = Math.round(Number(receipt.totalDiscount || 0));
                    const taxAmount = Math.round(Number(receipt.taxAmount || 0));
                    const finalGrandTotal = Math.round(Number(receipt.grandTotal || 0));

                    const txPaymentDate = paymentDate || new Date();
                    await tx.journalEntry.create({ data: { description: `Persediaan (Hutang): ${reference} (${party})`, amount: subtotal as any, type: "DEBIT", accountId: invAccount.id, date: txPaymentDate } });
                    await tx.journalEntry.create({ data: { description: `Hutang Pembelian: ${reference} (${party})`, amount: finalGrandTotal as any, type: "CREDIT", accountId: apAccount.id, date: txPaymentDate } });

                    if (taxAccount && taxAmount > 0) {
                        await tx.journalEntry.create({ data: { description: `PPN Masukan: ${reference}`, amount: taxAmount as any, type: "DEBIT", accountId: taxAccount.id, date: txPaymentDate } });
                    }
                    if (discAccount && totalDiscount > 0) {
                        await tx.journalEntry.create({ data: { description: `Potongan Pembelian: ${reference}`, amount: totalDiscount as any, type: "CREDIT", accountId: discAccount.id, date: txPaymentDate } });
                    }
                }
                const vendor = await tx.vendor.findFirst({ where: { name: party } });
                if (vendor) {
                    await tx.vendor.update({ where: { id: vendor.id }, data: { balance: { increment: amount } } });
                }

                // If it's a DP (PARTIAL), also record the payment
                if (status === "PARTIAL" && toPay > 0 && apAccount && bankAccount) {
                    const dpDate = paymentDate || new Date();
                    await tx.journalEntry.create({ data: { description: `Pembayaran DP Hutang: ${reference} (${party})`, amount: toPay as any, type: "DEBIT", accountId: apAccount.id, date: dpDate } });
                    await tx.journalEntry.create({ data: { description: `Kas Bank (Keluar DP): ${reference} (${party})`, amount: toPay as any, type: "CREDIT", accountId: bankAccount.id, date: dpDate } });
                    const vendorAgain = await tx.vendor.findFirst({ where: { name: party } });
                    if (vendorAgain) {
                        await tx.vendor.update({ where: { id: vendorAgain.id }, data: { balance: { decrement: toPay } } });
                    }
                }
            } else if (previousStatus === "PENDING" && status === "PAID") {
                // Full immediate payment
                if (invAccount && bankAccount) {
                    const subtotal = Math.round(Number(receipt.subtotal || 0));
                    const totalDiscount = Math.round(Number(receipt.totalDiscount || 0));
                    const taxAmount = Math.round(Number(receipt.taxAmount || 0));
                    const finalGrandTotal = Math.round(Number(receipt.grandTotal || 0));

                    const payDate = paymentDate || new Date();
                    await tx.journalEntry.create({ data: { description: `Persediaan (Lunas Kas): ${reference} (${party})`, amount: subtotal as any, type: "DEBIT", accountId: invAccount.id, date: payDate } });
                    await tx.journalEntry.create({ data: { description: `Pembelian Tunai (Bank): ${reference} (${party})`, amount: finalGrandTotal as any, type: "CREDIT", accountId: bankAccount.id, date: payDate } });

                    if (taxAccount && taxAmount > 0) {
                        await tx.journalEntry.create({ data: { description: `PPN Masukan: ${reference}`, amount: taxAmount as any, type: "DEBIT", accountId: taxAccount.id, date: payDate } });
                    }
                    if (discAccount && totalDiscount > 0) {
                        await tx.journalEntry.create({ data: { description: `Potongan Pembelian: ${reference}`, amount: totalDiscount as any, type: "CREDIT", accountId: discAccount.id, date: payDate } });
                    }
                }
            } else if ((previousStatus === "CREDIT" || previousStatus === "PARTIAL") && (status === "PAID" || status === "PARTIAL")) {
                // Payment against existing debt (installments)
                if (apAccount && bankAccount && toPay > 0) {
                    const activePayDate = paymentDate || new Date();
                    await tx.journalEntry.create({ data: { description: `Pembayaran ${status === "PARTIAL" ? "DP/Sebagian" : "Pelunasan"} Hutang: ${reference} (${party})`, amount: toPay as any, type: "DEBIT", accountId: apAccount.id, date: activePayDate } });
                    await tx.journalEntry.create({ data: { description: `Kas Bank (Keluar): ${reference} (${party})`, amount: toPay as any, type: "CREDIT", accountId: bankAccount.id, date: activePayDate } });
                }
                const vendor = await tx.vendor.findFirst({ where: { name: party } });
                if (vendor && toPay > 0) {
                    await tx.vendor.update({ where: { id: vendor.id }, data: { balance: { decrement: toPay } } });
                }
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

            const deliveryRaw: any[] = await tx.$queryRawUnsafe(`SELECT "grandTotal", "taxAmount", "totalDiscount", "paidAmount" FROM "SalesDelivery" WHERE id = ?`, id);
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
                const lineGross = i.quantity * Number(i.salesPrice);
                // Correcting discount calculation to be nominal (the UI sends nominal discount values)
                totalItemDiscounts += Math.round(Number(i.discount) || 0);
            });
            const totalAllDiscounts = Math.round(totalItemDiscounts + totalDiscountNominal);

            if (previousStatus === "PENDING" && (status === "CREDIT" || status === "PARTIAL")) {
                if (arAccount && salesAccount) {
                    const txRecogDate = paymentDate || new Date();
                    await tx.journalEntry.create({ data: { description: `Piutang Penjualan: ${reference} (${party})`, amount: amount as any, type: "DEBIT", accountId: arAccount.id, date: txRecogDate } });
                    await tx.journalEntry.create({ data: { description: `Pendapatan Penjualan: ${reference}`, amount: grossAmount as any, type: "CREDIT", accountId: salesAccount.id, date: txRecogDate } });

                    if (discountAccount && totalAllDiscounts > 0) {
                        await tx.journalEntry.create({ data: { description: `Potongan Penjualan: ${reference}`, amount: totalAllDiscounts as any, type: "DEBIT", accountId: discountAccount.id, date: txRecogDate } });
                    }
                    if (taxAccountRef && taxAmountValue > 0) {
                        await tx.journalEntry.create({ data: { description: `PPN Keluaran: ${reference}`, amount: taxAmountValue as any, type: "CREDIT", accountId: taxAccountRef.id, date: txRecogDate } });
                    }
                }
                const customer = await tx.customer.findFirst({ where: { name: party } });
                if (customer) {
                    await tx.customer.update({ where: { id: customer.id }, data: { balance: { increment: amount } } });
                }

                // If it's a DP (PARTIAL), also record the receipt
                if (status === "PARTIAL" && toReceive > 0 && arAccount && bankAccount) {
                    const dpRecDate = paymentDate || new Date();
                    await tx.journalEntry.create({ data: { description: `Kas Bank (Terima DP): ${reference} (${party})`, amount: toReceive as any, type: "DEBIT", accountId: bankAccount.id, date: dpRecDate } });
                    await tx.journalEntry.create({ data: { description: `Penyelesaian Piutang (DP): ${reference} (${party})`, amount: toReceive as any, type: "CREDIT", accountId: arAccount.id, date: dpRecDate } });
                    const customerAgain = await tx.customer.findFirst({ where: { name: party } });
                    if (customerAgain) {
                        await tx.customer.update({ where: { id: customerAgain.id }, data: { balance: { decrement: toReceive } } });
                    }
                }
            } else if (previousStatus === "PENDING" && status === "PAID") {
                if (bankAccount && salesAccount) {
                    const fullRecDate = paymentDate || new Date();
                    await tx.journalEntry.create({ data: { description: `Kas Bank (Penjualan Tunai): ${reference} (${party})`, amount: amount as any, type: "DEBIT", accountId: bankAccount.id, date: fullRecDate } });
                    await tx.journalEntry.create({ data: { description: `Pendapatan Penjualan: ${reference}`, amount: grossAmount as any, type: "CREDIT", accountId: salesAccount.id, date: fullRecDate } });

                    if (discountAccount && totalAllDiscounts > 0) {
                        await tx.journalEntry.create({ data: { description: `Potongan Penjualan: ${reference}`, amount: totalAllDiscounts as any, type: "DEBIT", accountId: discountAccount.id, date: fullRecDate } });
                    }
                    if (taxAccountRef && taxAmountValue > 0) {
                        await tx.journalEntry.create({ data: { description: `PPN Keluaran: ${reference}`, amount: taxAmountValue as any, type: "CREDIT", accountId: taxAccountRef.id, date: fullRecDate } });
                    }
                }
            } else if ((previousStatus === "CREDIT" || previousStatus === "PARTIAL") && (status === "PAID" || status === "PARTIAL")) {
                if (bankAccount && arAccount && toReceive > 0) {
                    const instRecDate = paymentDate || new Date();
                    await tx.journalEntry.create({ data: { description: `Penerimaan ${status === "PARTIAL" ? "DP/Sebagian" : "Pelunasan"} Piutang: ${reference} (${party})`, amount: toReceive as any, type: "DEBIT", accountId: bankAccount.id, date: instRecDate } });
                    await tx.journalEntry.create({ data: { description: `Penyelesaian Piutang: ${reference} (${party})`, amount: toReceive as any, type: "CREDIT", accountId: arAccount.id, date: instRecDate } });
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
    accountId: string; // The category/target account (e.g., Expense or Income account)
    bankAccountId?: string; // Optional specific bank account from COA
    salesPerson?: string; // Added for sales context
}) {
    return await prisma.$transaction(async (tx: any) => {
        // 1. Create the Transaction record
        // Use current time if the date is today to maintain chronological order
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
                salesPerson: data.salesPerson // Included directly
            }
        });

        // 2. Create Journal Entries (Double Entry)
        // For simplicity, we assume 'accountId' is the "Other" side of the bank transaction.
        // We'll also need a "Bank Account" in the COA.
        // If bankAccountId is not provided, we might need a default Bank Asset account.

        const isPayment = data.transactionType === "PAYMENT";
        const isMutation = data.transactionType === "MUTATION";

        let typeTargetAccount = isPayment ? "DEBIT" : "CREDIT";
        let typeBankAccount = isPayment ? "CREDIT" : "DEBIT";

        if (isMutation) {
            typeTargetAccount = "DEBIT"; // Target bank receives money (Asset Debit)
            typeBankAccount = "CREDIT";  // Source bank sends money (Asset Credit)
        }

        // Entry for target account (Expense, Income, or Target Bank if Mutation)
        await tx.journalEntry.create({
            data: {
                description: data.description,
                amount: data.amount as any,
                type: typeTargetAccount as any,
                accountId: data.accountId,
                transactionId: transaction.id,
                date: data.date
            }
        });

        // Entry for bank account
        if (data.bankAccountId) {
            await tx.journalEntry.create({
                data: {
                    description: `${data.transactionType}: ${data.bank} - ${data.referenceNumber || ''}`,
                    amount: data.amount as any,
                    type: typeBankAccount as any,
                    accountId: data.bankAccountId,
                    transactionId: transaction.id,
                    date: txDate
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

    const [journals, accounts] = await Promise.all([
        prisma.journalEntry.findMany({
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
    return await prisma.financeTransaction.findMany({
        orderBy: { date: 'desc' },
        take: 200 // Show more for history
    });
}

/**
 * ADMIN: Delete Finance Transaction
 */
export async function deleteFinanceTransactionAction(id: string) {
    return await prisma.$transaction(async (tx: any) => {
        // 1. Delete Journal Entries first
        await tx.journalEntry.deleteMany({
            where: { transactionId: id }
        });

        // 2. Delete the Transaction
        await tx.financeTransaction.delete({
            where: { id }
        });

        revalidatePath("/finance");
        revalidatePath("/");

        return { success: true };
    });
}

/**
 * ADMIN: Delete Journal Entry (Manual)
 */
export async function deleteJournalEntryAction(id: string) {
    await prisma.journalEntry.delete({
        where: { id }
    });

    revalidatePath("/finance");
    revalidatePath("/");

    return { success: true };
}

/**
 * Purchase Order Actions
 */
export async function createPurchaseOrderAction(data: {
    number: string;
    vendorId: string;
    items: { productId: string; quantity: number; price: number }[];
}) {
    const res = await (prisma as any).purchaseOrder.create({
        data: {
            number: data.number,
            vendorId: data.vendorId,
            items: {
                create: data.items.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price as any
                }))
            }
        }
    });

    revalidatePath("/purchase");
    return res;
}


export async function createJournalEntryAction(data: {
    description: string;
    amount: number;
    type: "DEBIT" | "CREDIT";
    accountId: string;
}) {
    await prisma.journalEntry.create({
        data: {
            description: data.description,
            amount: data.amount as any,
            type: data.type,
            accountId: data.accountId,
        }
    });

    revalidatePath("/finance");
    revalidatePath("/");
}

/**
 * Warehouse Stock Adjustment
 */
export async function updateStockAction(data: {
    productId: string;
    warehouseId: string;
    quantity: number;
    vendorName?: string;
    type: "ADJUSTMENT" | "SALE" | "GOODS_RECEIPT";
    reference?: string;
}) {
    await prisma.$transaction(async (tx: any) => {
        const vendorName = data.vendorName || "UMUM";
        await tx.stock.upsert({
            where: {
                productId_warehouseId_vendorName: {
                    productId: data.productId,
                    warehouseId: data.warehouseId,
                    vendorName: vendorName
                }
            },
            update: { quantity: { increment: data.quantity } },
            create: {
                productId: data.productId,
                warehouseId: data.warehouseId,
                vendorName: vendorName,
                quantity: data.quantity
            }
        });

        await tx.stockMovement.create({
            data: {
                productId: data.productId,
                warehouseId: data.warehouseId,
                vendorName: vendorName,
                quantity: data.quantity,
                type: data.type,
                reference: data.reference
            }
        });
    });

    revalidatePath("/warehouse");
    revalidatePath("/");
}

/**
 * Admin: Database Management
 */
export async function wipeDatabaseAction() {
    return await prisma.$transaction(async (tx: any) => {
        // Delete transactional data but keep Master Data (Products, Warehouses, COA, Partners, Users)
        // Order matters due to foreign key constraints (Delete children before parents)

        // 1. Notifications
        await tx.notificationRead.deleteMany();
        await tx.notification.deleteMany();

        // 2. Finance
        await tx.journalEntry.deleteMany();
        await tx.financeTransaction.deleteMany();

        // 3. Purchases & Returns
        await tx.purchaseReturnItem.deleteMany();
        await tx.purchaseReturn.deleteMany();
        await tx.goodsReceiptVerification.deleteMany();
        await tx.goodsReceiptItem.deleteMany();
        await tx.goodsReceipt.deleteMany();

        // 4. Sales & Returns
        await tx.salesReturnItem.deleteMany();
        await tx.salesReturn.deleteMany();
        await tx.salesDeliveryItem.deleteMany();
        await tx.salesDelivery.deleteMany();

        // 5. Orders & Requests
        await tx.purchaseOrderItem.deleteMany();
        await tx.purchaseOrder.deleteMany();
        await tx.purchaseRequestItem.deleteMany();
        await tx.purchaseRequest.deleteMany();

        // 6. Inventory
        await tx.stockMovement.deleteMany();
        await tx.stock.deleteMany();

        // Reset Partner Balances (Hutang/Piutang) to 0
        await tx.vendor.updateMany({ data: { balance: 0 } });
        await tx.customer.updateMany({ data: { balance: 0 } });

        revalidatePath("/");
        revalidatePath("/finance");
        revalidatePath("/purchase");
        revalidatePath("/sales");
        revalidatePath("/warehouse");

        return { success: true };
    });
}

export async function importProductsAction(products: {
    sku: string;
    name: string;
    category?: string;
    unit?: string;
    barcode?: string;
    purchasePrice?: number;
    salesPrice?: number;
    lowStockThreshold?: number;
}[]) {
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
        revalidatePath("/");

        return { success: true, count: results.length };
    });
}

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

    console.log("Updating Product:", id, data);

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

/**
 * Settings & System Actions
 */
/**
 * ADMIN: Delete Product

 */
export async function deleteProductAction(id: string) {
    // Check if product is in use (to avoid DB errors or orphan records)
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
        throw new Error("Produk tidak bisa dihapus karena sudah memiliki riwayat transaksi (Pembelian, Penjualan, atau Retur).");
    }

    await prisma.$transaction([
        prisma.stock.deleteMany({ where: { productId: id } }),
        prisma.stockMovement.deleteMany({ where: { productId: id } }),
        prisma.product.delete({ where: { id } })
    ]);

    revalidatePath("/warehouse");
    revalidatePath("/purchase");
    revalidatePath("/sales");
    revalidatePath("/");

    return { success: true };
}

export async function getSystemSettingsAction() {
    let settings;
    try {
        settings = await (prisma as any).systemSetting.findUnique({
            where: { id: "global" }
        });
    } catch (e) {
        // Fallback for when prisma client is not generated with the new model
        const results = await prisma.$queryRaw<any[]>`SELECT * FROM SystemSetting WHERE id = 'global' LIMIT 1`;
        if (results && results.length > 0) {
            settings = {
                id: results[0].id,
                companyName: results[0].companyName,
                address: results[0].address,
                taxId: results[0].taxId,
                website: results[0].website
            };
        }
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
            address: "Jl. Arjuna IV Green Kartika Residence Blok EE NO.2, CIBINONG, KAB. BOGOR - JAWA BARAT, 16911",
            taxId: "01.234.567.8-012.000",
            website: "www.kolaborasi.id"
        },
        counts: {
            product: productCount,
            vendor: vendorCount,
            customer: customerCount,
            warehouse: warehouseCount
        }
    };
}

export async function updateSystemSettingsAction(data: {
    companyName: string;
    address: string;
    taxId: string;
    website: string;
}) {
    try {
        await (prisma as any).systemSetting.upsert({
            where: { id: "global" },
            update: data,
            create: {
                id: "global",
                ...data
            }
        });
    } catch (e) {
        // Raw SQL fallback for SQLite
        await prisma.$executeRaw`
            INSERT INTO SystemSetting (id, companyName, address, taxId, website, updatedAt)
            VALUES ('global', ${data.companyName}, ${data.address}, ${data.taxId}, ${data.website}, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                companyName = excluded.companyName,
                address = excluded.address,
                taxId = excluded.taxId,
                website = excluded.website,
                updatedAt = CURRENT_TIMESTAMP
        `;
    }

    revalidatePath("/settings");
    revalidatePath("/");

    return { success: true };
}

/**
 * ADMIN: Finance Opening Balance (Saldo Awal)
 */
export async function setOpeningBalanceAction(data: { accountId: string; amount: number; date?: Date }) {
    return await prisma.$transaction(async (tx: any) => {
        const account = await tx.financeAccount.findUnique({ where: { id: data.accountId } });
        if (!account) throw new Error("Akun tidak ditemukan.");

        // Create a special opening balance record
        await tx.journalEntry.create({
            data: {
                description: `Saldo Awal: ${account.name}`,
                amount: data.amount as any,
                type: account.type === "ASSET" ? "DEBIT" : "CREDIT",
                accountId: data.accountId,
                date: data.date || new Date(new Date().getFullYear(), 0, 1), // Default to start of year
            }
        });

        revalidatePath("/finance");
        revalidatePath("/");

        return { success: true };
    });
}

/**
 * ADMIN: Master Data Actions
 */
export async function createVendorAction(data: { name: string; email?: string; phone?: string; address?: string }) {
    const session = await getServerSession(authOptions) as any;
    if (!["ADMIN", "PURCHASE", "SALES"].includes(session?.user?.role)) throw new Error("Hanya Admin/Purchase/Sales yang bisa menambah vendor.");

    try {
        await prisma.vendor.create({
            data: {
                name: data.name,
                email: data.email || null,
                phone: data.phone || null,
                address: data.address || null,
            }
        });
        revalidatePath("/settings");
        revalidatePath("/warehouse");
        return { success: true };
    } catch (error: any) {
        if (error.code === 'P2002') throw new Error("ID/Code Vendor atau Email sudah terdaftar.");
        throw error;
    }
}

export async function updateVendorAction(id: string, data: { name: string; email?: string; phone?: string; address?: string }) {
    const session = await getServerSession(authOptions) as any;
    if (!["ADMIN", "PURCHASE", "SALES"].includes(session?.user?.role)) throw new Error("Hanya Admin/Purchase/Sales yang bisa mengubah vendor.");

    console.log("Updating Vendor:", id, data);

    try {
        await prisma.vendor.update({
            where: { id },
            data: {
                name: data.name,
                email: data.email || null,
                phone: data.phone || null,
                address: data.address || null,
            }
        });
        revalidatePath("/settings");
        revalidatePath("/warehouse");
        return { success: true };
    } catch (error: any) {
        if (error.code === 'P2002') throw new Error("ID/Code Vendor atau Email sudah terdaftar.");
        throw error;
    }
}

export async function deleteVendorAction(id: string) {
    const vendor = await prisma.vendor.findUnique({
        where: { id },
        include: {
            _count: {
                select: {
                    purchaseOrders: true
                }
            }
        }
    });

    if (vendor?._count.purchaseOrders || (vendor?.balance && Number(vendor.balance) !== 0)) {
        throw new Error("Vendor tidak bisa dihapus karena memiliki riwayat transaksi atau saldo.");
    }

    await prisma.vendor.delete({ where: { id } });
    revalidatePath("/settings");
    revalidatePath("/purchase");
    return { success: true };
}

export async function createCustomerAction(data: { name: string; email?: string; phone?: string; address?: string }) {
    const session = await getServerSession(authOptions) as any;
    if (!["ADMIN", "PURCHASE", "SALES"].includes(session?.user?.role)) throw new Error("Hanya Admin/Purchase/Sales yang bisa menambah customer.");

    try {
        await prisma.customer.create({
            data: {
                name: data.name,
                email: data.email || null,
                phone: data.phone || null,
                address: data.address || null,
            }
        });
        revalidatePath("/settings");
        revalidatePath("/warehouse");
        return { success: true };
    } catch (error: any) {
        if (error.code === 'P2002') throw new Error("ID/Code Customer atau Email sudah terdaftar.");
        throw error;
    }
}

export async function updateCustomerAction(id: string, data: { name: string; email?: string; phone?: string; address?: string }) {
    const session = await getServerSession(authOptions) as any;
    if (!["ADMIN", "PURCHASE", "SALES"].includes(session?.user?.role)) throw new Error("Hanya Admin/Purchase/Sales yang bisa mengubah customer.");

    console.log("Updating Customer:", id, data);

    try {
        await prisma.customer.update({
            where: { id },
            data: {
                name: data.name,
                email: data.email || null,
                phone: data.phone || null,
                address: data.address || null,
            }
        });
        revalidatePath("/settings");
        revalidatePath("/warehouse");
        return { success: true };
    } catch (error: any) {
        if (error.code === 'P2002') throw new Error("ID/Code Customer atau Email sudah terdaftar.");
        throw error;
    }
}

export async function deleteCustomerAction(id: string) {
    const customer = await prisma.customer.findUnique({ where: { id } });

    // Check for balance or if used in SalesDelivery (via buyerName)
    const usageCount = await prisma.salesDelivery.count({
        where: { buyerName: customer?.name }
    });

    if (usageCount > 0 || (customer?.balance && Number(customer.balance) !== 0)) {
        throw new Error("Customer tidak bisa dihapus karena memiliki riwayat transaksi atau saldo.");
    }

    await prisma.customer.delete({ where: { id } });
    revalidatePath("/settings");
    revalidatePath("/sales");
    return { success: true };
}

export async function createWarehouseAction(data: { name: string; location: string }) {
    const session = await getServerSession(authOptions) as any;
    if (session?.user?.role !== "ADMIN") throw new Error("Hanya Admin yang bisa menambah gudang.");

    try {
        await prisma.warehouse.create({
            data: {
                name: data.name,
                location: data.location || "",
            }
        });
        revalidatePath("/settings");
        revalidatePath("/warehouse");
        return { success: true };
    } catch (error: any) {
        if (error.code === 'P2002') throw new Error("Nama Gudang sudah terdaftar.");
        throw error;
    }
}

export async function updateWarehouseAction(id: string, data: { name: string; location: string }) {
    const session = await getServerSession(authOptions) as any;
    if (session?.user?.role !== "ADMIN") throw new Error("Hanya Admin yang bisa mengubah gudang.");

    console.log("Updating Warehouse:", id, data);

    try {
        await prisma.warehouse.update({
            where: { id },
            data: {
                name: data.name,
                location: data.location || "",
            }
        });
        revalidatePath("/settings");
        revalidatePath("/warehouse");
        return { success: true };
    } catch (error: any) {
        if (error.code === 'P2002') throw new Error("Nama Gudang sudah terdaftar.");
        throw error;
    }
}

export async function deleteWarehouseAction(id: string) {
    const stocks = await prisma.stock.count({ where: { warehouseId: id } });
    if (stocks > 0) throw new Error("Gudang tidak bisa dihapus karena masih ada stok yang tercatat.");

    const usageCount = await Promise.all([
        prisma.goodsReceipt.count({ where: { warehouseId: id } }),
        prisma.salesDelivery.count({ where: { warehouseId: id } }),
        prisma.stockMovement.count({ where: { warehouseId: id } })
    ]);

    if (usageCount.some(c => c > 0)) {
        throw new Error("Gudang tidak bisa dihapus karena memiliki riwayat transaksi (Penerimaan/Pengiriman/Pergerakan Stok).");
    }

    await prisma.warehouse.delete({ where: { id } });
    revalidatePath("/settings");
    revalidatePath("/warehouse");
    return { success: true };
}

/**
 * DASHBOARD & ANALYTICS: Summary Stats
 */
export async function getDashboardSummaryAction() {
    // 1. Calculations via Aggregations (Lighter & Faster)
    const [
        inventoryTotals,
        cashBankAgg,
        debtAgg,
        receivableAgg,
        revenueAgg,
        purchaseAgg,
        expenseAgg
    ] = await Promise.all([
        // Asset Value (Group stocks)
        prisma.stock.findMany({
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
        // Cash & Bank (Codes 101, 102)
        prisma.journalEntry.groupBy({
            by: ['type'],
            where: {
                account: { OR: [{ code: { startsWith: '101' } }, { code: { startsWith: '102' } }] }
            },
            _sum: { amount: true }
        }),
        // Total Hutang (201)
        prisma.journalEntry.groupBy({
            by: ['type'],
            where: { account: { code: '201' } },
            _sum: { amount: true }
        }),
        // Total Piutang (105)
        prisma.journalEntry.groupBy({
            by: ['type'],
            where: { account: { code: '105' } },
            _sum: { amount: true }
        }),
        // Revenue (ALL SalesDelivery)
        prisma.salesDelivery.aggregate({
            _sum: { subtotal: true, totalDiscount: true }
        }),
        // Purchase Cost (Verified GoodsReceipt)
        prisma.goodsReceipt.aggregate({
            where: { isVerified: true },
            _sum: { subtotal: true }
        }),
        // Operational Expenses (Code 6%) - Simplified grouping
        prisma.financeTransaction.aggregate({
            where: { 
                journals: { some: { account: { code: { startsWith: '6' } } } }
            },
            _sum: { amount: true }
        })
    ]);

    // 2. Process Aggregated Data
    let assetValue = 0;
    let totalStockQty = 0;
    const productStocks: Record<string, { qty: number, threshold: number }> = {};

    inventoryTotals.forEach(s => {
        const latestPrice = Number(s.product.receiptItems[0]?.purchasePrice || 0);
        assetValue += s.quantity * latestPrice;
        totalStockQty += s.quantity;
        if (!productStocks[s.product.id]) {
            productStocks[s.product.id] = { qty: 0, threshold: s.product.lowStockThreshold || 10 };
        }
        productStocks[s.product.id].qty += s.quantity;
    });

    const lowStockCount = Object.values(productStocks).filter(p => p.qty < p.threshold).length;

    const getSum = (agg: any[], type: "DEBIT" | "CREDIT") => 
        Number(agg.find(a => a.type === type)?._sum?.amount || 0);

    const cashBalance = getSum(cashBankAgg, "DEBIT") - getSum(cashBankAgg, "CREDIT");
    const totalHutang = getSum(debtAgg, "CREDIT") - getSum(debtAgg, "DEBIT");
    const totalPiutang = getSum(receivableAgg, "DEBIT") - getSum(receivableAgg, "CREDIT");

    const totalRevenue = Number(revenueAgg._sum.subtotal || 0) - Number(revenueAgg._sum.totalDiscount || 0);
    const totalPurchaseCost = Number(purchaseAgg._sum.subtotal || 0);
    const totalOperationalExpenses = Number(expenseAgg._sum.amount || 0);

    // 3. Person-Based Logic
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [deliveries, receipts, expenses, countRequests, countDeliveries, purchaseVolRes] = await Promise.all([
        prisma.salesDelivery.findMany({ select: { subtotal: true, totalDiscount: true, salesPerson: true } }),
        prisma.goodsReceipt.findMany({
            where: { isVerified: true },
            select: { subtotal: true, salesPerson: true }
        }),
        prisma.financeTransaction.findMany({
            where: { journals: { some: { account: { code: { startsWith: '6' } } } } },
            select: { amount: true, transactionType: true, salesPerson: true }
        }),
        prisma.purchaseRequest.count({ where: { createdAt: { gte: todayStart } } }),
        prisma.salesDelivery.count({ where: { createdAt: { gte: todayStart } } }),
        prisma.goodsReceiptItem.aggregate({
            _sum: { quantity: true },
            where: { receipt: { createdAt: { gte: todayStart } } }
        })
    ]);

    const activeOrdersToday = countRequests + countDeliveries;
    const purchaseVol = Number(purchaseVolRes._sum?.quantity || 0);

    let revenueBC = 0, revenuePF = 0;
    deliveries.forEach(d => {
        const net = Number(d.subtotal || 0) - Number(d.totalDiscount || 0);
        if (d.salesPerson === 'BC') revenueBC += net;
        else if (d.salesPerson === 'PF') revenuePF += net;
    });

    let purchaseBC = 0, purchasePF = 0;
    receipts.forEach(r => {
        const cost = Number(r.subtotal || 0);
        if (r.salesPerson === 'BC') purchaseBC += cost;
        else if (r.salesPerson === 'PF') purchasePF += cost;
    });

    let expBC = 0, expPF = 0;
    expenses.forEach(t => {
        const amt = (t.transactionType === "PAYMENT") ? Number(t.amount) : -Number(t.amount);
        if (t.salesPerson === 'BC') expBC += amt;
        else if (t.salesPerson === 'PF') expPF += amt;
    });

    const nettMarginSales = (totalRevenue - totalPurchaseCost) - totalOperationalExpenses;
    const nettMarginBC = (revenueBC - purchaseBC) - expBC;
    const nettMarginPF = (revenuePF - purchasePF) - expPF;

    const summary = {
        totalRevenue: Number(totalRevenue || 0),
        assetValue: Number(assetValue || 0),
        cashBalance: Number(cashBalance || 0),
        totalHutang: Number(totalHutang || 0),
        totalPiutang: Number(totalPiutang || 0),
        nettMarginSales: Number(nettMarginSales || 0),
        nettMarginBC: Number(nettMarginBC || 0),
        nettMarginPF: Number(nettMarginPF || 0),
        productCount: inventoryTotals?.length || 0,
        lowStockCount: Number(lowStockCount || 0),
        activeOrdersToday: Number(activeOrdersToday || 0),
        purchaseVol: Number(purchaseVol || 0),
        weeklyStats: await getWeeklyStats()
    };


    console.log("Dashboard Summary successfully generated");
    return JSON.parse(JSON.stringify(summary));
}

async function getWeeklyStats() {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        last7Days.push(d);
    }

    const sales = await prisma.salesDelivery.findMany({
        where: { date: { gte: last7Days[0] } },
        select: { date: true, grandTotal: true }
    });

    const purchases = await prisma.goodsReceipt.findMany({
        where: { date: { gte: last7Days[0] } },
        select: { date: true, subtotal: true }
    });

    return last7Days.map(date => {
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        const daySales = sales
            .filter((s: any) => s.date >= date && s.date < nextDay)
            .reduce((sum: number, s: any) => sum + Number(s.grandTotal || 0), 0);

        const dayPurchases = purchases
            .filter(p => p.date && p.date >= date && p.date < nextDay)
            .reduce((sum: number, r) => sum + Number(r.subtotal || 0), 0);

        return {
            name: date.toLocaleDateString('en-US', { weekday: 'short' }),
            sales: daySales,
            purchases: dayPurchases
        };
    });
}

/**
 * WAREHOUSE CHECKER: Fetch Pending Verifications
 */
export async function getUnverifiedReceiptsAction() {
    const rawUnverified: any[] = await prisma.$queryRaw`SELECT id FROM GoodsReceipt WHERE isVerified = 0 ORDER BY createdAt DESC`;
    const ids = rawUnverified.map(r => r.id);

    if (ids.length === 0) return [];

    return await prisma.goodsReceipt.findMany({
        where: { id: { in: ids } },
        include: {
            items: { include: { product: true } },
            warehouse: true
        }
    });
}

/**
 * SETTINGS: Fetch All Master Data for management
 */
export async function getMDAction() {
    const [vendors, customers, warehouses, coa, products] = await Promise.all([
        prisma.vendor.findMany({ orderBy: { name: 'asc' } }),
        prisma.customer.findMany({ orderBy: { name: 'asc' } }),
        prisma.warehouse.findMany({ orderBy: { name: 'asc' } }),
        prisma.financeAccount.findMany({ orderBy: { code: 'asc' } }),
        prisma.product.findMany({ orderBy: { name: 'asc' } }),
    ]);

    // Serialize balances for client components
    const serializedVendors = (vendors || []).map((v: any) => ({
        ...v,
        balance: Number(v.balance)
    }));

    const serializedCustomers = (customers || []).map((c: any) => ({
        ...c,
        balance: Number(c.balance)
    }));

    return {
        vendors: serializedVendors,
        customers: serializedCustomers,
        warehouses: warehouses || [],
        coa: coa || [],
        products: products || []
    };
}

/**
 * WAREHOUSE CHECKER: Submit physical verification results
 */
export async function submitGoodsReceiptVerificationAction(data: {
    receiptId: string;
    verifiedBy: string;
    items: {
        productId: string;
        expectedQuantity: number;
        actualQuantity: number;
        expectedPrice: number;
        actualPrice: number;
        notes?: string;
    }[];
}) {
    return await prisma.$transaction(async (tx: any) => {
        const receipt = await tx.goodsReceipt.findUnique({ where: { id: data.receiptId } });
        if (!receipt) throw new Error("Receipt not found");

        // Create verification records and adjust stock for discrepancies
        for (const item of data.items) {
            await tx.goodsReceiptVerification.create({
                data: {
                    receiptId: data.receiptId,
                    productId: item.productId,
                    expectedQuantity: item.expectedQuantity,
                    actualQuantity: item.actualQuantity,
                    expectedPrice: item.expectedPrice as any,
                    actualPrice: item.actualPrice as any,
                    notes: item.notes,
                    verifiedBy: data.verifiedBy
                }
            });

            const diff = item.actualQuantity - item.expectedQuantity;
            if (diff !== 0) {
                // Adjust Stock
                await tx.stock.upsert({
                    where: {
                        productId_warehouseId_vendorName: {
                            productId: item.productId,
                            warehouseId: receipt.warehouseId,
                            vendorName: receipt.receivedFrom
                        }
                    },
                    update: { quantity: { increment: diff } },
                    create: {
                        productId: item.productId,
                        warehouseId: receipt.warehouseId,
                        vendorName: receipt.receivedFrom,
                        quantity: diff
                    }
                });

                // Record Adjustment Movement
                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        warehouseId: receipt.warehouseId,
                        vendorName: receipt.receivedFrom,
                        quantity: diff,
                        type: "ADJUSTMENT",
                        reference: `${receipt.receiptNumber}-VERIFY`
                    }
                });
            }
        }

        const allMatch = data.items.every(
            (item: any) => item.expectedQuantity === item.actualQuantity &&
                Number(item.expectedPrice) === Number(item.actualPrice)
        );

        // Mark as verified regardless of perfect match, because discrepancies are adjusted above
        await tx.goodsReceipt.update({
            where: { id: data.receiptId },
            data: {
                isVerified: true,
                verifiedAt: new Date(),
                verifiedBy: data.verifiedBy
            }
        });

        revalidatePath("/warehouse");
        revalidatePath("/purchase");

        return { success: true, allMatch };
    });
}

/**
 * WAREHOUSE CHECKER: Get all receipts for verification list
 */
export async function getGoodsReceiptsAction() {
    return await prisma.goodsReceipt.findMany({
        include: {
            items: {
                include: {
                    product: true
                }
            },
            warehouse: true
        },
        orderBy: { createdAt: 'desc' }
    });
}

/**
 * PR DASHBOARD: Get PR-specific statistics
 */
export async function getPurchaseRequestSummaryAction() {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user?.id) throw new Error("Unauthorized");

    const allRequests = await prisma.purchaseRequest.findMany({
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
 * CORTEX EXPORT: Get All Sales data encoded in XML
 */

export async function getCortexXmlContentAction() {
    const allSales = await (prisma.salesDelivery as any).findMany({
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' }
    });

    return generateCortexXml(allSales);
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

        const ret = await tx.purchaseReturn.create({
            data: {
                returnNumber,
                receiptId: data.receiptId,
                notes: data.notes,
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
            await tx.journalEntry.create({ data: { description: `Retur Pembelian: ${ret.returnNumber}`, amount: totalValue as any, type: "DEBIT", accountId: apAccount.id, date: new Date() } });
            await tx.journalEntry.create({ data: { description: `Persediaan Keluar (Retur): ${ret.returnNumber}`, amount: totalValue as any, type: "CREDIT", accountId: invAccount.id, date: new Date() } });
        }

        revalidatePath("/finance");
        revalidatePath("/");
        return { success: true };
    });
}

/**
 * SALES RETURN: Create Return Request
 */
export async function createSalesReturnAction(data: {
    deliveryId: string;
    items: { productId: string; quantity: number; reason: string; deliveryItemId?: string }[];
    notes?: string;
}) {
    return await prisma.$transaction(async (tx: any) => {
        const today = new Date();
        const dateStr = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
        const prefix = `SRET-${dateStr}-`;
        const latest = await tx.salesReturn.findFirst({
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

        const ret = await tx.salesReturn.create({
            data: {
                returnNumber,
                deliveryId: data.deliveryId,
                notes: data.notes,
                items: {
                    create: data.items.map(i => ({
                        productId: i.productId,
                        deliveryItemId: i.deliveryItemId,
                        quantity: i.quantity,
                        reason: i.reason
                    }))
                }
            }
        });

        // Update Stock (Increment because goods come back)
        const delivery = await tx.salesDelivery.findUnique({
            where: { id: data.deliveryId },
            include: { items: true }
        });

        if (delivery) {
            for (const item of data.items) {
                // Find vendorName from the original delivery item
                const originalItem = delivery.items.find((di: any) => di.productId === item.productId);
                const vendorName = originalItem?.vendorName || "UMUM";

                await tx.stock.upsert({
                    where: {
                        productId_warehouseId_vendorName: {
                            productId: item.productId,
                            warehouseId: delivery.warehouseId,
                            vendorName: vendorName
                        }
                    },
                    update: { quantity: { increment: item.quantity } },
                    create: {
                        productId: item.productId,
                        warehouseId: delivery.warehouseId,
                        vendorName: vendorName,
                        quantity: item.quantity
                    }
                });

                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        warehouseId: delivery.warehouseId,
                        vendorName: vendorName,
                        quantity: item.quantity,
                        type: "ADJUSTMENT",
                        reference: returnNumber
                    }
                });
            }
        }

        revalidatePath("/sales");
        revalidatePath("/finance");
        revalidatePath("/warehouse");
        return ret;
    });
}

/**
 * SALES RETURN: Verify Return by Finance
 */
export async function verifySalesReturnAction(id: string) {
    return await prisma.$transaction(async (tx: any) => {
        const ret = await tx.salesReturn.findUnique({
            where: { id },
            include: {
                delivery: { include: { items: true } },
                items: true
            }
        });

        if (!ret || ret.status !== "PENDING") throw new Error("Invalid or already verified return");

        let totalValue = 0;
        ret.items.forEach((retItem: any) => {
            const deliveryItem = ret.delivery.items.find((i: any) => i.productId === retItem.productId);
            if (deliveryItem) {
                totalValue += (retItem.quantity * Number(deliveryItem.salesPrice));
            }
        });

        await tx.salesReturn.update({
            where: { id },
            data: { status: "VERIFIED_BY_FINANCE" }
        });

        const customer = await tx.customer.findFirst({ where: { name: ret.delivery.buyerName } });
        if (customer) {
            await tx.customer.update({
                where: { id: customer.id },
                data: { balance: { decrement: totalValue } }
            });
        }

        const arAccount = await tx.financeAccount.findUnique({ where: { code: '105' } }); // Piutang
        const salesAccount = await tx.financeAccount.findUnique({ where: { code: '401' } }); // Pendapatan Penjualan

        if (arAccount && salesAccount) {
            await tx.journalEntry.create({ data: { description: `Retur Penjualan (Potongan Piutang): ${ret.returnNumber}`, amount: totalValue as any, type: "CREDIT", accountId: arAccount.id, date: new Date() } });
            await tx.journalEntry.create({ data: { description: `Retur Penjualan (Potongan Pendapatan): ${ret.returnNumber}`, amount: totalValue as any, type: "DEBIT", accountId: salesAccount.id, date: new Date() } });
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
 * SALES RETURN: Delete Return
 */
export async function deleteSalesReturnAction(id: string) {
    return await prisma.$transaction(async (tx: any) => {
        const ret = await tx.salesReturn.findUnique({
            where: { id },
            include: { items: { include: { deliveryItem: true } }, delivery: true }
        });
        if (!ret) throw new Error("Return not found");

        // Revert Stock (Decrement because it was added back during return)
        for (const item of ret.items) {
            const vendorName = item.deliveryItem?.vendorName || "UMUM";
            await tx.stock.upsert({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: item.productId,
                        warehouseId: ret.delivery.warehouseId,
                        vendorName: vendorName
                    }
                },
                update: { quantity: { decrement: item.quantity } },
                create: {
                    productId: item.productId,
                    warehouseId: ret.delivery.warehouseId,
                    vendorName: vendorName,
                    quantity: -item.quantity
                }
            });

            await tx.stockMovement.deleteMany({
                where: { reference: ret.returnNumber, productId: item.productId }
            });
        }

        // Revert Finance if Verified (Not implemented in verifySalesReturnAction yet, but prepared)
        await tx.salesReturnItem.deleteMany({ where: { salesReturnId: id } });
        await tx.salesReturn.delete({ where: { id } });

        revalidatePath("/sales");
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

/**
 * SALES RETURN: Update Return
 */
export async function updateSalesReturnAction(id: string, data: {
    items: { productId: string; quantity: number; reason: string; deliveryItemId?: string }[];
    notes?: string;
}) {
    return await prisma.$transaction(async (tx: any) => {
        const ret = await tx.salesReturn.findUnique({
            where: { id },
            include: { items: { include: { deliveryItem: true } }, delivery: true }
        });
        if (!ret) throw new Error("Return not found");
        if (ret.status === "VERIFIED_BY_FINANCE") throw new Error("Cannot edit verified return");

        // 1. Revert Old Stock (Decrement because it was incremented)
        for (const oldItem of ret.items) {
            const vendorName = oldItem.deliveryItem?.vendorName || "UMUM";
            await tx.stock.upsert({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: oldItem.productId,
                        warehouseId: ret.delivery.warehouseId,
                        vendorName: vendorName
                    }
                },
                update: { quantity: { decrement: oldItem.quantity } },
                create: {
                    productId: oldItem.productId,
                    warehouseId: ret.delivery.warehouseId,
                    vendorName: vendorName,
                    quantity: -oldItem.quantity
                }
            });
        }

        // 2. Clear Old Items & Old movements
        await tx.salesReturnItem.deleteMany({ where: { salesReturnId: id } });
        await tx.stockMovement.deleteMany({ where: { reference: ret.returnNumber } });

        // 3. Apply New Stock & Create New Items
        for (const newItem of data.items) {
            const originalItem = await tx.salesDeliveryItem.findFirst({
                where: { deliveryId: ret.deliveryId, productId: newItem.productId }
            });
            const vendorName = originalItem?.vendorName || "UMUM";

            await tx.stock.upsert({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: newItem.productId,
                        warehouseId: ret.delivery.warehouseId,
                        vendorName: vendorName
                    }
                },
                update: { quantity: { increment: newItem.quantity } },
                create: {
                    productId: newItem.productId,
                    warehouseId: ret.delivery.warehouseId,
                    vendorName: vendorName,
                    quantity: newItem.quantity
                }
            });

            await tx.salesReturnItem.create({
                data: {
                    salesReturnId: id,
                    productId: newItem.productId,
                    deliveryItemId: newItem.deliveryItemId || originalItem?.id,
                    quantity: newItem.quantity,
                    reason: newItem.reason
                }
            });

            // Create New Stock Movement
            await tx.stockMovement.create({
                data: {
                    productId: newItem.productId,
                    warehouseId: ret.delivery.warehouseId,
                    vendorName: vendorName,
                    quantity: newItem.quantity,
                    type: "ADJUSTMENT",
                    reference: ret.returnNumber
                }
            });
        }

        await tx.salesReturn.update({
            where: { id },
            data: { notes: data.notes }
        });

        revalidatePath("/sales");
        revalidatePath("/warehouse");
    });
}

/**
 * NOTIFICATION ACTIONS
 */
export async function createNotificationAction(data: {
    title: string;
    message: string;
    type?: string;
}) {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
        throw new Error("Hanya Admin yang dapat membuat pengumuman.");
    }

    const notification = await (prisma as any).notification.create({
        data: {
            title: data.title,
            message: data.message,
            type: data.type || "broadcast",
            authorId: session.user.id
        }
    });

    revalidatePath("/");
    return { success: true, notification };
}

export async function getNotificationsAction() {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user?.id) return [];

    return await (prisma as any).notification.findMany({
        where: {
            NOT: {
                reads: {
                    some: {
                        userId: session.user.id
                    }
                }
            }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
    });
}

export async function deleteNotificationAction(id: string) {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
        throw new Error("Unauthorized");
    }

    await (prisma as any).notification.delete({
        where: { id }
    });

    revalidatePath("/");
    return { success: true };
}

export async function markNotificationAsReadAction(notificationId: string) {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user?.id) throw new Error("Unauthorized");

    await (prisma as any).$transaction(async (tx: any) => {
        // Mark as read
        await tx.notificationRead.upsert({
            where: {
                notificationId_userId: {
                    notificationId,
                    userId: session.user.id
                }
            },
            update: {},
            create: {
                notificationId,
                userId: session.user.id
            }
        });

        // Check if all users have read
        const totalUsers = await tx.user.count();
        const readCount = await tx.notificationRead.count({
            where: { notificationId }
        });

        // Logic: if all users have read, delete the notification
        if (readCount >= totalUsers) {
            await tx.notification.delete({
                where: { id: notificationId }
            });
        }
    });

revalidatePath("/");
    return { success: true };
}

/**
 * DASHBOARD: Get Daily Report Data (Sales, Purchase, Ops)
 */
export async function getDailyReportAction() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const [sales, purchases, operational, requests] = await Promise.all([
        // Sales INPUTTED today
        prisma.salesDelivery.findMany({
            where: { createdAt: { gte: today, lt: tomorrow } },
            select: {
                id: true, deliveryNumber: true, buyerName: true, recipient: true, 
                grandTotal: true, paymentStatus: true, createdAt: true, date: true,
                createdBy: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        }),
        // Purchases INPUTTED today
        prisma.goodsReceipt.findMany({
            where: { createdAt: { gte: today, lt: tomorrow } },
            select: {
                id: true, receiptNumber: true, receivedFrom: true, grandTotal: true,
                paymentStatus: true, createdAt: true, date: true,
                warehouse: { select: { name: true } },
                createdBy: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        }),
        // Finance Transactions INPUTTED today
        prisma.financeTransaction.findMany({
            where: { createdAt: { gte: today, lt: tomorrow } },
            select: {
                id: true, description: true, bank: true, category: true, 
                amount: true, createdAt: true, date: true, transactionType: true,
                createdBy: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        }),
        // Purchase Requests INPUTTED today
        prisma.purchaseRequest.findMany({
            where: { createdAt: { gte: today, lt: tomorrow } },
            select: {
                id: true, number: true, status: true, notes: true, createdAt: true,
                requestedBy: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        })
    ]);

    // Calculate Summary Totals
    const dailyStats = {
        totalSales: sales.reduce((acc, s) => acc + Number(s.grandTotal || 0), 0),
        totalPurchases: purchases.reduce((acc, p) => acc + Number(p.grandTotal || 0), 0),
        totalOps: operational.reduce((acc, o) => acc + Number(o.amount || 0), 0),
        countSales: sales.length,
        countPurchases: purchases.length,
        countOps: operational.length,
        countRequests: requests.length
    };

    const report = {
        sales: sales,
        purchases: purchases,
        operational: operational,
        requests: requests,
        dailyStats: dailyStats
    };

    console.log("Daily Report successfully generated");
    return JSON.parse(JSON.stringify(report));
}

/**
 * WAREHOUSE / ADMIN: Manual Stock Adjustment
 */
export async function adjustStockAction({
    productId,
    warehouseId,
    vendorName,
    type,
    amount,
    notes,
    adjustedBy
}: {
    productId: string;
    warehouseId: string;
    vendorName: string;
    type: "ADD" | "SUBTRACT" | "SET";
    amount: number;
    notes: string;
    adjustedBy: string;
}) {
    if (amount < 0 && type !== "SET") {
        throw new Error("Amount must be positive");
    }

    return await prisma.$transaction(async (tx: any) => {
        // 1. Get current stock
        const currentStock = await tx.stock.findUnique({
            where: {
                productId_warehouseId_vendorName: {
                    productId,
                    warehouseId,
                    vendorName
                }
            }
        });

        const currentQty = currentStock ? currentStock.quantity : 0;
        let diff = 0;

        if (type === "ADD") {
            diff = amount;
        } else if (type === "SUBTRACT") {
            diff = -amount;
            if (currentQty + diff < 0) {
                throw new Error(`Stok tidak cukup. Stok saat ini: ${currentQty}`);
            }
        } else if (type === "SET") {
            if (amount < 0) throw new Error("Stok akhir tidak boleh negatif");
            diff = amount - currentQty;
        }

        if (diff === 0) {
            return { success: true, message: "Tidak ada perubahan stok." };
        }

        // 2. Update Stock
        await tx.stock.upsert({
            where: {
                productId_warehouseId_vendorName: {
                    productId,
                    warehouseId,
                    vendorName
                }
            },
            update: { quantity: { increment: diff } },
            create: {
                productId,
                warehouseId,
                vendorName,
                quantity: diff
            }
        });

        // 3. Create StockMovement
        await tx.stockMovement.create({
            data: {
                productId,
                warehouseId,
                vendorName,
                quantity: diff,
                type: "ADJUSTMENT",
                reference: `MANUAL-${adjustedBy.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`
            }
        });

        return { success: true };
    });
}
