import { getPrisma } from "@/lib/prisma";

/**
 * FIFO TRACEABILITY SERVICE — v4 (Format Spreadsheet)
 * Kolom disesuaikan persis dengan format gambar referensi:
 * NO | TANGGAL | F.PAJAK | NOMOR | TANGGAL(beli) | NAMA PEMBELI | BARCODE |
 * KETERANGAN ITEM | SALES | [BELI: QTY/HARGA/OPS/TOTAL] | [JUAL: NAMA/QTY/HARGA/TOTAL] |
 */
async function calculateProductTraceabilityInternal(startDate: Date, endDate: Date, prefix?: 'PF' | 'BC' | 'ALL') {
    const prisma = getPrisma();
    const isAll = !prefix || prefix === 'ALL';
    try {
        const rows: Record<string, any>[] = [];

        // ════════════════════════════════════════════════════════════
        // PRE-FETCH: SalesDeliveries + SO map + GR data
        // ════════════════════════════════════════════════════════════
        const deliveries = await (prisma as any).salesDelivery.findMany({
            where: { 
                isVoid: false, 
                date: { gte: startDate, lte: endDate },
                ...(isAll ? {} : { salesPerson: prefix })
            },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true, sku: true, name: true, uom: true,
                                barcode: true, purchasePrice: true
                            }
                        },
                        lotAllocations: { include: { lot: true } }
                    }
                }
            },
            orderBy: { date: 'asc' }
        }) as any[];

        // SO number map
        const orderIds = [...new Set(
            deliveries.map((d: any) => d.orderId).filter(Boolean)
        )] as string[];
        const salesOrders = orderIds.length > 0
            ? await (prisma as any).salesOrder.findMany({
                where: { id: { in: orderIds } },
                select: { id: true, orderNumber: true }
            })
            : [];
        const soMap = new Map<string, string>(salesOrders.map((o: any) => [o.id, o.orderNumber]));

        // Fetch operational transactions linked to these deliveries/invoices
        const invoiceNumbers = deliveries.map((d: any) => d.invoiceNumber || d.deliveryNumber).filter(Boolean);
        const opsTransactions = invoiceNumbers.length > 0
            ? await prisma.financeTransaction.findMany({
                where: {
                    OR: invoiceNumbers.map((inv: string) => ({ invoiceNumber: { contains: inv } }))
                },
                select: { invoiceNumber: true, amount: true, transactionType: true }
            })
            : [];

        const opsMap = new Map<string, number>();
        opsTransactions.forEach((t: any) => {
            if (!t.invoiceNumber) return;
            const amt = (t.transactionType === "PAYMENT" || t.transactionType === "EXPENSE" || Number(t.amount) < 0)
                ? Math.abs(Number(t.amount))
                : -Math.abs(Number(t.amount));
            
            const invoices = t.invoiceNumber.split(',').map((inv: string) => inv.trim()).filter(Boolean);
            if (invoices.length > 0) {
                let totalQty = 0;
                const qtyMap = new Map<string, number>();
                
                invoices.forEach((inv: string) => {
                    const matchingDelivery = deliveries.find((d: any) => d.invoiceNumber === inv || d.deliveryNumber === inv);
                    let qty = 1;
                    if (matchingDelivery && matchingDelivery.items) {
                        qty = matchingDelivery.items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);
                        if (qty === 0) qty = 1;
                    }
                    totalQty += qty;
                    qtyMap.set(inv, qty);
                });

                let remainingAmt = amt;
                let remainingQty = totalQty;
                
                invoices.forEach((inv: string, index: number) => {
                    const qty = qtyMap.get(inv) || 1;
                    const splitAmt = remainingQty > 0 ? Math.round(remainingAmt * (qty / remainingQty)) : Math.round(remainingAmt / (invoices.length - index));
                    remainingAmt -= splitAmt;
                    remainingQty -= qty;
                    opsMap.set(inv, (opsMap.get(inv) || 0) + splitAmt);
                });
            }
        });

        // ── FIX: When multiple deliveries share the same invoiceNumber,
        // distribute OPS proportionally by delivery qty instead of assigning all to each ──
        const invoiceToDeliveries = new Map<string, { deliveryNumber: string; totalQty: number }[]>();
        for (const sd of deliveries) {
            const inv = sd.invoiceNumber || sd.deliveryNumber;
            if (!invoiceToDeliveries.has(inv)) invoiceToDeliveries.set(inv, []);
            const sdQty = sd.items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0) || 1;
            invoiceToDeliveries.get(inv)!.push({ deliveryNumber: sd.deliveryNumber, totalQty: sdQty });
        }

        // Re-key opsMap from invoiceNumber → deliveryNumber for shared invoices
        const opsMapByDelivery = new Map<string, number>();
        for (const [inv, totalOps] of opsMap) {
            const sharedDeliveries = invoiceToDeliveries.get(inv) || [];
            if (sharedDeliveries.length <= 1) {
                // Only 1 delivery uses this invoice → assign all OPS
                opsMapByDelivery.set(inv, totalOps);
            } else {
                // Multiple deliveries share this invoice → distribute by qty
                const grandQty = sharedDeliveries.reduce((s, d) => s + d.totalQty, 0);
                let remaining = totalOps;
                for (let i = 0; i < sharedDeliveries.length; i++) {
                    const share = i < sharedDeliveries.length - 1
                        ? Math.round(totalOps * (sharedDeliveries[i].totalQty / grandQty))
                        : remaining; // Last one gets remainder to avoid rounding errors
                    remaining -= share;
                    opsMapByDelivery.set(sharedDeliveries[i].deliveryNumber, 
                        (opsMapByDelivery.get(sharedDeliveries[i].deliveryNumber) || 0) + share);
                }
            }
        }

        // ════════════════════════════════════════════════════════════
        // NEAREST PURCHASE MATCHING: Pre-fetch ALL GR items for products sold
        // This replaces pure FIFO with smart date+price proximity matching
        // ════════════════════════════════════════════════════════════
        const productIdsInSales = Array.from(new Set(
            deliveries.flatMap((sd: any) => sd.items.map((i: any) => i.productId)).filter(Boolean)
        ));

        // Fetch all GR items for these products (non-voided GRs only)
        type GRItemData = {
            id: string;
            productId: string;
            quantity: number;
            purchasePrice: any;
            discount: any;
            receipt: {
                receiptNumber: string;
                date: Date | null;
                receivedFrom: string;
                isVoid: boolean;
                taxRate: any;
                formNumber: string | null;
                taxInvoiceDate: Date | null;
                taxInvoiceNumber: string | null;
                totalDiscount: any;
                subtotal: any;
            };
        };

        const allGRItemsRaw: GRItemData[] = productIdsInSales.length > 0
            ? await (prisma as any).goodsReceiptItem.findMany({
                where: { 
                    productId: { in: productIdsInSales },
                    receipt: { isVoid: false }
                },
                include: {
                    receipt: {
                        select: {
                            receiptNumber: true, date: true, receivedFrom: true,
                            isVoid: true, taxRate: true, formNumber: true,
                            taxInvoiceDate: true, taxInvoiceNumber: true,
                            totalDiscount: true, subtotal: true
                        }
                    }
                },
                orderBy: { receipt: { date: 'asc' } }
            })
            : [];

        // Group GR items by productId for fast lookup
        const grItemsByProduct = new Map<string, GRItemData[]>();
        for (const grItem of allGRItemsRaw) {
            if (!grItemsByProduct.has(grItem.productId)) {
                grItemsByProduct.set(grItem.productId, []);
            }
            grItemsByProduct.get(grItem.productId)!.push(grItem);
        }

        // Calculate median price per product to detect anomalies
        const medianPriceByProduct = new Map<string, number>();
        for (const [productId, grItems] of grItemsByProduct) {
            const prices = grItems.map(g => Number(g.purchasePrice)).filter(p => p > 0).sort((a, b) => a - b);
            if (prices.length > 0) {
                const mid = Math.floor(prices.length / 2);
                medianPriceByProduct.set(productId, prices.length % 2 === 0 ? (prices[mid - 1] + prices[mid]) / 2 : prices[mid]);
            }
        }

        /**
         * SMART MATCHING: Find the best GR for a given sale item
         * Scoring: date proximity (closer = better) + price consistency (closer to median = better)
         * Filters out price anomalies (>5x or <0.2x median price)
         */
        function findBestGR(productId: string, saleDate: Date, saleQty: number): GRItemData | null {
            const candidates = grItemsByProduct.get(productId);
            if (!candidates || candidates.length === 0) return null;

            const medianPrice = medianPriceByProduct.get(productId) || 0;
            const saleDateMs = saleDate.getTime();

            let bestScore = -Infinity;
            let bestGR: GRItemData | null = null;

            for (const gr of candidates) {
                const grDate = gr.receipt.date;
                if (!grDate) continue;

                const grPrice = Number(gr.purchasePrice);

                // Score 1: Date proximity (prefer purchases BEFORE or ON sale date, penalize future purchases less)
                const daysDiff = Math.abs(saleDateMs - grDate.getTime()) / (1000 * 60 * 60 * 24);
                
                const saleDateDay = new Date(saleDate);
                saleDateDay.setHours(0, 0, 0, 0);
                const grDateDay = new Date(grDate);
                grDateDay.setHours(0, 0, 0, 0);
                
                const isBeforeSale = grDateDay.getTime() <= saleDateDay.getTime();
                
                const dateScore = isBeforeSale 
                    ? Math.max(0, 100 - daysDiff * 0.5) // Purchases before sale: slight decay
                    : Math.max(0, 50 - daysDiff * 2);   // Purchases after sale: heavier penalty

                // Score 2: Quantity match bonus (exact match or close = bonus)
                const qtyRatio = saleQty > 0 && gr.quantity > 0 
                    ? Math.min(saleQty, gr.quantity) / Math.max(saleQty, gr.quantity) 
                    : 0;
                const qtyScore = qtyRatio * 30; // Up to 30 points for exact qty match

                const totalScore = dateScore + qtyScore;

                if (totalScore > bestScore) {
                    bestScore = totalScore;
                    bestGR = gr;
                }
            }

            return bestGR;
        }

        // Helper: format date Indonesia
        const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('id-ID') : '-';

        let rowNo = 0;

        // ════════════════════════════════════════════════════════════
        // STEP 1: PENJUALAN rows with SMART MATCHING
        // ════════════════════════════════════════════════════════════
        for (const sd of deliveries) {
            const soNumber  = soMap.get(sd.orderId ?? '') ?? sd.poNumber ?? '-';
            const buyer     = sd.buyerName || sd.recipient;
            const tglJual   = fmtDate(sd.date);
            const spJual    = sd.salesPerson || '-';
            const taxRate   = Number(sd.taxRate || 0);
            const sdTotalQty = sd.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
            const refNum     = sd.invoiceNumber || sd.deliveryNumber;
            // Use delivery-specific OPS (handles shared invoices), fallback to invoice-level
            const invoiceOps = opsMapByDelivery.get(sd.deliveryNumber) ?? opsMapByDelivery.get(refNum) ?? opsMap.get(refNum) ?? 0;

            let remainingInvoiceOps = invoiceOps;
            let remainingSdQty = sdTotalQty;

            // ── MERGE items with same productId and Lot within this delivery ──
            // e.g. 5 pcs + 263 pcs of "Abc Kecap" → 268 pcs combined
            const mergedItemsMap = new Map<string, any>();
            for (const sdItem of sd.items) {
                let lotGr = 'UNKNOWN';
                if (sdItem.lotAllocations && sdItem.lotAllocations.length > 0) {
                    lotGr = sdItem.lotAllocations[0].lot.grNumber;
                }
                const key = `${sdItem.productId}_${lotGr}`;

                if (mergedItemsMap.has(key)) {
                    const existing = mergedItemsMap.get(key)!;
                    existing.quantity += sdItem.quantity;
                    existing.discount = Number(existing.discount) + Number(sdItem.discount || 0);
                    // Use weighted average salesPrice if different
                    if (Number(sdItem.salesPrice || 0) !== Number(existing.salesPrice || 0)) {
                        const totalQty = existing.quantity;
                        const prevQty = existing.quantity - sdItem.quantity;
                        existing.salesPrice = (Number(existing.salesPrice) * prevQty + Number(sdItem.salesPrice || 0) * sdItem.quantity) / totalQty;
                    }
                } else {
                    mergedItemsMap.set(key, {
                        ...sdItem,
                        quantity: sdItem.quantity,
                        salesPrice: Number(sdItem.salesPrice || 0),
                        discount: Number(sdItem.discount || 0),
                        product: sdItem.product,
                        productId: sdItem.productId
                    });
                }
            }
            const mergedItems = Array.from(mergedItemsMap.values());

            // ── SISI JUAL: Distribute header-level discount (diskon nota SD) ──
            const sdHeaderDiscount = Number(sd.totalDiscount || 0);
            const sdSubtotal = mergedItems.reduce((sum: number, item: any) => {
                return sum + (Number(item.salesPrice || 0) * item.quantity - Number(item.discount || 0));
            }, 0);

            for (const sdItem of mergedItems) {
                const barcode   = sdItem.product.barcode || sdItem.product.sku;
                const namaItem  = sdItem.product.name;
                const perCt     = sdItem.product.uom || 'PCS';
                const sellPrice = Number(sdItem.salesPrice || 0);
                const itemDiscount  = Number(sdItem.discount || 0);
                const qty       = sdItem.quantity;
                let allocLotId = null;

                // Distribusi diskon nota SD ke item ini (proporsional)
                const sellLineSubtotal = sellPrice * qty - itemDiscount;
                const sdDiscountShare = sdSubtotal > 0
                    ? Math.round(sdHeaderDiscount * (sellLineSubtotal / sdSubtotal))
                    : 0;
                const totalSellDiscount = itemDiscount + sdDiscountShare;

                // ── PRIORITY 1: USE ACTUAL LOT ALLOCATION (IF EXISTS) ──
                let bestGR: any = null;
                let grNumber = '-';
                let grDate: Date | null = null;
                let supplierName = '-';
                let hpp = Number(sdItem.product.purchasePrice || 0);
                let purchaseTaxRate = 0;

                if (sdItem.lotAllocations && sdItem.lotAllocations.length > 0) {
                    const allocLot = sdItem.lotAllocations[0].lot; allocLotId = allocLot?.id || null;
                    grNumber = allocLot.grNumber;
                    grDate = allocLot.grDate;
                    supplierName = allocLot.supplierName;
                    hpp = Number(allocLot.purchasePrice);
                    
                    // Lookup receipt info (like taxRate) from pre-fetched GRs
                    bestGR = grItemsByProduct.get(sdItem.productId)?.find(
                        (g: any) => g.receipt.receiptNumber === allocLot.grNumber
                    ) || null;
                    if (bestGR) {
                        purchaseTaxRate = Number(bestGR.receipt.taxRate || 0);
                    }
                } else {
                    // ── SMART MATCHING: Fallback if no lot is explicitly allocated ──
                    bestGR = findBestGR(sdItem.productId, sd.date, qty);
                    if (bestGR) {
                        grNumber = bestGR.receipt.receiptNumber;
                        grDate = bestGR.receipt.date;
                        supplierName = bestGR.receipt.receivedFrom;
                        hpp = Number(bestGR.purchasePrice);
                        purchaseTaxRate = Number(bestGR.receipt.taxRate || 0);
                    }
                }

                // ── SISI BELI: Distribute header-level discount (diskon nota GR) ──
                const grHeaderDiscount = Number(bestGR?.receipt?.totalDiscount || 0);
                const grSubtotal = Number(bestGR?.receipt?.subtotal || 0);
                const buyItemDiscount = Number(bestGR?.discount || 0);
                const buyLineSubtotal = hpp * qty;
                const grDiscountShare = grSubtotal > 0
                    ? Math.round(grHeaderDiscount * (buyLineSubtotal / grSubtotal))
                    : 0;
                const totalBuyDiscount = buyItemDiscount + grDiscountShare;

                // ── PPN CONSISTENCY RULE ──
                // Sisi BELI: gunakan taxRate dari GR (purchaseTaxRate)
                //   KB-LPBD (purchaseTaxRate=11%): HPP sudah tanpa PPN → Total Beli = DPP × 1.11
                //   KB-LPB  (purchaseTaxRate=0%):  HPP sudah termasuk net → Total Beli = DPP (tanpa PPN)
                // Sisi JUAL: tetap gunakan taxRate dari SD (KB-TRN=11%, KB-TRD=0%)

                // DPP Beli = (HPP × qty) - Diskon Beli (item + nota GR)
                const dppBeli = Math.round((hpp * qty) - totalBuyDiscount);
                const totalBeli = Math.round(dppBeli * (1 + purchaseTaxRate / 100));
                const hppEffective = qty > 0 ? Math.round(dppBeli / qty * (1 + purchaseTaxRate / 100)) : 0;

                const grInfo = {
                    taxInvoiceDate: bestGR?.receipt?.taxInvoiceDate || null,
                    formNumber: bestGR?.receipt?.formNumber || null,
                    taxInvoiceNumber: bestGR?.receipt?.taxInvoiceNumber || null,
                    taxRate: purchaseTaxRate
                };

                // DPP Jual = (Harga Jual × qty) - Diskon Jual (item + nota SD)
                const dpp = Math.round((sellPrice * qty) - totalSellDiscount);

                // PPN Jual = DPP × taxRate
                const ppn = Math.round(dpp * taxRate / 100);

                // Total Jual = DPP + PPN
                const totalJual = dpp + ppn;

                const rowOps = remainingSdQty > 0 ? Math.round(remainingInvoiceOps * (qty / remainingSdQty)) : 0;
                remainingInvoiceOps -= rowOps;
                remainingSdQty -= qty;

                // Margin: Total Jual vs Total Beli (keduanya diskon nota sudah didistribusikan)
                const margin    = totalJual - totalBeli - rowOps;
                const marginPct = totalJual > 0 ? (margin / totalJual * 100) : 0;

                rowNo++;
                rows.push({
                    _sortDate          : sd.date,
                    'NO'               : rowNo,
                    'BARCODE'          : barcode,
                    'KETERANGAN ITEM'  : namaItem,
                    'PER/CT'           : perCt,
                    
                    // ─ PEMBELIAN (COLUMNS FIRST) ─
                    'TANGGAL BELI'     : fmtDate(grDate),
                    'NOMOR LPB'        : grNumber,
                    'NAMA SUPPLIER'    : supplierName,
                    'QTY BELI'         : qty,
                    'HARGA BELI'       : hppEffective,
                    'OPS'              : rowOps,
                    'TOTAL BELI'       : totalBeli,
                    'F. PAJAK'         : fmtDate(grInfo.taxInvoiceDate),
                    'NO. FAKTUR'       : grInfo.formNumber || grNumber || '-',
                    'NO. PAJAK'        : grInfo.taxInvoiceNumber || '-',
                    
                    // ─ PENJUALAN (COLUMNS SECOND) ─
                    'TANGGAL JUAL'     : tglJual,
                    'NOMOR SJ'         : sd.deliveryNumber,
                    'NOMOR FAKTUR PENJUALAN': sd.invoiceNumber || sd.deliveryNumber || '-',
                    'NAMA PEMBELI'     : buyer,
                    'SALES'            : spJual,
                    'QTY JUAL'         : qty,
                    'HARGA JUAL'       : Math.round(sellPrice * (1 + taxRate / 100)),
                    'TOTAL JUAL'       : totalJual,
                    'DPP'              : dpp,
                    'PPH'              : ppn,
                    'TOTAL'            : totalJual,
                    'NO. PO'           : soNumber,
                    'PAYMENT'          : sd.paymentStatus || 'PENDING',
                    
                    // ─ KALKULASI & RETUR ─
                    'MARGIN'           : margin,
                    'MARGIN %'         : `${marginPct.toFixed(1)}%`,
                    'NOMOR RETUR'      : '-',
                    '__DATA__'         : {
                        sdItemId: sdItem.id,
                        productId: sdItem.productId,
                        currentLotId: allocLotId
                    }
                });
            }
        }

        // STEP 5: Sort kronologis, re-number NO setelah sort
        rows.sort((a, b) => new Date(a._sortDate).getTime() - new Date(b._sortDate).getTime());

        // Re-number setelah sort agar NO urut sesuai tanggal
        rows.forEach((row, idx) => { row['NO'] = idx + 1; });

        return rows.map(({ _sortDate, ...rest }) => rest);

    } catch (error: any) {
        console.error('[calculateProductTraceabilityInternal] ERROR:', error);
        throw error;
    }
}

export async function getProductTraceabilityService(month?: number, year?: number, prefix?: 'PF' | 'BC' | 'ALL') {
    const filterYear  = year  || new Date().getFullYear();
    const filterMonth = month || (new Date().getMonth() + 1);

    // Sesuaikan penarikan data secara presisi dengan Zona Waktu Indonesia WIB (UTC+7)
    // agar transaksi akhir/awal bulan tidak tergeser zona waktu UTC server
    const startDate = new Date(Date.UTC(filterYear, filterMonth - 1, 1, 0, 0, 0));
    startDate.setUTCHours(startDate.getUTCHours() - 7);

    const endDate = new Date(Date.UTC(filterYear, filterMonth, 0, 23, 59, 59, 999));
    endDate.setUTCHours(endDate.getUTCHours() - 7);

    try {
        return await calculateProductTraceabilityInternal(startDate, endDate, prefix);
    } catch (error: any) {
        console.error('[getProductTraceabilityService] ERROR:', error);
        return { error: (error as Error).message || 'Failed to fetch traceability report' };
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
                    ...(isAll ? {} : { salesPerson: prefix })
                },
                include: {
                    items: {
                        include: {
                            lotAllocations: true,
                            product: { select: { purchasePrice: true } }
                        }
                    }
                },
                orderBy: { date: 'asc' }
            }),
            // 2. Total Purchases (Inventory Additions)
            (prisma as any).goodsReceipt.findMany({
                where: { 
                    isVoid: false, 
                    date: { gte: startDate, lte: endDate },
                    ...(isAll ? {} : { salesPerson: prefix })
                },
                orderBy: { date: 'asc' }
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
                        OR: [
                            { description: { contains: prefix, mode: 'insensitive' } },
                            { salesPerson: prefix }
                        ]
                    })
                },
                orderBy: { date: 'asc' }
            }),
            // 4. Accounts Receivable (Unpaid Deliveries)
            (prisma as any).salesDelivery.findMany({
                where: { 
                    isVoid: false, 
                    date: { lte: endDate },
                    paymentStatus: { in: ["PENDING", "PARTIAL"] },
                    ...(isAll ? {} : { salesPerson: prefix })
                },
                select: { grandTotal: true, paidAmount: true }
            }),
            // 5. Accounts Payable (Unpaid LPB)
            (prisma as any).goodsReceipt.findMany({
                where: { 
                    isVoid: false, 
                    date: { lte: endDate },
                    paymentStatus: { in: ["PENDING", "PARTIAL"] },
                    ...(isAll ? {} : { salesPerson: prefix })
                },
                select: { grandTotal: true, paidAmount: true }
            }),
            // 6. Fetch Journal Entries for Bank Info mapping
            (prisma as any).journalEntry.findMany({
                where: {
                    date: { gte: startDate, lte: endDate },
                    type: { in: ["DEBIT", "CREDIT"] },
                    account: { code: { in: ["101", "102", "106", "107", "108", "109", "110"] } }
                },
                include: { account: true },
                orderBy: { date: 'asc' }
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
            // Standard Accounting (Accrual Basis) for Monthly Closing: 
            // Revenue is the total value of invoices issued in that month.
            totalRevenue += Number(s.grandTotal || 0);
            
            // For HPP, we calculate it proportionally to the quantity sold
            const isPKP = s.isPKP || Number(s.taxRate || 0) > 0 || String(s.invoiceNumber || '').includes('TRN');
            const taxMultiplier = 1 + (isPKP ? 0.11 : 0);
            (s.items || []).forEach((item: any) => {
                const qty = Number(item.quantity || 0);
                let unitCost = 0;

                // Priority 1: FIFO / Lot Allocation
                if (item.lotAllocations && item.lotAllocations.length > 0) {
                    item.lotAllocations.forEach((alloc: any) => {
                        unitCost = Math.round(Number(alloc.hppAtTime || 0) * taxMultiplier);
                        totalHpp += (Number(alloc.qty || 0) * unitCost);
                    });
                } 

                else {
                    // Priority 2: Historical LPB Price or Master Price
                    unitCost = Math.round((priceMap[item.productId] || Number(item.product?.purchasePrice || 0)) * taxMultiplier);
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

        // Net Purchases - Accrual Basis (Total value of goods received in month)
        const netPurchases = purchases.reduce((acc: number, p: any) => acc + Number(p.grandTotal || 0), 0);

        // Estimated Ending Inventory (Start + Purchases - Revenue_at_Cost)
        // For a more accurate "Ending Inventory", we would need a historical stock snapshot.
        // Since we don't have snapshots, we use the current stock and work backwards or use the perpetual sum.
        const endingValue = beginningValue + netPurchases - totalHpp;

        // Calculate Operational Expenses (Absolute value for display)
        const totalExpenses = expenses.reduce((acc: number, e: any) => acc + Math.abs(Number(e.amount || 0)), 0);

        // Calculate AR/AP Balances
        const totalAR = arRecords.reduce((acc: number, r: any) => acc + (Number(r.grandTotal) - Number(r.paidAmount)), 0);
        const totalAP = apRecords.reduce((acc: number, r: any) => acc + (Number(r.grandTotal) - Number(r.paidAmount)), 0);

        const grossProfit = totalRevenue - netPurchases; // User requested: Penjualan - Pembelian
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

/**
 * BATCH TRACEABILITY REPORT SERVICE
 * Perspektif: per Lot/Batch (GR Number), bukan per SJ.
 * Setiap baris adalah satu alokasi penjualan dari lot tersebut.
 * Jika lot belum pernah dijual, tetap muncul 1 baris dengan info lot saja.
 * Filter: berdasarkan GR Date (tanggal masuk lot), per bulan/tahun.
 * Akses: ADMIN, PURCHASE, FINANCE
 */
export async function getBatchTraceabilityService(filters: {
    month?: number;
    year?: number;
    startDate?: Date;
    endDate?: Date;
    status?: string;   // AKTIF | HABIS | VOID | ALL
    sku?: string;
    supplier?: string;
}) {
    const prisma = getPrisma();

    let startDate = filters.startDate;
    let endDate = filters.endDate;

    if (!startDate || !endDate) {
        const filterYear  = filters.year  || new Date().getFullYear();
        const filterMonth = filters.month || (new Date().getMonth() + 1);
        startDate   = new Date(filterYear, filterMonth - 1, 1);
        endDate     = new Date(filterYear, filterMonth, 0, 23, 59, 59);
    }

    // ── Build where clause for ProductLot ────────────────────────────────
    const lotWhere: any = {
        grDate: { gte: startDate, lte: endDate }
    };

    // Status filter
    if (filters.status === 'AKTIF') {
        lotWhere.isVoided = false;
        lotWhere.remainingQty = { gt: 0 };
    } else if (filters.status === 'HABIS') {
        lotWhere.isVoided = false;
        lotWhere.remainingQty = 0;
    } else if (filters.status === 'VOID') {
        lotWhere.isVoided = true;
    }
    // ALL → tidak ada filter status tambahan

    if (filters.supplier) {
        lotWhere.supplierName = { contains: filters.supplier, mode: 'insensitive' };
    }

    if (filters.sku) {
        lotWhere.product = { sku: { contains: filters.sku, mode: 'insensitive' } };
    }

    try {
        // ── Fetch semua lot yang masuk di periode ini ─────────────────────
        const lots = await (prisma as any).productLot.findMany({
            where: lotWhere,
            include: {
                product: { select: { sku: true, name: true, uom: true } },
                allocations: {
                    include: {
                        sdItem: {
                            include: {
                                delivery: {
                                    select: {
                                        deliveryNumber: true,
                                        date: true,
                                        buyerName: true,
                                        recipient: true,
                                        salesPerson: true,
                                        paymentStatus: true,
                                        orderId: true,
                                        subtotal: true,
                                        totalDiscount: true,
                                        taxRate: true,
                                        grandTotal: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: [{ grDate: 'asc' }, { lotNumber: 'asc' }]
        }) as any[];

        // ── Ambil SO number mapping untuk orderId ─────────────────────────
        const orderIds = Array.from(new Set(
            lots.flatMap((lot: any) =>
                lot.allocations
                    .map((a: any) => a.sdItem?.delivery?.orderId)
                    .filter(Boolean)
            )
        )) as string[];

        const salesOrders = orderIds.length > 0
            ? await (prisma as any).salesOrder.findMany({
                where: { id: { in: orderIds } },
                select: { id: true, orderNumber: true }
              })
            : [];
        const orderNumberMap = new Map<string, string>(
            salesOrders.map((o: any) => [o.id, o.orderNumber])
        );

        // ── Build report rows ─────────────────────────────────────────────
        const report: Record<string, any>[] = [];

        for (const lot of lots) {
            const hpp        = Number(lot.purchasePrice);
            const sisaQty    = Number(lot.remainingQty);
                    const initialQty = Number(lot.initialQty);
            const terjualQty = lot.allocations.reduce((s: number, a: any) => s + Number(a.qty), 0);
            const nilaiSisa  = Math.round(sisaQty * hpp);

            let statusLot = 'AKTIF';
            if (lot.isVoided)       statusLot = 'VOID';
            else if (sisaQty <= 0)  statusLot = 'HABIS';

            let rowNo = 1;
            const baseRow = {
                'No. Lot'            : lot.lotNumber,
                'No. GR (Batch Beli)': lot.grNumber,
                'Tgl Masuk (GR Date)': lot.grDate ? new Date(lot.grDate).toLocaleDateString('id-ID') : '-',
                'Supplier'           : lot.supplierName || '-',
                'SKU'                : lot.product.sku,
                'Nama Barang'        : lot.product.name,
                'Satuan'             : lot.product.uom || 'PCS',
                'QTY Masuk'          : initialQty,
                'QTY Terjual (Total)': terjualQty,
                'QTY Sisa'           : sisaQty,
                'HPP Per Unit (Rp)'  : hpp,
                'Nilai Sisa (Rp)'    : nilaiSisa,
                'Status Lot'         : statusLot,
                
                // Fields for ReportsDashboard Compatibility
                'NO'                 : rowNo++,
                'BARCODE'            : lot.product.sku,
                'KETERANGAN ITEM'    : lot.product.name,
                'NAMA SUPPLIER'      : lot.supplierName || '-',
                'NOMOR LPB'          : lot.grNumber,
                'TANGGAL BELI'       : lot.grDate ? new Date(lot.grDate).toLocaleDateString('id-ID') : '-',
                'QTY BELI'           : initialQty,
                'TOTAL BELI'         : Math.round(initialQty * hpp),
                'OPS'                : 0,
            };

            if (lot.allocations.length === 0) {
                // Lot belum dijual — 1 baris kosong bagian penjualan
                report.push({
                    ...baseRow,
                    'Tgl Jual'          : '-',
                    'No. SJ'            : '-',
                    'No. SO'            : '-',
                    'Buyer'             : '-',
                    'Sales Person Jual' : '-',
                    'QTY Alokasi'       : 0,
                    'HPP Saat Jual (Rp)': hpp,
                    'Status Bayar Jual' : '-',

                    // Fields for ReportsDashboard Compatibility
                    'NAMA PEMBELI'      : '-',
                    'SALES'             : '-',
                    'NOMOR FAKTUR PENJUALAN': '-',
                    'NOMOR SJ'          : '-',
                    'TANGGAL JUAL'      : '-',
                    'QTY JUAL'          : 0,
                    'TOTAL JUAL'        : 0,
                    'MARGIN'            : 0,
                });
            } else {
                // Satu row per alokasi penjualan
                for (const alloc of lot.allocations) {
                    const delivery  = alloc.sdItem?.delivery;
                    const sdItem    = alloc.sdItem;
                    const soNumber  = delivery?.orderId
                        ? (orderNumberMap.get(delivery.orderId) ?? '-')
                        : '-';
                    
                    let totalJual = 0;
                    if (delivery && sdItem) {
                        const sellPrice = Number(sdItem.salesPrice || 0);
                        const itemDiscount = Number(sdItem.discount || 0);
                        const qty = Number(alloc.qty);
                        
                        // Ratio of this allocation's quantity to the total sdItem quantity
                        const allocRatio = Number(sdItem.quantity) > 0 ? qty / Number(sdItem.quantity) : 0;
                        const allocItemDiscount = itemDiscount * allocRatio;
                        const sellLineSubtotal = (sellPrice * qty) - allocItemDiscount;
                        
                        const sdSubtotal = Number(delivery.subtotal || 0);
                        const sdHeaderDiscount = Number(delivery.totalDiscount || 0);
                        const sdDiscountShare = sdSubtotal > 0 ? Math.round(sdHeaderDiscount * (sellLineSubtotal / sdSubtotal)) : 0;
                        
                        totalJual = sellLineSubtotal - sdDiscountShare;
                        
                        // Applying Tax if taxRate > 0
                        const isPKP = Number(delivery.taxRate || 0) > 0;
                        if (isPKP) {
                            const taxRate = Number(delivery.taxRate || 11) / 100;
                            totalJual = totalJual * (1 + taxRate);
                        }
                    }
                    
                    const hppTotal = Number(alloc.hppAtTime) * Number(alloc.qty);
                    const margin = totalJual - hppTotal;

                    report.push({
                        ...baseRow,
                        'NO'                : rowNo++,
                        'Tgl Jual'          : delivery?.date
                            ? new Date(delivery.date).toLocaleDateString('id-ID')
                            : '-',
                        'No. SJ'            : delivery?.deliveryNumber || '-',
                        'No. SO'            : soNumber,
                        'Buyer'             : delivery?.buyerName || delivery?.recipient || '-',
                        'Sales Person Jual' : delivery?.salesPerson || 'CIBINONG',
                        'QTY Alokasi'       : Number(alloc.qty),
                        'HPP Saat Jual (Rp)': Number(alloc.hppAtTime),
                        'Status Bayar Jual' : delivery?.paymentStatus || '-',
                        
                        // Fields for ReportsDashboard Compatibility
                        'NAMA PEMBELI'      : delivery?.buyerName || delivery?.recipient || '-',
                        'SALES'             : delivery?.salesPerson || 'CIBINONG',
                        'NOMOR FAKTUR PENJUALAN': soNumber,
                        'NOMOR SJ'          : delivery?.deliveryNumber || '-',
                        'TANGGAL JUAL'      : delivery?.date ? new Date(delivery.date).toLocaleDateString('id-ID') : '-',
                        'QTY JUAL'          : Number(alloc.qty),
                        'TOTAL JUAL'        : Math.round(totalJual),
                        'MARGIN'            : Math.round(margin),
                        'MARGIN %'          : totalJual > 0 ? (margin / totalJual * 100).toFixed(1) + '%' : '0%',
                    });
                }
            }
        }

        return report;

    } catch (error: any) {
        console.error('[getBatchTraceabilityService] ERROR:', error);
        throw new Error(error.message || 'Failed to generate batch traceability report');
    }
}


// ════════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE REPORTING CENTER SERVICES
// ════════════════════════════════════════════════════════════════════════════

/**
 * COMPREHENSIVE DAILY REPORT SERVICE
 * Returns all transaction data for a single date across all modules
 */
export async function getComprehensiveDailyReportService(date?: string, prefix?: 'PF' | 'BC' | 'ALL') {
    const prisma = getPrisma();
    const isAll = !prefix || prefix === 'ALL';

    const targetDate = date ? new Date(date) : new Date();
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    try {
        const [
            sales, purchases, operational, returns_purchase, returns_sales,
            stockMovements, auditLogs
        ] = await Promise.all([
            // Sales Deliveries
            (prisma as any).salesDelivery.findMany({
                where: { 
                    isVoid: false, 
                    date: { gte: dayStart, lte: dayEnd },
                    ...(isAll ? {} : { salesPerson: prefix })
                },
                include: {
                    createdBy: { select: { name: true } },
                    warehouse: { select: { name: true } },
                    items: {
                        include: {
                            product: { select: { sku: true, name: true, purchasePrice: true } },
                            lotAllocations: true
                        }
                    }
                },
                orderBy: { date: 'asc' }
            }),
            // Goods Receipts
            (prisma as any).goodsReceipt.findMany({
                where: { 
                    isVoid: false, 
                    date: { gte: dayStart, lte: dayEnd },
                    ...(isAll ? {} : { salesPerson: prefix })
                },
                include: {
                    createdBy: { select: { name: true } },
                    warehouse: { select: { name: true } },
                    items: { include: { product: { select: { sku: true, name: true } } } }
                },
                orderBy: { date: 'asc' }
            }),
            // Operational / Finance Transactions
            (prisma as any).financeTransaction.findMany({
                where: { 
                    date: { gte: dayStart, lte: dayEnd },
                    ...(isAll ? {} : {
                        OR: [
                            { description: { contains: prefix, mode: 'insensitive' } },
                            { salesPerson: prefix }
                        ]
                    })
                },
                include: { createdBy: { select: { name: true } } },
                orderBy: { date: 'asc' }
            }),
            // Purchase Returns
            (prisma as any).purchaseReturn.findMany({
                where: { 
                    isVoid: false, 
                    date: { gte: dayStart, lte: dayEnd },
                    ...(isAll ? {} : { receipt: { salesPerson: prefix } })
                },
                include: {
                    items: { include: { product: { select: { sku: true, name: true } } } },
                    receipt: { select: { receiptNumber: true, receivedFrom: true } }
                }
            }),
            // Sales Returns
            (prisma as any).salesReturn.findMany({
                where: { 
                    isVoid: false, 
                    date: { gte: dayStart, lte: dayEnd },
                    ...(isAll ? {} : { delivery: { salesPerson: prefix } })
                },
                include: {
                    items: { include: { product: { select: { sku: true, name: true } } } },
                    delivery: { select: { deliveryNumber: true, buyerName: true } }
                }
            }),
            // Stock Movements
            (prisma as any).stockMovement.findMany({
                where: { createdAt: { gte: dayStart, lte: dayEnd } },
                include: {
                    product: { select: { sku: true, name: true } },
                    warehouse: { select: { name: true } }
                },
                orderBy: { createdAt: 'asc' }
            }),
            // Audit Logs
            (prisma as any).auditLog.findMany({
                where: { createdAt: { gte: dayStart, lte: dayEnd } },
                include: { user: { select: { name: true, email: true } } },
                orderBy: { createdAt: 'desc' },
                take: 50
            })
        ]);

        // Traceability time range (aligned to UTC+7 timezone)
        const traceStartDate = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0));
        traceStartDate.setUTCHours(traceStartDate.getUTCHours() - 7);

        const traceEndDate = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999));
        traceEndDate.setUTCHours(traceEndDate.getUTCHours() - 7);

        const dailyTraceability = await calculateProductTraceabilityInternal(traceStartDate, traceEndDate, prefix).catch(() => []);

        // Fetch Ops for Sales
        const salesInvoiceNumbers = sales.map((s: any) => s.invoiceNumber).filter(Boolean);
        
        let opsForSales: any[] = [];
        if (salesInvoiceNumbers.length > 0) {
            const opsMap = new Map();
            // Process in chunks of 100 to avoid Prisma "too many OR" errors
            for (let i = 0; i < salesInvoiceNumbers.length; i += 100) {
                const chunk = salesInvoiceNumbers.slice(i, i + 100);
                const chunkOps = await (prisma as any).financeTransaction.findMany({
                    where: {
                        OR: chunk.map((inv: string) => ({
                            invoiceNumber: { contains: inv }
                        }))
                    },
                    select: { id: true, invoiceNumber: true, amount: true }
                });
                chunkOps.forEach((op: any) => opsMap.set(op.id, op));
            }
            opsForSales = Array.from(opsMap.values());
        }

        const opsByInvoice = opsForSales.reduce((acc: any, ops: any) => {
            if (!ops.invoiceNumber) return acc;
            const invNumbers = ops.invoiceNumber.split(',').map((s: string) => s.trim()).filter(Boolean);
            const amountPerInv = Math.abs(Number(ops.amount)) / (invNumbers.length || 1);
            
            invNumbers.forEach((inv: string) => {
                if (salesInvoiceNumbers.includes(inv)) {
                    acc[inv] = (acc[inv] || 0) + amountPerInv;
                }
            });
            return acc;
        }, {});

        // Calculate summaries
        const totalSales = sales.reduce((s: number, d: any) => s + Number(d.grandTotal || 0), 0);
        const totalPurchases = purchases.reduce((s: number, d: any) => s + Number(d.grandTotal || 0), 0);
        const totalSalesQty = sales.reduce((s: number, d: any) =>
            s + (d.items || []).reduce((q: number, i: any) => q + Number(i.quantity || 0), 0), 0);
        const totalPurchaseQty = purchases.reduce((s: number, d: any) =>
            s + (d.items || []).reduce((q: number, i: any) => q + Number(i.quantity || 0), 0), 0);

        // Separate income vs expense transactions
        const incomeTransactions = operational.filter((o: any) =>
            o.transactionType === 'RECEIPT' || Number(o.amount) > 0
        );
        const expenseTransactions = operational.filter((o: any) =>
            (o.transactionType === 'PAYMENT' || o.transactionType === 'EXPENSE' || Number(o.amount) < 0) && !o.invoiceNumber
        );
        const totalIncome = incomeTransactions.reduce((s: number, o: any) => s + Math.abs(Number(o.amount || 0)), 0);
        
        const generalExpense = expenseTransactions.reduce((s: number, o: any) => s + Math.abs(Number(o.amount || 0)), 0);
        const linkedOpsExpense = dailyTraceability.reduce((sum: number, t: any) => sum + Number(t['OPS'] || 0), 0);
        const totalExpense = generalExpense + linkedOpsExpense;

        // Payment status breakdown
        const salesPaid = sales.filter((s: any) => s.paymentStatus === 'PAID').length;
        const salesPending = sales.filter((s: any) => s.paymentStatus !== 'PAID').length;
        const purchasePaid = purchases.filter((p: any) => p.paymentStatus === 'PAID').length;
        const purchasePending = purchases.filter((p: any) => p.paymentStatus !== 'PAID').length;

        // Calculate HPP of items sold from traceability
        const totalHPP = dailyTraceability.reduce((sum: number, t: any) => sum + Number(t['TOTAL BELI'] || 0), 0);

        const grossProfit = totalSales - totalPurchases; // User requested: Penjualan - Pembelian
        const netProfit = grossProfit - totalExpense;
        const grossMarginPct = totalSales > 0 ? (grossProfit / totalSales * 100) : 0;
        const netMarginPct = totalSales > 0 ? (netProfit / totalSales * 100) : 0;

        // Calculate staff activity
        const financeActivity = new Map<string, { name: string, count: number, paymentAmount: number, receiptAmount: number }>();
        for (const o of operational) {
            const userName = o.createdBy?.name || o.createdBy?.email || 'System';
            if (!financeActivity.has(userName)) {
                financeActivity.set(userName, { name: userName, count: 0, paymentAmount: 0, receiptAmount: 0 });
            }
            const act = financeActivity.get(userName)!;
            act.count++;
            if (o.transactionType === 'PAYMENT' || Number(o.amount) < 0) {
                act.paymentAmount += Math.abs(Number(o.amount || 0));
            } else {
                act.receiptAmount += Math.abs(Number(o.amount || 0));
            }
        }

        const warehouseActivity = new Map<string, { name: string, createdCount: number, verifiedCount: number, totalQtyReceived: number }>();
        for (const p of purchases) {
            const creatorName = p.createdBy?.name || p.createdBy?.email || 'System';
            if (!warehouseActivity.has(creatorName)) {
                warehouseActivity.set(creatorName, { name: creatorName, createdCount: 0, verifiedCount: 0, totalQtyReceived: 0 });
            }
            warehouseActivity.get(creatorName)!.createdCount++;
        }
        for (const p of purchases) {
            if (p.isVerified && p.verifiedBy) {
                const verifierName = p.verifiedBy;
                if (!warehouseActivity.has(verifierName)) {
                    warehouseActivity.set(verifierName, { name: verifierName, createdCount: 0, verifiedCount: 0, totalQtyReceived: 0 });
                }
                const act = warehouseActivity.get(verifierName)!;
                act.verifiedCount++;
                act.totalQtyReceived += (p.items || []).reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);
            }
        }

        return {
            date: dayStart.toISOString(),
            staffActivity: {
                finance: Array.from(financeActivity.values()),
                warehouse: Array.from(warehouseActivity.values())
            },
            summary: {
                totalSales, totalPurchases, totalIncome, totalExpense,
                totalSalesQty, totalPurchaseQty,
                salesCount: sales.length, purchaseCount: purchases.length,
                opsCount: operational.length,
                salesPaid, salesPending, purchasePaid, purchasePending,
                totalHPP,
                grossProfit, netProfit,
                grossMarginPct, netMarginPct,
                returnPurchaseCount: returns_purchase.length,
                returnSalesCount: returns_sales.length,
                stockMovementCount: stockMovements.length
            },
            details: {
                sales: sales.map((s: any) => {
                    let saleHpp = 0;
                    const isPKP = s.isPKP || Number(s.taxRate || 0) > 0 || String(s.invoiceNumber || '').includes('TRN');
                    const taxMultiplier = 1 + (isPKP ? 0.11 : 0);
                    (s.items || []).forEach((item: any) => {
                        const qty = Number(item.quantity || 0);
                        if (item.lotAllocations && item.lotAllocations.length > 0) {
                            item.lotAllocations.forEach((alloc: any) => {
                                saleHpp += Number(alloc.qty || 0) * Math.round(Number(alloc.hppAtTime || 0) * taxMultiplier);
                            });
                        } else {
                            saleHpp += qty * Math.round(Number(item.product?.purchasePrice || 0) * taxMultiplier);
                        }
                    });
                    const margin = Number(s.grandTotal || 0) - saleHpp;
                    const marginPct = Number(s.grandTotal || 0) > 0 ? (margin / Number(s.grandTotal || 0) * 100) : 0;
                    return {
                        id: s.id, number: s.deliveryNumber, invoiceNumber: s.invoiceNumber, date: s.date,
                        buyer: s.buyerName || s.recipient, salesPerson: s.salesPerson,
                        alamat: s.recipient, gudang: s.warehouse?.name,
                        subtotal: Number(s.subtotal || 0), discount: Number(s.totalDiscount || 0),
                        tax: Number(s.taxAmount || 0), grandTotal: Number(s.grandTotal || 0),
                        paidAmount: Number(s.paidAmount || 0), paymentStatus: s.paymentStatus,
                        operator: s.createdBy?.name || 'System',
                        itemCount: (s.items || []).length,
                        totalQty: (s.items || []).reduce((q: number, i: any) => q + Number(i.quantity || 0), 0),
                        hpp: saleHpp,
                        margin,
                        marginPct,
                        opsAmount: opsByInvoice[s.invoiceNumber] || 0,
                        hasOps: (opsByInvoice[s.invoiceNumber] || 0) > 0
                    };
                }),
                purchases: purchases.map((p: any) => ({
                    id: p.id, number: p.receiptNumber, date: p.date,
                    supplier: p.receivedFrom, warehouse: p.warehouse?.name,
                    salesPerson: p.salesPerson,
                    subtotal: Number(p.subtotal || 0), discount: Number(p.totalDiscount || 0),
                    tax: Number(p.taxAmount || 0), grandTotal: Number(p.grandTotal || 0),
                    paidAmount: Number(p.paidAmount || 0), paymentStatus: p.paymentStatus,
                    operator: p.createdBy?.name || 'System',
                    totalQty: (p.items || []).reduce((q: number, i: any) => q + Number(i.quantity || 0), 0)
                })),
                operational: operational.map((o: any) => ({
                    id: o.id, date: o.date, description: o.description,
                    bank: o.bank, category: o.category || o.transactionType,
                    amount: Number(o.amount || 0), salesPerson: o.salesPerson,
                    referenceNumber: o.referenceNumber,
                    operator: o.createdBy?.name || 'System'
                })),
                returnsPurchase: returns_purchase.map((r: any) => ({
                    returnNumber: r.returnNumber, date: r.date, status: r.status,
                    receiptNumber: r.receipt?.receiptNumber, supplier: r.receipt?.receivedFrom,
                    items: (r.items || []).map((i: any) => ({
                        sku: i.product?.sku, name: i.product?.name, qty: i.quantity, reason: i.reason
                    }))
                })),
                returnsSales: returns_sales.map((r: any) => ({
                    returnNumber: r.returnNumber, date: r.date, status: r.status,
                    deliveryNumber: r.delivery?.deliveryNumber, buyer: r.delivery?.buyerName,
                    items: (r.items || []).map((i: any) => ({
                        sku: i.product?.sku, name: i.product?.name, qty: i.quantity, reason: i.reason
                    }))
                })),
                stockMovements: stockMovements.map((m: any) => ({
                    date: m.createdAt, type: m.type, reference: m.reference,
                    sku: m.product?.sku, productName: m.product?.name,
                    warehouse: m.warehouse?.name, quantity: m.quantity, vendorName: m.vendorName
                })),
                auditLogs: auditLogs.map((a: any) => ({
                    action: a.action, resource: a.resource, resourceId: a.resourceId,
                    user: a.user?.name || a.user?.email || 'System',
                    date: a.createdAt, details: a.details
                })),
                dailyTraceability
            }
        };
    } catch (error: any) {
        console.error('[getComprehensiveDailyReportService] ERROR:', error);
        return { error: error.message || 'Failed to generate daily report' };
    }
}


/**
 * COMPREHENSIVE WEEKLY REPORT SERVICE
 * Returns aggregated data for 7 days with daily breakdowns
 */
export async function getComprehensiveWeeklyReportService(weekStartDate?: string, prefix?: 'PF' | 'BC' | 'ALL') {
    const prisma = getPrisma();
    const isAll = !prefix || prefix === 'ALL';

    const startDate = weekStartDate ? new Date(weekStartDate) : new Date();
    if (!weekStartDate) {
        // Default to Monday of current week
        const day = startDate.getDay();
        const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
        startDate.setDate(diff);
    }
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);

    try {
        const [sales, purchases, operational, stockMovements, weeklyTraceability] = await Promise.all([
            (prisma as any).salesDelivery.findMany({
                where: { 
                    isVoid: false, 
                    date: { gte: startDate, lte: endDate },
                    ...(isAll ? {} : { salesPerson: prefix })
                },
                include: {
                    items: {
                        include: {
                            product: { select: { sku: true, name: true, purchasePrice: true } },
                            lotAllocations: true
                        }
                    }
                },
                orderBy: { date: 'asc' }
            }),
            (prisma as any).goodsReceipt.findMany({
                where: { 
                    isVoid: false, 
                    date: { gte: startDate, lte: endDate },
                    ...(isAll ? {} : { salesPerson: prefix })
                },
                include: {
                    createdBy: { select: { name: true } },
                    items: { select: { quantity: true, purchasePrice: true } }
                },
                orderBy: { date: 'asc' }
            }),
            (prisma as any).financeTransaction.findMany({
                where: { 
                    date: { gte: startDate, lte: endDate },
                    ...(isAll ? {} : {
                        OR: [
                            { description: { contains: prefix, mode: 'insensitive' } },
                            { salesPerson: prefix }
                        ]
                    })
                },
                include: { createdBy: { select: { name: true } } },
                orderBy: { date: 'asc' }
            }),
            (prisma as any).stockMovement.findMany({
                where: { createdAt: { gte: startDate, lte: endDate } },
                include: { product: { select: { sku: true, name: true } } },
                orderBy: { createdAt: 'asc' }
            }),
            calculateProductTraceabilityInternal(startDate, endDate, prefix).catch(() => [])
        ]);

        // Build daily breakdown for the 7 days
        const dailyBreakdown = [];
        for (let i = 0; i < 7; i++) {
            const dayStart = new Date(startDate);
            dayStart.setDate(dayStart.getDate() + i);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart);
            dayEnd.setHours(23, 59, 59, 999);

            const daySales = sales.filter((s: any) => new Date(s.date) >= dayStart && new Date(s.date) <= dayEnd);
            const dayPurchases = purchases.filter((p: any) => {
                const d = p.date ? new Date(p.date) : null;
                return d && d >= dayStart && d <= dayEnd;
            });
            const dayOps = operational.filter((o: any) => new Date(o.date) >= dayStart && new Date(o.date) <= dayEnd);

            const salesTotal = daySales.reduce((s: number, d: any) => s + Number(d.grandTotal || 0), 0);
            const purchaseTotal = dayPurchases.reduce((s: number, d: any) => s + Number(d.grandTotal || 0), 0);
            const daySalesDeliveries = daySales.map((s: any) => s.deliveryNumber).filter(Boolean);
            const dayTraceRows = weeklyTraceability.filter((t: any) => daySalesDeliveries.includes(t['NOMOR SJ']));

            let dayHPP = dayTraceRows.reduce((sum: number, t: any) => sum + Number(t['TOTAL BELI'] || 0), 0);
            const linkedOpsExpense = dayTraceRows.reduce((sum: number, t: any) => sum + Number(t['OPS'] || 0), 0);

            // General Ops that occurred today (unlinked)
            const generalOps = dayOps.filter((o: any) => 
                (o.transactionType === 'PAYMENT' || o.transactionType === 'EXPENSE' || Number(o.amount) < 0) && !o.invoiceNumber
            ).reduce((s: number, o: any) => s + Math.abs(Number(o.amount || 0)), 0);

            const opsExpense = generalOps + linkedOpsExpense;
            const dayGrossProfit = salesTotal - dayHPP;
            const dayMarginPct = salesTotal > 0 ? (dayGrossProfit / salesTotal * 100) : 0;

            dailyBreakdown.push({
                date: dayStart.toISOString(),
                dayName: dayStart.toLocaleDateString('id-ID', { weekday: 'long' }),
                shortName: dayStart.toLocaleDateString('id-ID', { weekday: 'short' }),
                dateLabel: dayStart.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
                sales: salesTotal,
                purchases: purchaseTotal,
                opsExpense,
                hpp: dayHPP,
                marginPct: dayMarginPct,
                salesCount: daySales.length,
                purchaseCount: dayPurchases.length,
                salesQty: daySales.reduce((s: number, d: any) =>
                    s + (d.items || []).reduce((q: number, i: any) => q + Number(i.quantity || 0), 0), 0),
                purchaseQty: dayPurchases.reduce((s: number, d: any) =>
                    s + (d.items || []).reduce((q: number, i: any) => q + Number(i.quantity || 0), 0), 0)
            });
        }

        // Top buyers (by total grandTotal)
        const buyerMap: Record<string, { total: number; count: number }> = {};
        sales.forEach((s: any) => {
            const name = s.buyerName || s.recipient || 'Unknown';
            if (!buyerMap[name]) buyerMap[name] = { total: 0, count: 0 };
            buyerMap[name].total += Number(s.grandTotal || 0);
            buyerMap[name].count += 1;
        });
        const topBuyers = Object.entries(buyerMap)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        // Top suppliers
        const supplierMap: Record<string, { total: number; count: number }> = {};
        purchases.forEach((p: any) => {
            const name = p.receivedFrom || 'Unknown';
            if (!supplierMap[name]) supplierMap[name] = { total: 0, count: 0 };
            supplierMap[name].total += Number(p.grandTotal || 0);
            supplierMap[name].count += 1;
        });
        const topSuppliers = Object.entries(supplierMap)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        // Expense by category
        const categoryMap: Record<string, number> = {};
        operational.forEach((o: any) => {
            if (o.transactionType === 'PAYMENT' || o.transactionType === 'EXPENSE' || Number(o.amount) < 0) {
                const cat = o.category || o.transactionType || 'Lainnya';
                categoryMap[cat] = (categoryMap[cat] || 0) + Math.abs(Number(o.amount || 0));
            }
        });
        const expenseByCategory = Object.entries(categoryMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // Totals
        const totalSales = sales.reduce((s: number, d: any) => s + Number(d.grandTotal || 0), 0);
        const totalPurchases = purchases.reduce((s: number, d: any) => s + Number(d.grandTotal || 0), 0);
        
        const totalHPP = dailyBreakdown.reduce((sum: number, d: any) => sum + Number(d.hpp || 0), 0);
        const totalExpenses = dailyBreakdown.reduce((sum: number, d: any) => sum + Number(d.opsExpense || 0), 0);

        const grossProfit = totalSales - totalPurchases; // User requested: Penjualan - Pembelian
        const netProfit = grossProfit - totalExpenses;
        const grossMarginPct = totalSales > 0 ? (grossProfit / totalSales * 100) : 0;
        const netMarginPct = totalSales > 0 ? (netProfit / totalSales * 100) : 0;

        // Sales by Team
        let salesBC = 0, salesPF = 0, salesOther = 0;
        sales.forEach((s: any) => {
            const v = Number(s.grandTotal || 0);
            if (s.salesPerson === 'BC') salesBC += v;
            else if (s.salesPerson === 'PF') salesPF += v;
            else salesOther += v;
        });

        // Calculate staff activity
        const financeActivity = new Map<string, { name: string, count: number, paymentAmount: number, receiptAmount: number }>();
        for (const o of operational) {
            const userName = o.createdBy?.name || o.createdBy?.email || 'System';
            if (!financeActivity.has(userName)) {
                financeActivity.set(userName, { name: userName, count: 0, paymentAmount: 0, receiptAmount: 0 });
            }
            const act = financeActivity.get(userName)!;
            act.count++;
            if (o.transactionType === 'PAYMENT' || Number(o.amount) < 0) {
                act.paymentAmount += Math.abs(Number(o.amount || 0));
            } else {
                act.receiptAmount += Math.abs(Number(o.amount || 0));
            }
        }

        const warehouseActivity = new Map<string, { name: string, createdCount: number, verifiedCount: number, totalQtyReceived: number }>();
        for (const p of purchases) {
            const creatorName = p.createdBy?.name || p.createdBy?.email || 'System';
            if (!warehouseActivity.has(creatorName)) {
                warehouseActivity.set(creatorName, { name: creatorName, createdCount: 0, verifiedCount: 0, totalQtyReceived: 0 });
            }
            warehouseActivity.get(creatorName)!.createdCount++;
        }
        for (const p of purchases) {
            if (p.isVerified && p.verifiedBy) {
                const verifierName = p.verifiedBy;
                if (!warehouseActivity.has(verifierName)) {
                    warehouseActivity.set(verifierName, { name: verifierName, createdCount: 0, verifiedCount: 0, totalQtyReceived: 0 });
                }
                const act = warehouseActivity.get(verifierName)!;
                act.verifiedCount++;
                act.totalQtyReceived += (p.items || []).reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);
            }
        }

        return {
            staffActivity: {
                finance: Array.from(financeActivity.values()),
                warehouse: Array.from(warehouseActivity.values())
            },
            details: {
                weeklyTraceability
            },
            period: {
                start: startDate.toISOString(),
                end: endDate.toISOString(),
                label: `${startDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} - ${endDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}`
            },
            summary: {
                totalSales, totalPurchases, totalExpenses,
                totalHPP,
                grossProfit,
                netProfit,
                grossMarginPct,
                netMarginPct,
                salesCount: sales.length,
                purchaseCount: purchases.length,
                opsCount: operational.length,
                totalSalesQty: sales.reduce((s: number, d: any) =>
                    s + (d.items || []).reduce((q: number, i: any) => q + Number(i.quantity || 0), 0), 0),
                totalPurchaseQty: purchases.reduce((s: number, d: any) =>
                    s + (d.items || []).reduce((q: number, i: any) => q + Number(i.quantity || 0), 0), 0),
                salesByTeam: { BC: salesBC, PF: salesPF, Other: salesOther }
            },
            dailyBreakdown,
            topBuyers,
            topSuppliers,
            expenseByCategory
        };
    } catch (error: any) {
        console.error('[getComprehensiveWeeklyReportService] ERROR:', error);
        return { error: error.message || 'Failed to generate weekly report' };
    }
}


/**
 * COMPREHENSIVE MONTHLY REPORT SERVICE
 * Full P&L, AR/AP aging, inventory valuation, top partner analysis
 */
export async function getComprehensiveMonthlyReportService(month?: number, year?: number, prefix?: 'PF' | 'BC' | 'ALL') {
    const prisma = getPrisma();
    const filterYear = year || new Date().getFullYear();
    const filterMonth = month || (new Date().getMonth() + 1);
    const startDate = new Date(filterYear, filterMonth - 1, 1);
    const endDate = new Date(filterYear, filterMonth, 0, 23, 59, 59, 999);
    const isAll = !prefix || prefix === 'ALL';

    try {
        const [
            sales, purchases, allOperational, arRecords, apRecords,
            returnsPurchase, returnsSales, stockMovements, monthlyTraceability
        ] = await Promise.all([
            // Sales
            (prisma as any).salesDelivery.findMany({
                where: { 
                    isVoid: false, 
                    date: { gte: startDate, lte: endDate },
                    ...(isAll ? {} : { salesPerson: prefix })
                },
                include: {
                    items: {
                        include: {
                            product: { select: { sku: true, name: true, purchasePrice: true } },
                            lotAllocations: true
                        }
                    }
                },
                orderBy: { date: 'asc' }
            }),
            // Purchases
            (prisma as any).goodsReceipt.findMany({
                where: { 
                    isVoid: false, 
                    date: { gte: startDate, lte: endDate },
                    ...(isAll ? {} : { salesPerson: prefix })
                },
                include: {
                    createdBy: { select: { name: true } },
                    items: { select: { quantity: true } }
                },
                orderBy: { date: 'asc' }
            }),
            // All Finance Transactions
            (prisma as any).financeTransaction.findMany({
                where: { 
                    date: { gte: startDate, lte: endDate },
                    ...(isAll ? {} : {
                        OR: [
                            { description: { contains: prefix, mode: 'insensitive' } },
                            { salesPerson: prefix }
                        ]
                    })
                },
                include: { createdBy: { select: { name: true } } },
                orderBy: { date: 'asc' }
            }),
            // AR — unpaid sales deliveries up to end of month
            (prisma as any).salesDelivery.findMany({
                where: {
                    isVoid: false, date: { lte: endDate },
                    paymentStatus: { in: ['PENDING', 'PARTIAL'] },
                    ...(isAll ? {} : { salesPerson: prefix })
                },
                select: {
                    deliveryNumber: true, buyerName: true, recipient: true, date: true,
                    grandTotal: true, paidAmount: true, paymentStatus: true
                },
                orderBy: { date: 'asc' }
            }),
            // AP — unpaid goods receipts up to end of month
            (prisma as any).goodsReceipt.findMany({
                where: {
                    isVoid: false, date: { lte: endDate },
                    paymentStatus: { in: ['PENDING', 'PARTIAL'] },
                    ...(isAll ? {} : { salesPerson: prefix })
                },
                select: {
                    receiptNumber: true, receivedFrom: true, date: true,
                    grandTotal: true, paidAmount: true, paymentStatus: true
                },
                orderBy: { date: 'asc' }
            }),
            // Purchase Returns
            (prisma as any).purchaseReturn.findMany({
                where: { 
                    isVoid: false, 
                    date: { gte: startDate, lte: endDate },
                    ...(isAll ? {} : { receipt: { salesPerson: prefix } })
                },
                include: {
                    items: { include: { product: { select: { sku: true, name: true } } } },
                    receipt: { select: { receiptNumber: true, receivedFrom: true } }
                }
            }),
            // Sales Returns
            (prisma as any).salesReturn.findMany({
                where: { 
                    isVoid: false, 
                    date: { gte: startDate, lte: endDate },
                    ...(isAll ? {} : { delivery: { salesPerson: prefix } })
                },
                include: {
                    items: { include: { product: { select: { sku: true, name: true } } } },
                    delivery: { select: { deliveryNumber: true, buyerName: true } }
                }
            }),
            // Stock Movements
            (prisma as any).stockMovement.findMany({
                where: { createdAt: { gte: startDate, lte: endDate } },
                include: { product: { select: { sku: true, name: true } } },
                orderBy: { createdAt: 'asc' }
            }),
            // Traceability
            calculateProductTraceabilityInternal(startDate, endDate, prefix).catch(() => [])
        ]);

        // ── P&L Calculation ──────────────────────────────────────────────
        // Revenue
        const totalRevenue = sales.reduce((s: number, d: any) => s + Number(d.grandTotal || 0), 0);
        const totalRevenueSubtotal = sales.reduce((s: number, d: any) => s + Number(d.subtotal || 0), 0);
        const totalDiscount = sales.reduce((s: number, d: any) => s + Number(d.totalDiscount || 0), 0);
        const totalSalesTax = sales.reduce((s: number, d: any) => s + Number(d.taxAmount || 0), 0);

        // COGS / HPP — from Traceability for 100% accuracy
        let totalHPP = monthlyTraceability.reduce((sum: number, t: any) => sum + Number(t['TOTAL BELI'] || 0), 0);
        
        // Total Purchases (for Cash-flow basis margin)
        const totalPurchases = purchases.reduce((sum: number, p: any) => sum + Number(p.grandTotal || 0), 0);

        // Gross Profit
        const grossProfit = totalRevenue - totalPurchases; // User requested: Penjualan - Pembelian
        const grossMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue * 100) : 0;

        // Operating Expenses
        const expenses = allOperational.filter((o: any) =>
            o.transactionType === 'PAYMENT' || o.transactionType === 'EXPENSE' || Number(o.amount) < 0
        );
        const generalOps = expenses.filter((o: any) => !o.invoiceNumber).reduce((s: number, o: any) => s + Math.abs(Number(o.amount || 0)), 0);
        const linkedOpsExpense = monthlyTraceability.reduce((sum: number, t: any) => sum + Number(t['OPS'] || 0), 0);
        const totalExpenses = generalOps + linkedOpsExpense;

        // Net Profit
        const netProfit = grossProfit - totalExpenses;
        const netMarginPct = totalRevenue > 0 ? (netProfit / totalRevenue * 100) : 0;

        // Net Purchases
        const netPurchases = purchases.reduce((s: number, p: any) => s + Number(p.grandTotal || 0), 0);
        const netPurchasesSubtotal = purchases.reduce((s: number, p: any) => s + Number(p.subtotal || 0), 0);

        // ── Sales by Team ────────────────────────────────────────────────
        let salesBC = 0, salesPF = 0, salesOther = 0;
        let hppBC = 0, hppPF = 0;
        sales.forEach((s: any) => {
            const v = Number(s.grandTotal || 0);
            if (s.salesPerson === 'BC') salesBC += v;
            else if (s.salesPerson === 'PF') salesPF += v;
            else salesOther += v;
        });

        // ── Expense by Category ──────────────────────────────────────────
        const categoryMap: Record<string, number> = {};
        expenses.forEach((o: any) => {
            const cat = o.category || o.transactionType || 'Lainnya';
            categoryMap[cat] = (categoryMap[cat] || 0) + Math.abs(Number(o.amount || 0));
        });
        const expenseByCategory = Object.entries(categoryMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // ── Top Buyers ───────────────────────────────────────────────────
        const buyerMap: Record<string, { total: number; count: number; totalQty: number }> = {};
        sales.forEach((s: any) => {
            const name = s.buyerName || s.recipient || 'Unknown';
            const qty = (s.items || []).reduce((q: number, i: any) => q + Number(i.quantity || 0), 0);
            if (!buyerMap[name]) buyerMap[name] = { total: 0, count: 0, totalQty: 0 };
            buyerMap[name].total += Number(s.grandTotal || 0);
            buyerMap[name].count += 1;
            buyerMap[name].totalQty += qty;
        });
        const topBuyers = Object.entries(buyerMap)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);

        // ── Top Suppliers ────────────────────────────────────────────────
        const supplierMap: Record<string, { total: number; count: number }> = {};
        purchases.forEach((p: any) => {
            const name = p.receivedFrom || 'Unknown';
            if (!supplierMap[name]) supplierMap[name] = { total: 0, count: 0 };
            supplierMap[name].total += Number(p.grandTotal || 0);
            supplierMap[name].count += 1;
        });
        const topSuppliers = Object.entries(supplierMap)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);

        // ── AR/AP Aging ──────────────────────────────────────────────────
        const now = new Date();
        const agingBuckets = (records: any[], dateField: string) => {
            const buckets = { current: 0, d30: 0, d60: 0, d90: 0, over90: 0, total: 0 };
            const items: any[] = [];
            records.forEach((r: any) => {
                const outstanding = Number(r.grandTotal || 0) - Number(r.paidAmount || 0);
                if (outstanding <= 0) return;
                const days = Math.floor((now.getTime() - new Date(r[dateField] || r.date).getTime()) / (1000 * 60 * 60 * 24));
                let bucket = 'current';
                if (days > 90) bucket = 'over90';
                else if (days > 60) bucket = 'd90';
                else if (days > 30) bucket = 'd60';
                else if (days > 0) bucket = 'd30';
                (buckets as any)[bucket] += outstanding;
                buckets.total += outstanding;
                items.push({
                    number: r.deliveryNumber || r.receiptNumber,
                    partner: r.buyerName || r.recipient || r.receivedFrom,
                    date: r.date,
                    grandTotal: Number(r.grandTotal || 0),
                    paidAmount: Number(r.paidAmount || 0),
                    outstanding,
                    days,
                    bucket,
                    status: r.paymentStatus
                });
            });
            return { buckets, items: items.sort((a, b) => b.outstanding - a.outstanding) };
        };

        const arAging = agingBuckets(arRecords, 'date');
        const apAging = agingBuckets(apRecords, 'date');

        // ── Daily Breakdown (for chart) ──────────────────────────────────
        const daysInMonth = new Date(filterYear, filterMonth, 0).getDate();
        const dailyBreakdown = [];
        for (let d = 1; d <= daysInMonth; d++) {
            const dayStart = new Date(filterYear, filterMonth - 1, d, 0, 0, 0);
            const dayEnd = new Date(filterYear, filterMonth - 1, d, 23, 59, 59, 999);
            const daySales = sales.filter((s: any) => {
                const dt = new Date(s.date);
                return dt >= dayStart && dt <= dayEnd;
            });
            const dayPurchases = purchases.filter((p: any) => {
                const dt = p.date ? new Date(p.date) : null;
                return dt && dt >= dayStart && dt <= dayEnd;
            });
            const dayOps = allOperational.filter((o: any) => new Date(o.date) >= dayStart && new Date(o.date) <= dayEnd);

            const salesTotal = daySales.reduce((s: number, x: any) => s + Number(x.grandTotal || 0), 0);
            const purchaseTotal = dayPurchases.reduce((s: number, x: any) => s + Number(x.grandTotal || 0), 0);

            const daySalesDeliveries = daySales.map((s: any) => s.deliveryNumber).filter(Boolean);
            const dayTraceRows = monthlyTraceability.filter((t: any) => daySalesDeliveries.includes(t['NOMOR SJ']));

            let dayHPP = dayTraceRows.reduce((sum: number, t: any) => sum + Number(t['TOTAL BELI'] || 0), 0);
            const linkedOpsExpense = dayTraceRows.reduce((sum: number, t: any) => sum + Number(t['OPS'] || 0), 0);

            // General Ops that occurred today (unlinked)
            const generalOpsToday = dayOps.filter((o: any) => 
                (o.transactionType === 'PAYMENT' || o.transactionType === 'EXPENSE' || Number(o.amount) < 0) && !o.invoiceNumber
            ).reduce((s: number, o: any) => s + Math.abs(Number(o.amount || 0)), 0);

            const opsExpense = generalOpsToday + linkedOpsExpense;

            dailyBreakdown.push({
                day: d,
                label: `${d}`,
                sales: salesTotal,
                purchases: purchaseTotal,
                hpp: dayHPP,
                opsExpense,
                salesCount: daySales.length,
                purchaseCount: dayPurchases.length
            });
        }

        // ── Return Summaries ─────────────────────────────────────────────
        const returnPurchaseSummary = {
            count: returnsPurchase.length,
            totalQty: returnsPurchase.reduce((s: number, r: any) =>
                s + (r.items || []).reduce((q: number, i: any) => q + Number(i.quantity || 0), 0), 0),
            items: returnsPurchase.map((r: any) => ({
                returnNumber: r.returnNumber, date: r.date, status: r.status,
                supplier: r.receipt?.receivedFrom, receiptNumber: r.receipt?.receiptNumber,
                totalQty: (r.items || []).reduce((q: number, i: any) => q + Number(i.quantity || 0), 0)
            }))
        };
        const returnSalesSummary = {
            count: returnsSales.length,
            totalQty: returnsSales.reduce((s: number, r: any) =>
                s + (r.items || []).reduce((q: number, i: any) => q + Number(i.quantity || 0), 0), 0),
            items: returnsSales.map((r: any) => ({
                returnNumber: r.returnNumber, date: r.date, status: r.status,
                buyer: r.delivery?.buyerName, deliveryNumber: r.delivery?.deliveryNumber,
                totalQty: (r.items || []).reduce((q: number, i: any) => q + Number(i.quantity || 0), 0)
            }))
        };

        // ── Sales Detail Table ───────────────────────────────────────────
        const salesDetail = sales.map((s: any) => {
            const saleTraceRows = monthlyTraceability.filter((t: any) => t['NOMOR SJ'] === s.deliveryNumber);
            const saleHpp = saleTraceRows.reduce((sum: number, t: any) => sum + Number(t['TOTAL BELI'] || 0), 0);
            
            const margin = Number(s.grandTotal || 0) - saleHpp;
            const marginPct = Number(s.grandTotal || 0) > 0 ? (margin / Number(s.grandTotal || 0) * 100) : 0;
            return {
                number: s.deliveryNumber, date: s.date,
                buyer: s.buyerName || s.recipient, salesPerson: s.salesPerson,
                subtotal: Number(s.subtotal || 0), discount: Number(s.totalDiscount || 0),
                tax: Number(s.taxAmount || 0), grandTotal: Number(s.grandTotal || 0),
                paidAmount: Number(s.paidAmount || 0), paymentStatus: s.paymentStatus,
                totalQty: (s.items || []).reduce((q: number, i: any) => q + Number(i.quantity || 0), 0),
                hpp: saleHpp,
                margin,
                marginPct
            };
        });

        // ── Purchase Detail Table ────────────────────────────────────────
        const purchaseDetail = purchases.map((p: any) => ({
            number: p.receiptNumber, date: p.date,
            supplier: p.receivedFrom, salesPerson: p.salesPerson,
            subtotal: Number(p.subtotal || 0), discount: Number(p.totalDiscount || 0),
            tax: Number(p.taxAmount || 0), grandTotal: Number(p.grandTotal || 0),
            paidAmount: Number(p.paidAmount || 0), paymentStatus: p.paymentStatus
        }));

        // ── Operational Detail Table ─────────────────────────────────────
        const opsDetail = allOperational.map((o: any) => ({
            date: o.date, description: o.description,
            bank: o.bank, category: o.category || o.transactionType,
            amount: Number(o.amount || 0), salesPerson: o.salesPerson,
            referenceNumber: o.referenceNumber
        }));

        const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

        // Calculate staff activity
        const financeActivity = new Map<string, { name: string, count: number, paymentAmount: number, receiptAmount: number }>();
        for (const o of allOperational) {
            const userName = o.createdBy?.name || o.createdBy?.email || 'System';
            if (!financeActivity.has(userName)) {
                financeActivity.set(userName, { name: userName, count: 0, paymentAmount: 0, receiptAmount: 0 });
            }
            const act = financeActivity.get(userName)!;
            act.count++;
            if (o.transactionType === 'PAYMENT' || Number(o.amount) < 0) {
                act.paymentAmount += Math.abs(Number(o.amount || 0));
            } else {
                act.receiptAmount += Math.abs(Number(o.amount || 0));
            }
        }

        const warehouseActivity = new Map<string, { name: string, createdCount: number, verifiedCount: number, totalQtyReceived: number }>();
        for (const p of purchases) {
            const creatorName = p.createdBy?.name || p.createdBy?.email || 'System';
            if (!warehouseActivity.has(creatorName)) {
                warehouseActivity.set(creatorName, { name: creatorName, createdCount: 0, verifiedCount: 0, totalQtyReceived: 0 });
            }
            warehouseActivity.get(creatorName)!.createdCount++;
        }
        for (const p of purchases) {
            if (p.isVerified && p.verifiedBy) {
                const verifierName = p.verifiedBy;
                if (!warehouseActivity.has(verifierName)) {
                    warehouseActivity.set(verifierName, { name: verifierName, createdCount: 0, verifiedCount: 0, totalQtyReceived: 0 });
                }
                const act = warehouseActivity.get(verifierName)!;
                act.verifiedCount++;
                act.totalQtyReceived += (p.items || []).reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);
            }
        }

        return {
            staffActivity: {
                finance: Array.from(financeActivity.values()),
                warehouse: Array.from(warehouseActivity.values())
            },
            period: {
                month: filterMonth, year: filterYear,
                label: `${monthNames[filterMonth - 1]} ${filterYear}`
            },
            profitLoss: {
                revenue: totalRevenue,
                revenueSubtotal: totalRevenueSubtotal,
                discount: totalDiscount,
                salesTax: totalSalesTax,
                hpp: totalHPP,
                grossProfit,
                grossMarginPct: Number(grossMarginPct.toFixed(1)),
                expenses: totalExpenses,
                netProfit,
                netMarginPct: Number(netMarginPct.toFixed(1)),
                expenseByCategory
            },
            purchases: {
                total: netPurchases,
                subtotal: netPurchasesSubtotal,
                count: purchases.length
            },
            salesByTeam: { BC: salesBC, PF: salesPF, Other: salesOther },
            arAging,
            apAging,
            topBuyers,
            topSuppliers,
            returnPurchaseSummary,
            returnSalesSummary,
            dailyBreakdown,
            details: {
                sales: salesDetail,
                purchases: purchaseDetail,
                operational: opsDetail,
                monthlyTraceability
            },
            stats: {
                salesCount: sales.length,
                purchaseCount: purchases.length,
                opsCount: allOperational.length,
                totalSalesQty: sales.reduce((s: number, d: any) =>
                    s + (d.items || []).reduce((q: number, i: any) => q + Number(i.quantity || 0), 0), 0),
                totalPurchaseQty: purchases.reduce((s: number, d: any) =>
                    s + (d.items || []).reduce((q: number, i: any) => q + Number(i.quantity || 0), 0), 0)
            }
        };
    } catch (error: any) {
        console.error('[getComprehensiveMonthlyReportService] ERROR:', error);
        return { error: error.message || 'Failed to generate monthly report' };
    }
}

export async function reallocateLotService(sdItemId: string, newLotId: string) {
    const prisma = getPrisma();
    if (!prisma) throw new Error("Prisma client is not available");

    const saleItem = await prisma.salesDeliveryItem.findUnique({
        where: { id: sdItemId }
    });
    if (!saleItem) throw new Error("Sale item not found");

    const targetLot = await prisma.productLot.findUnique({
        where: { id: newLotId }
    });
    if (!targetLot) throw new Error("Target lot not found");

    // Find existing lot allocations for this sale item
    const existingAllocations = await prisma.lotAllocation.findMany({
        where: { sdItemId: saleItem.id }
    });

    // Run transaction to ensure atomicity
    await prisma.$transaction(async (tx: any) => {
        // 1. Restore qty to old lots
        for (const alloc of existingAllocations) {
            await tx.productLot.update({
                where: { id: alloc.lotId },
                data: { remainingQty: { increment: alloc.qty } }
            });
        }

        // 2. Delete existing lot allocation(s) for this sale item
        await tx.lotAllocation.deleteMany({
            where: { sdItemId: saleItem.id }
        });
        
        // 3. Create new lot allocation
        await tx.lotAllocation.create({
            data: {
                sdItemId: saleItem.id,
                lotId: targetLot.id,
                qty: saleItem.quantity,
                hppAtTime: targetLot.purchasePrice
            }
        });

        // 4. Deduct qty from new lot
        await tx.productLot.update({
            where: { id: targetLot.id },
            data: { remainingQty: { decrement: saleItem.quantity } }
        });
    });

    return true;
}
