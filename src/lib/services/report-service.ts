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
export async function getMonthlyClosingReportService(month?: number, year?: number) {
    const prisma = getPrisma();
    const filterYear = year || new Date().getFullYear();
    const filterMonth = month || (new Date().getMonth() + 1);
    const startDate = new Date(filterYear, filterMonth - 1, 1);
    const endDate = new Date(filterYear, filterMonth, 0, 23, 59, 59);

    try {
        const [sales, purchases, expenses, arRecords, apRecords] = await Promise.all([
            // 1. Total Sales (Revenue) - From Deliveries (Invoices)
            (prisma as any).salesDelivery.findMany({
                where: { isVoid: false, date: { gte: startDate, lte: endDate } },
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
                where: { isVoid: false, date: { gte: startDate, lte: endDate } }
            }),
            // 3. Operational Expenses (Money Out)
            (prisma as any).financeTransaction.findMany({
                where: {
                    date: { gte: startDate, lte: endDate },
                    // Assuming negative amount or specific types like PAYMENT/EXPENSE are money out
                    OR: [
                        { transactionType: "PAYMENT" },
                        { transactionType: "EXPENSE" },
                        { amount: { lt: 0 } }
                    ]
                }
            }),
            // 4. Accounts Receivable (Unpaid Deliveries)
            (prisma as any).salesDelivery.findMany({
                where: { isVoid: false, paymentStatus: { in: ["PENDING", "PARTIAL"] } },
                select: { grandTotal: true, paidAmount: true }
            }),
            // 5. Accounts Payable (Unpaid LPB)
            (prisma as any).goodsReceipt.findMany({
                where: { isVoid: false, paymentStatus: { in: ["PENDING", "PARTIAL"] } },
                select: { grandTotal: true, paidAmount: true }
            })
        ]);

        // Pre-fetch last purchase prices for products sold (fallback for missing lot data)
        const priceMap: Record<string, number> = {};
        const productIds: string[] = Array.from(new Set(
            sales.flatMap((s: any) => (s.items || []).map((i: any) => String(i.productId))).filter(Boolean)
        ));

        if (productIds.length > 0) {
            try {
                // Try Goods Receipt first (Most accurate: What we actually paid)
                const lastPurchases = await (prisma as any).goodsReceiptItem.findMany({
                    where: { productId: { in: productIds } },
                    orderBy: { createdAt: 'desc' },
                    select: { productId: true, purchasePrice: true }
                });

                lastPurchases.forEach((lp: any) => {
                    if (!priceMap[lp.productId]) priceMap[lp.productId] = Number(lp.purchasePrice || 0);
                });

                // Try Purchase Orders for products still missing (Second best: What we agreed to pay)
                const missingIds = productIds.filter((id: string) => !priceMap[id]);
                if (missingIds.length > 0) {
                    const lastPOItems = await (prisma as any).purchaseOrderItem.findMany({
                        where: { productId: { in: missingIds } },
                        orderBy: { createdAt: 'desc' },
                        select: { productId: true, price: true }
                    });
                    lastPOItems.forEach((poi: any) => {
                        if (!priceMap[poi.productId]) priceMap[poi.productId] = Number(poi.price || 0);
                    });
                }
            } catch (e) {
                console.error("HPP Fallback Fetch Error:", e);
            }
        }

        // Calculate Revenue & COGS (HPP)
        let totalRevenue = 0;
        let totalHpp = 0;
        sales.forEach((s: any) => {
            totalRevenue += Number(s.grandTotal || 0);
            (s.items || []).forEach((item: any) => {
                // 1. Primary: Use specific lot allocations (FIFO/Batch)
                if (item.lotAllocations && item.lotAllocations.length > 0) {
                    item.lotAllocations.forEach((alloc: any) => {
                        totalHpp += (Number(alloc.quantity || 0) * Number(alloc.hppAtTime || 0));
                    });
                } else {
                    // 2. Fallback: Use last purchase price from LPB or Master Product
                    const productId = String(item.productId);
                    const fallbackPrice = priceMap[productId] || Number(item.product?.purchasePrice || 0);
                    totalHpp += (Number(item.quantity || 0) * fallbackPrice);
                }
            });
        });

        // Calculate Purchase Value
        const totalPurchaseValue = purchases.reduce((acc: number, p: any) => acc + Number(p.grandTotal || 0), 0);

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
            inventoryAddition: Number(totalPurchaseValue || 0),
            outstandingAR: Number(totalAR || 0),
            outstandingAP: Number(totalAP || 0),
            details: {
                sales: sales.map((s: any) => ({
                    id: s.id,
                    number: s.deliveryNumber,
                    date: s.date,
                    entity: s.buyerName || s.recipient,
                    amount: Number(s.grandTotal || 0)
                })),
                purchases: purchases.map((p: any) => ({
                    id: p.id,
                    number: p.receiptNumber,
                    date: p.date,
                    entity: p.receivedFrom,
                    amount: Number(p.grandTotal || 0)
                })),
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
    } catch (err) {
        console.error("Monthly Closing Report Error:", err);
        return { error: "Failed to generate monthly closing report" };
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
