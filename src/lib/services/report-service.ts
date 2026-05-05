import { getPrisma } from "@/lib/prisma";

/**
 * FIFO TRACEABILITY SERVICE — v2 (Lot/Batch System)
 * For sales with LotAllocations: uses hppAtTime for 100% accurate HPP.
 * For historical sales without allocations: falls back to FIFO assumption.
 */
export async function getProductTraceabilityService(month?: number, year?: number) {
    const prisma = getPrisma();

    const filterYear = year || new Date().getFullYear();
    const filterMonth = month || (new Date().getMonth() + 1);
    const startDate = new Date(filterYear, filterMonth - 1, 1);
    const endDate = new Date(filterYear, filterMonth, 0, 23, 59, 59);

    try {
        // ── STEP 1: Fetch sales deliveries in period ──────────────────────
        const deliveries = await (prisma as any).salesDelivery.findMany({
            where: { isVoid: false, date: { gte: startDate, lte: endDate } },
            include: {
                items: {
                    include: {
                        product: { select: { sku: true, name: true, uom: true } },
                        lotAllocations: { include: { lot: true } }
                    }
                }
            },
            orderBy: { date: 'asc' }
        }) as any[];


        // Fetch SO numbers
        const orderIds = deliveries.map((d: any) => d.orderId).filter(Boolean) as string[];
        const salesOrders = orderIds.length > 0
            ? await (prisma as any).salesOrder.findMany({
                where: { id: { in: orderIds } },
                select: { id: true, orderNumber: true }
            })
            : [];
        const orderNumberMap = new Map<string, string>(salesOrders.map((o: any) => [o.id, o.orderNumber]));

        const grNumbers = new Set<string>();
        for (const sd of deliveries) {
            for (const sdItem of sd.items) {
                if (sdItem.lotAllocations) {
                    sdItem.lotAllocations.forEach((a: any) => { if (a.lot?.grNumber) grNumbers.add(a.lot.grNumber); });
                }
            }
        }

        const goodsReceipts = await (prisma as any).goodsReceipt.findMany({
            where: { receiptNumber: { in: Array.from(grNumbers) } },
            select: { receiptNumber: true, paymentStatus: true }
        });
        const grPaymentMap = new Map<string, string>(goodsReceipts.map((gr: any) => [gr.receiptNumber, gr.paymentStatus]));

        const report: Record<string, any>[] = [];

        // ── STEP 2: Process each delivery item ───────────────────────────
        for (const sd of deliveries) {
            for (const sdItem of sd.items) {
                const soNumber = orderNumberMap.get((sd as any).orderId ?? '') ?? (sd as any).poNumber ?? '-';
                const buyer = sd.buyerName || sd.recipient;
                const tglJual = new Date(sd.date).toLocaleDateString('id-ID');
                const noSJ = sd.deliveryNumber;
                const sku = sdItem.product.sku;
                const nama = sdItem.product.name;
                const satuan = sdItem.product.uom || 'PCS';
                const sellPrice = Number(sdItem.salesPrice || 0);

                if (sdItem.lotAllocations && sdItem.lotAllocations.length > 0) {
                    // ✅ PATH A: Lot-allocated — 100% AKURAT
                    for (const alloc of sdItem.lotAllocations) {
                        const hpp = Number(alloc.hppAtTime);
                        const profitUnit = sellPrice - hpp;
                        const totalProfit = profitUnit * alloc.qty;
                        const marginPct = sellPrice > 0
                            ? Math.round(((sellPrice - hpp) / sellPrice) * 1000) / 10
                            : 0;

                        report.push({
                            'Tgl Beli': alloc.lot.grDate ? new Date(alloc.lot.grDate).toLocaleDateString('id-ID') : '-',
                            'No. GR (Batch Beli)': alloc.lot.grNumber,
                            'No. Lot': alloc.lot.lotNumber,
                            'Supplier': alloc.lot.supplierName,
                            'HPP Per Unit (Rp)': hpp,
                            'Tgl Jual': tglJual,
                            'No. SJ': noSJ,
                            'No. SO': soNumber,
                            'Buyer': buyer,
                            'SKU': sku,
                            'Nama Barang': nama,
                            'Satuan': satuan,
                            'QTY': alloc.qty,
                            'Harga Jual Per Unit (Rp)': sellPrice,
                            'Profit Per Unit (Rp)': Math.round(profitUnit),
                            'Total Profit (Rp)': Math.round(totalProfit),
                            'Margin %': `${marginPct.toFixed(1)}%`,
                            'Status Bayar Beli': grPaymentMap.get(alloc.lot.grNumber) || 'PAID',
                            'Status Bayar Jual': sd.paymentStatus || 'PENDING',
                            'Status': 'TERJUAL (LOT)'
                        });
                    }

                    // Handle unallocated qty within this item (edge case)
                    const allocatedQty = sdItem.lotAllocations.reduce((s: number, a: any) => s + a.qty, 0);
                    const unallocated = sdItem.quantity - allocatedQty;
                    if (unallocated > 0) {
                        const lastLot = await (prisma as any).productLot.findFirst({
                            where: { productId: sdItem.productId },
                            orderBy: { grDate: 'desc' }
                        });
                        const hpp = lastLot ? Number(lastLot.purchasePrice) : Number(sdItem.product.purchasePrice || 0);
                        const profitUnit = sellPrice - hpp;
                        const totalProfit = profitUnit * unallocated;
                        const marginPct = sellPrice > 0 ? (profitUnit / sellPrice) * 100 : 0;

                        report.push({
                            'Tgl Beli': lastLot ? new Date(lastLot.grDate).toLocaleDateString('id-ID') : '-',
                            'No. GR (Batch Beli)': lastLot ? (lastLot.grNumber || lastLot.lotNumber) : '-',
                            'No. Lot': lastLot ? (lastLot.grNumber || lastLot.lotNumber) : '-',
                            'Supplier': sdItem.vendorName || '-',
                            'HPP Per Unit (Rp)': Math.round(hpp),
                            'Tgl Jual': tglJual,
                            'No. SJ': noSJ,
                            'No. SO': soNumber,
                            'Buyer': buyer,
                            'SKU': sku,
                            'Nama Barang': nama,
                            'Satuan': satuan,
                            'QTY': unallocated,
                            'Harga Jual Per Unit (Rp)': sellPrice,
                            'Profit Per Unit (Rp)': Math.round(profitUnit),
                            'Total Profit (Rp)': Math.round(totalProfit),
                            'Margin %': `${marginPct.toFixed(1)}%`,
                            'Status Bayar Beli': 'PAID', // Default for historical fallback
                            'Status Bayar Jual': sd.paymentStatus || 'PENDING',
                            'Status': 'STOK HISTORIS (BELUM LOT)'
                        });


                    }


                } else {
                    // ⚠️ PATH B: No lot allocation (data historis sebelum implementasi)
                    // Cari harga beli terakhir produk ini untuk mengisi HPP historis
                    const lastLot = await (prisma as any).productLot.findFirst({
                        where: { productId: sdItem.productId },
                        orderBy: { grDate: 'desc' }
                    });
                    const hpp = lastLot ? Number(lastLot.purchasePrice) : Number(sdItem.product.purchasePrice || 0);
                    const profitUnit = sellPrice - hpp;
                    const totalProfit = profitUnit * sdItem.quantity;
                    const marginPct = sellPrice > 0 ? (profitUnit / sellPrice) * 100 : 0;

                    report.push({
                        'Tgl Beli': lastLot ? new Date(lastLot.grDate).toLocaleDateString('id-ID') : '-',
                        'No. GR (Batch Beli)': lastLot ? (lastLot.grNumber || lastLot.lotNumber) : '-',
                        'No. Lot': lastLot ? (lastLot.grNumber || lastLot.lotNumber) : '-',
                        'Supplier': sdItem.vendorName || '-',
                        'HPP Per Unit (Rp)': Math.round(hpp),
                        'Tgl Jual': tglJual,
                        'No. SJ': noSJ,
                        'No. SO': soNumber,
                        'Buyer': buyer,
                        'SKU': sku,
                        'Nama Barang': nama,
                        'Satuan': satuan,
                        'QTY': sdItem.quantity,
                        'Harga Jual Per Unit (Rp)': sellPrice,
                        'Profit Per Unit (Rp)': Math.round(profitUnit),
                        'Total Profit (Rp)': Math.round(totalProfit),
                        'Margin %': `${marginPct.toFixed(1)}%`,
                        'Status Bayar Beli': 'PAID', // Default for historical fallback
                        'Status Bayar Jual': sd.paymentStatus || 'PENDING',
                        'Status': 'DATA HISTORIS (PRE-LOT)'
                    });



                }
            }
        }

        return report;

    } catch (error: any) {
        console.error("[getProductTraceabilityService] ERROR:", error);
        return { error: (error as Error).message || "Failed to fetch traceability report" };
    }
}

/**
 * MONTHLY CLOSING REPORT SERVICE
 * Provides a consolidated view of Sales, Purchases, Expenses, and Profit/Loss for a specific period.
 */
export async function getMonthlyClosingReportService(month?: number, year?: number, prefix?: 'PF' | 'BC' | 'ALL') {
    const prisma = getPrisma();
    const filterYear = year || new Date().getFullYear();
    const filterMonth = month || (new Date().getMonth() + 1);
    const startDate = new Date(filterYear, filterMonth - 1, 1);
    const endDate = new Date(filterYear, filterMonth, 0, 23, 59, 59);

    const isAll = !prefix || prefix === 'ALL';

    try {
        const [sales, purchases, expenses, arRecords, apRecords, bankJournals] = await Promise.all([
            // 1. Total Sales (Revenue) - From Deliveries (Invoices)
            (prisma as any).salesDelivery.findMany({
                where: { 
                    isVoid: false, 
                    date: { gte: startDate, lte: endDate },
                    ...(isAll ? {} : { deliveryNumber: { startsWith: prefix } })
                },
                include: {
                    items: {
                        include: {
                            lotAllocations: true,
                            product: { select: { purchasePrice: true } }
                        }
                    }
                }
            }),
            // 2. Total Purchases (Inventory Additions)
            (prisma as any).goodsReceipt.findMany({
                where: { 
                    isVoid: false, 
                    date: { gte: startDate, lte: endDate },
                    ...(isAll ? {} : { receiptNumber: { startsWith: prefix } })
                }
            }),
            // 3. Operational Expenses (Money Out)
            (prisma as any).financeTransaction.findMany({
                where: {
                    date: { gte: startDate, lte: endDate },
                    OR: [
                        { transactionType: "PAYMENT" },
                        { transactionType: "EXPENSE" },
                        { amount: { lt: 0 } }
                    ],
                    ...(isAll ? {} : { 
                        description: { contains: prefix, mode: 'insensitive' }
                    })
                }
            }),
            // 4. Accounts Receivable (Unpaid Deliveries)
            (prisma as any).salesDelivery.findMany({
                where: { 
                    isVoid: false, 
                    paymentStatus: { in: ["PENDING", "PARTIAL"] },
                    ...(isAll ? {} : { deliveryNumber: { startsWith: prefix } })
                },
                select: { grandTotal: true, paidAmount: true }
            }),
            // 5. Accounts Payable (Unpaid LPB)
            (prisma as any).goodsReceipt.findMany({
                where: { 
                    isVoid: false, 
                    paymentStatus: { in: ["PENDING", "PARTIAL"] },
                    ...(isAll ? {} : { receiptNumber: { startsWith: prefix } })
                },
                select: { grandTotal: true, paidAmount: true }
            }),
            // 6. Fetch Journal Entries for Bank Info mapping
            (prisma as any).journalEntry.findMany({
                where: {
                    date: { gte: startDate, lte: endDate },
                    type: { in: ["DEBIT", "CREDIT"] },
                    account: { code: { in: ["101", "102", "106", "107", "108"] } }
                },
                include: { account: true }
            })
        ]);

        // 1. Build an efficient Price Dictionary for SOLD products only
        const productIdsInSales = Array.from(new Set(
            sales.flatMap((s: any) => (s.items || []).map((i: any) => String(i.productId))).filter(Boolean)
        ));

        const priceMap: Record<string, number> = {};
        if (productIdsInSales.length > 0) {
            const lastGRPrices = await (prisma as any).goodsReceiptItem.findMany({
                where: { productId: { in: productIdsInSales } },
                orderBy: { id: 'desc' }, // Use id as fallback for latest record
                select: { productId: true, purchasePrice: true }
            });
            lastGRPrices.forEach((lp: any) => {
                if (!priceMap[lp.productId]) priceMap[lp.productId] = Number(lp.purchasePrice || 0);
            });
        }

        // 2. Calculate Revenue & COGS (HPP) - CASH BASIS
        let totalRevenue = 0;
        let totalHpp = 0;
        
        sales.forEach((s: any) => {
            // Only count what has actually been PAID to match BCA
            totalRevenue += Number(s.paidAmount || 0);
            
            // For HPP, we calculate it proportionally to the quantity sold
            (s.items || []).forEach((item: any) => {
                const qty = Number(item.quantity || 0);
                let unitCost = 0;

                // Priority 1: FIFO / Lot Allocation
                if (item.lotAllocations && item.lotAllocations.length > 0) {
                    item.lotAllocations.forEach((alloc: any) => {
                        unitCost = Number(alloc.hppAtTime || 0);
                        totalHpp += (Number(alloc.quantity || 0) * unitCost);
                    });
                } 
                else {
                    // Priority 2: Historical LPB Price or Master Price
                    unitCost = priceMap[item.productId] || Number(item.product?.purchasePrice || 0);
                    totalHpp += (qty * unitCost);
                }
            });
        });

        // 3. Accounting Style (Cash Basis)
        let beginningValue = 0;
        try {
            // Beginning Inventory Value remains the same as it's a snapshot
            const beginningInventory = await (prisma as any).stock.findMany({
                include: { product: { select: { purchasePrice: true } } }
            });
            beginningValue = beginningInventory.reduce((acc: number, s: any) => {
                const price = priceMap[s.productId] || Number(s.product?.purchasePrice || 0);
                return acc + (Number(s.quantity || 0) * price);
            }, 0);
        } catch (invErr) {
            console.error("Inventory Valuation Error:", invErr);
            beginningValue = 0; // Fallback to 0 to prevent total crash
        }

        // Net Purchases - CASH BASIS (Only count paid amount to suppliers)
        const netPurchases = purchases.reduce((acc: number, p: any) => acc + Number(p.paidAmount || 0), 0);

        // Estimated Ending Inventory (Start + Purchases - Revenue_at_Cost)
        // For a more accurate "Ending Inventory", we would need a historical stock snapshot.
        // Since we don't have snapshots, we use the current stock and work backwards or use the perpetual sum.
        const endingValue = beginningValue + netPurchases - totalHpp;

        // Calculate Operational Expenses (Absolute value for display)
        const totalExpenses = expenses.reduce((acc: number, e: any) => acc + Math.abs(Number(e.amount || 0)), 0);

        // Calculate AR/AP Balances
        const totalAR = arRecords.reduce((acc: number, r: any) => acc + (Number(r.grandTotal) - Number(r.paidAmount)), 0);
        const totalAP = apRecords.reduce((acc: number, r: any) => acc + (Number(r.grandTotal) - Number(r.paidAmount)), 0);

        const grossProfit = totalRevenue - totalHpp;
        const netProfit = grossProfit - totalExpenses;

        return {
            period: `${filterMonth}/${filterYear}`,
            revenue: Number(totalRevenue || 0),
            hpp: Number(totalHpp || 0),
            grossProfit: Number(grossProfit || 0),
            expenses: Number(totalExpenses || 0),
            netProfit: Number(netProfit || 0),
            inventory: {
                beginning: beginningValue,
                purchases: netPurchases,
                ending: endingValue,
                btud: beginningValue + netPurchases
            },
            outstandingAR: Number(totalAR || 0),
            outstandingAP: Number(totalAP || 0),
            debug: {
                salesCount: sales.length,
                totalItemsInSales: sales.reduce((acc: number, s: any) => acc + (s.items?.length || 0), 0),
                priceMapSize: Object.keys(priceMap).length
            },
            details: {
                sales: sales.map((s: any) => {
                    const relatedBank = bankJournals.find((j: any) => j.description.includes(s.deliveryNumber));
                    return {
                        id: s.id,
                        number: s.deliveryNumber,
                        date: s.date,
                        entity: s.buyerName || s.recipient,
                        totalQty: (s.items || []).reduce((acc: number, item: any) => acc + Number(item.quantity || 0), 0),
                        subtotal: Number(s.subtotal || 0),
                        discount: Number(s.totalDiscount || 0),
                        tax: Number(s.taxAmount || 0),
                        grandTotal: Number(s.grandTotal || 0),
                        paidAmount: Number(s.paidAmount || 0),
                        bankCode: relatedBank?.account?.code || "-",
                        paymentDate: relatedBank?.date ? relatedBank.date : null
                    };
                }),
                purchases: purchases.map((p: any) => {
                    const relatedBank = bankJournals.find((j: any) => j.description.includes(p.receiptNumber));
                    return {
                        id: p.id,
                        number: p.receiptNumber,
                        date: p.date,
                        entity: p.receivedFrom,
                        subtotal: Number(p.subtotal || 0),
                        discount: Number(p.totalDiscount || 0),
                        taxRate: Number(p.taxRate || 0),
                        tax: Number(p.taxAmount || 0),
                        grandTotal: Number(p.grandTotal || 0),
                        paidAmount: Number(p.paidAmount || 0),
                        bankCode: relatedBank?.account?.code || "-",
                        paymentDate: relatedBank?.date ? relatedBank.date : null
                    };
                }),
                expenses: expenses.map((e: any) => ({
                    id: e.id,
                    date: e.date,
                    description: e.description,
                    category: e.category || e.transactionType,
                    amount: Number(e.amount || 0)
                }))
            },
            stats: {
                salesCount: sales.length,
                purchaseCount: purchases.length,
                expenseCount: expenses.length
            }
        };
    } catch (error: any) {
        console.error("[getMonthlyClosingReportService] ERROR:", error);
        return { error: error.message || "Failed to generate monthly closing report" };
    }
}


/**
 * PURCHASE RETURNS DETAIL REPORT
 */
export async function getPurchaseReturnsDetailService() {
    const prisma = getPrisma();
    return await prisma.purchaseReturnItem.findMany({
        select: {
            quantity: true,
            reason: true,
            product: { select: { sku: true, name: true, uom: true } },
            purchaseReturn: {
                select: {
                    returnNumber: true,
                    date: true,
                    status: true,
                    receipt: { select: { receiptNumber: true, receivedFrom: true } }
                }
            }
        },
        orderBy: { purchaseReturn: { date: 'desc' } }
    });
}

/**
 * SALES RETURNS DETAIL REPORT
 */
export async function getSalesReturnsDetailService() {
    const prisma = getPrisma();
    return await prisma.salesReturnItem.findMany({
        select: {
            quantity: true,
            reason: true,
            product: { select: { sku: true, name: true, uom: true } },
            salesReturn: {
                select: {
                    returnNumber: true,
                    date: true,
                    status: true,
                    delivery: { select: { deliveryNumber: true, recipient: true, buyerName: true } }
                }
            }
        },
        orderBy: { salesReturn: { date: 'desc' } }
    });
}
