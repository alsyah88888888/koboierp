import { getPrisma } from "@/lib/prisma";

/**
 * FIFO TRACEABILITY SERVICE — v4 (Format Spreadsheet)
 * Kolom disesuaikan persis dengan format gambar referensi:
 * NO | TANGGAL | F.PAJAK | NOMOR | TANGGAL(beli) | NAMA PEMBELI | BARCODE |
 * KETERANGAN ITEM | SALES | [BELI: QTY/HARGA/OPS/TOTAL] | [JUAL: NAMA/QTY/HARGA/TOTAL] |
 * MARGIN | MARGIN% | DPP | PPH | TOTAL | NO.PO | [FAKTUR: NO.FAKTUR/NO.PAJAK] | PAYMENT | DATE | PER/CT
 */
export async function getProductTraceabilityService(month?: number, year?: number) {
    const prisma = getPrisma();

    const filterYear  = year  || new Date().getFullYear();
    const filterMonth = month || (new Date().getMonth() + 1);
    const startDate   = new Date(filterYear, filterMonth - 1, 1);
    const endDate     = new Date(filterYear, filterMonth, 0, 23, 59, 59);

    try {
        const rows: Record<string, any>[] = [];

        // ════════════════════════════════════════════════════════════
        // PRE-FETCH: SalesDeliveries + SO map + PATH A GR data
        // ════════════════════════════════════════════════════════════
        const deliveries = await (prisma as any).salesDelivery.findMany({
            where: { isVoid: false, date: { gte: startDate, lte: endDate } },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                sku: true, name: true, uom: true,
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

        // PATH A: Collect GR numbers from lot allocations
        const grNumbersPathA = new Set<string>();
        for (const sd of deliveries) {
            for (const sdItem of sd.items) {
                for (const alloc of sdItem.lotAllocations ?? []) {
                    if (alloc.lot?.grNumber) grNumbersPathA.add(alloc.lot.grNumber);
                }
            }
        }
        const grDataPathA = grNumbersPathA.size > 0
            ? await (prisma as any).goodsReceipt.findMany({
                where: { receiptNumber: { in: [...grNumbersPathA] } },
                select: {
                    receiptNumber: true, paymentStatus: true, salesPerson: true,
                    formNumber: true, taxInvoiceDate: true, taxInvoiceNumber: true,
                    totalDiscount: true
                }
            })
            : [];
        const grMapA = new Map<string, any>(grDataPathA.map((g: any) => [g.receiptNumber, g]));

        // PATH B / edge-case: Pre-fetch FIFO lots (batch, no N+1)
        const productIdsNeedFifo = new Set<string>();
        for (const sd of deliveries) {
            for (const sdItem of sd.items) {
                const hasAlloc = sdItem.lotAllocations?.length > 0;
                if (!hasAlloc) {
                    productIdsNeedFifo.add(sdItem.productId);
                } else {
                    const allocQty = sdItem.lotAllocations.reduce((s: number, a: any) => s + a.qty, 0);
                    if (sdItem.quantity > allocQty) productIdsNeedFifo.add(sdItem.productId);
                }
            }
        }

        const fifoLotsByProduct = new Map<string, any[]>();
        if (productIdsNeedFifo.size > 0) {
            const allFifoLots = await (prisma as any).productLot.findMany({
                where: { productId: { in: [...productIdsNeedFifo] }, isVoided: false },
                orderBy: { grDate: 'asc' }
            });
            for (const lot of allFifoLots) {
                if (!fifoLotsByProduct.has(lot.productId)) fifoLotsByProduct.set(lot.productId, []);
                fifoLotsByProduct.get(lot.productId)!.push(lot);
            }
        }

        // Batch-fetch full GR data for FIFO lots
        const grNumbersFifo = new Set<string>();
        for (const lots of fifoLotsByProduct.values()) {
            for (const lot of lots) if (lot.grNumber) grNumbersFifo.add(lot.grNumber);
        }
        const grDataFifo = grNumbersFifo.size > 0
            ? await (prisma as any).goodsReceipt.findMany({
                where: { receiptNumber: { in: [...grNumbersFifo] } },
                select: {
                    receiptNumber: true, paymentStatus: true, salesPerson: true,
                    formNumber: true, taxInvoiceDate: true, taxInvoiceNumber: true
                }
            })
            : [];
        const grMapFifo = new Map<string, any>(grDataFifo.map((g: any) => [g.receiptNumber, g]));

        // Helper: FIFO lot untuk produk pada tanggal tertentu
        const getFifoLot = (productId: string, saleDate: Date): any | null => {
            const lots = fifoLotsByProduct.get(productId) ?? [];
            const eligible = lots.filter((l: any) => new Date(l.grDate) <= saleDate);
            return eligible[0] ?? lots[0] ?? null;
        };

        // Helper: format date Indonesia
        const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('id-ID') : '-';

        // Helper: hitung DPP (Dasar Pengenaan Pajak = Total / 1.11 jika ada PPN 11%)
        const calcDPP = (totalJual: number, taxRate: number) => {
            if (taxRate > 0) return Math.round(totalJual / (1 + taxRate / 100));
            return totalJual; // jika tidak ada PPN, DPP = Total Jual
        };

        let rowNo = 0;

        // ════════════════════════════════════════════════════════════
        // STEP 1: PENJUALAN rows
        // ════════════════════════════════════════════════════════════
        for (const sd of deliveries) {
            const soNumber  = soMap.get(sd.orderId ?? '') ?? sd.poNumber ?? '-';
            const buyer     = sd.buyerName || sd.recipient;
            const tglJual   = fmtDate(sd.date);
            const spJual    = sd.salesPerson || '-';
            const taxRate   = Number(sd.taxRate || 0);

            for (const sdItem of sd.items) {
                const barcode   = sdItem.product.barcode || sdItem.product.sku;
                const namaItem  = sdItem.product.name;
                const perCt     = sdItem.product.uom || 'PCS';
                const sellPrice = Number(sdItem.salesPrice || 0);
                const discount  = Number(sdItem.discount || 0);

                if (sdItem.lotAllocations?.length > 0) {
                    // ── PATH A: LOT ALLOCATED — 100% Akurat ──────────────
                    for (const alloc of sdItem.lotAllocations) {
                        const grInfo    = grMapA.get(alloc.lot.grNumber) || {};
                        const hpp       = Number(alloc.hppAtTime);
                        const qty       = alloc.qty;
                        const opsDisc   = Number(grInfo.totalDiscount || 0) > 0
                                          ? Math.round(Number(grInfo.totalDiscount || 0) / qty) : 0;
                        const totalBeli = Math.round(hpp * qty);
                        const totalJual = Math.round(sellPrice * qty);
                        const margin    = totalJual - totalBeli;
                        const marginPct = totalJual > 0 ? (margin / totalJual * 100) : 0;
                        const dpp       = calcDPP(totalJual, taxRate);
                        const ppn       = totalJual - dpp;

                        rowNo++;
                        rows.push({
                            _sortDate          : sd.date,
                            'NO'               : rowNo,
                            'TANGGAL'          : tglJual,
                            'F. PAJAK'         : fmtDate(grInfo.taxInvoiceDate),
                            'NOMOR'            : sd.deliveryNumber,
                            'TGL BELI'         : fmtDate(alloc.lot.grDate),
                            'NAMA PEMBELI'     : buyer,
                            'BARCODE'          : barcode,
                            'KETERANGAN ITEM'  : namaItem,
                            'SALES'            : spJual,
                            // ─ BELI ─
                            'QTY BELI'         : qty,
                            'HARGA BELI'       : hpp,
                            'OPS'              : opsDisc,
                            'TOTAL BELI'       : totalBeli,
                            // ─ JUAL ─
                            'NAMA SUPPLIER'    : alloc.lot.supplierName || '-',
                            'QTY JUAL'         : qty,
                            'HARGA JUAL'       : sellPrice,
                            'TOTAL JUAL'       : totalJual,
                            // ─ KALKULASI ─
                            'MARGIN'           : margin,
                            'MARGIN %'         : `${marginPct.toFixed(1)}%`,
                            'DPP'              : dpp,
                            'PPH'              : ppn,
                            'TOTAL'            : totalJual,
                            // ─ REFERENSI ─
                            'NO. PO'           : soNumber,
                            'NO. FAKTUR'       : grInfo.formNumber || alloc.lot.grNumber || '-',
                            'NO. PAJAK'        : grInfo.taxInvoiceNumber || '-',
                            // ─ PAYMENT ─
                            'PAYMENT'          : sd.paymentStatus || 'PENDING',
                            'PER/CT'           : perCt,
                        });
                    }

                    // Edge-case: unallocated qty
                    const allocQty    = sdItem.lotAllocations.reduce((s: number, a: any) => s + a.qty, 0);
                    const unallocated = sdItem.quantity - allocQty;
                    if (unallocated > 0) {
                        const fifoLot   = getFifoLot(sdItem.productId, sd.date);
                        const grInfo    = fifoLot?.grNumber ? (grMapFifo.get(fifoLot.grNumber) || {}) : {};
                        const hpp       = fifoLot ? Number(fifoLot.purchasePrice) : Number(sdItem.product.purchasePrice || 0);
                        const totalBeli = Math.round(hpp * unallocated);
                        const totalJual = Math.round(sellPrice * unallocated);
                        const margin    = totalJual - totalBeli;
                        const marginPct = totalJual > 0 ? (margin / totalJual * 100) : 0;
                        const dpp       = calcDPP(totalJual, taxRate);
                        const ppn       = totalJual - dpp;

                        rowNo++;
                        rows.push({
                            _sortDate          : sd.date,
                            'NO'               : rowNo,
                            'TANGGAL'          : tglJual,
                            'F. PAJAK'         : fmtDate(grInfo.taxInvoiceDate),
                            'NOMOR'            : sd.deliveryNumber,
                            'TGL BELI'         : fmtDate(fifoLot?.grDate),
                            'NAMA PEMBELI'     : buyer,
                            'BARCODE'          : barcode,
                            'KETERANGAN ITEM'  : namaItem,
                            'SALES'            : spJual,
                            'QTY BELI'         : unallocated,
                            'HARGA BELI'       : Math.round(hpp),
                            'OPS'              : 0,
                            'TOTAL BELI'       : totalBeli,
                            'NAMA SUPPLIER'    : fifoLot?.supplierName || '-',
                            'QTY JUAL'         : unallocated,
                            'HARGA JUAL'       : sellPrice,
                            'TOTAL JUAL'       : totalJual,
                            'MARGIN'           : margin,
                            'MARGIN %'         : `${marginPct.toFixed(1)}%`,
                            'DPP'              : dpp,
                            'PPH'              : ppn,
                            'TOTAL'            : totalJual,
                            'NO. PO'           : soNumber,
                            'NO. FAKTUR'       : grInfo.formNumber || fifoLot?.grNumber || '-',
                            'NO. PAJAK'        : grInfo.taxInvoiceNumber || '-',
                            'PAYMENT'          : sd.paymentStatus || 'PENDING',
                            'PER/CT'           : perCt,
                        });
                    }

                } else {
                    // ── PATH B: TANPA LOT — FIFO ESTIMATE ─────────────────
                    const fifoLot   = getFifoLot(sdItem.productId, sd.date);
                    const grInfo    = fifoLot?.grNumber ? (grMapFifo.get(fifoLot.grNumber) || {}) : {};
                    const hpp       = fifoLot ? Number(fifoLot.purchasePrice) : Number(sdItem.product.purchasePrice || 0);
                    const qty       = sdItem.quantity;
                    const totalBeli = Math.round(hpp * qty);
                    const totalJual = Math.round(sellPrice * qty);
                    const margin    = totalJual - totalBeli;
                    const marginPct = totalJual > 0 ? (margin / totalJual * 100) : 0;
                    const dpp       = calcDPP(totalJual, taxRate);
                    const ppn       = totalJual - dpp;

                    rowNo++;
                    rows.push({
                        _sortDate          : sd.date,
                        'NO'               : rowNo,
                        'TANGGAL'          : tglJual,
                        'F. PAJAK'         : fmtDate(grInfo.taxInvoiceDate),
                        'NOMOR'            : sd.deliveryNumber,
                        'TGL BELI'         : fmtDate(fifoLot?.grDate),
                        'NAMA PEMBELI'     : buyer,
                        'BARCODE'          : barcode,
                        'KETERANGAN ITEM'  : namaItem,
                        'SALES'            : spJual,
                        'QTY BELI'         : qty,
                        'HARGA BELI'       : Math.round(hpp),
                        'OPS'              : 0,
                        'TOTAL BELI'       : totalBeli,
                        'NAMA SUPPLIER'    : fifoLot?.supplierName || '-',
                        'QTY JUAL'         : qty,
                        'HARGA JUAL'       : sellPrice,
                        'TOTAL JUAL'       : totalJual,
                        'MARGIN'           : margin,
                        'MARGIN %'         : `${marginPct.toFixed(1)}%`,
                        'DPP'              : dpp,
                        'PPH'              : ppn,
                        'TOTAL'            : totalJual,
                        'NO. PO'           : soNumber,
                        'NO. FAKTUR'       : grInfo.formNumber || fifoLot?.grNumber || '-',
                        'NO. PAJAK'        : grInfo.taxInvoiceNumber || '-',
                        'PAYMENT'          : sd.paymentStatus || 'PENDING',
                        'PER/CT'           : perCt,
                    });
                }
            }
        }

        // ════════════════════════════════════════════════════════════
        // STEP 2: PEMBELIAN rows (MASUK STOK)
        // ════════════════════════════════════════════════════════════
        const receipts = await (prisma as any).goodsReceipt.findMany({
            where: { isVoid: false, date: { gte: startDate, lte: endDate } },
            include: {
                items: {
                    include: {
                        product: {
                            select: { sku: true, name: true, uom: true, barcode: true }
                        },
                        lot: true
                    }
                }
            },
            orderBy: { date: 'asc' }
        }) as any[];

        for (const gr of receipts) {
            const tglBeli = fmtDate(gr.date);
            const fPajak  = fmtDate(gr.taxInvoiceDate);
            for (const grItem of gr.items) {
                const hpp      = Number(grItem.purchasePrice || 0);
                const qty      = grItem.quantity;
                const totalBeli = Math.round(hpp * qty);
                const barcode  = grItem.product.barcode || grItem.product.sku;

                rowNo++;
                rows.push({
                    _sortDate          : gr.date ?? gr.createdAt,
                    'NO'               : rowNo,
                    'TANGGAL'          : tglBeli,
                    'F. PAJAK'         : fPajak,
                    'NOMOR'            : gr.receiptNumber,
                    'TGL BELI'         : tglBeli,
                    'NAMA PEMBELI'     : '-',
                    'BARCODE'          : barcode,
                    'KETERANGAN ITEM'  : grItem.product.name,
                    'SALES'            : gr.salesPerson || '-',
                    'QTY BELI'         : qty,
                    'HARGA BELI'       : hpp,
                    'OPS'              : 0,
                    'TOTAL BELI'       : totalBeli,
                    'NAMA SUPPLIER'    : gr.receivedFrom || '-',
                    'QTY JUAL'         : 0,
                    'HARGA JUAL'       : 0,
                    'TOTAL JUAL'       : 0,
                    'MARGIN'           : 0,
                    'MARGIN %'         : '-',
                    'DPP'              : 0,
                    'PPH'              : 0,
                    'TOTAL'            : totalBeli,
                    'NO. PO'           : '-',
                    'NO. FAKTUR'       : gr.formNumber || '-',
                    'NO. PAJAK'        : gr.taxInvoiceNumber || '-',
                    'PAYMENT'          : gr.paymentStatus || 'PENDING',
                    'PER/CT'           : grItem.product.uom || 'PCS',
                });
            }
        }

        // ════════════════════════════════════════════════════════════
        // STEP 3: RETUR BELI
        // ════════════════════════════════════════════════════════════
        const purchaseReturns = await (prisma as any).purchaseReturn.findMany({
            where: { isVoid: false, date: { gte: startDate, lte: endDate } },
            include: {
                items: {
                    include: {
                        product: { select: { sku: true, name: true, uom: true, barcode: true } }
                    }
                },
                receipt: {
                    select: {
                        receiptNumber: true, receivedFrom: true, salesPerson: true,
                        formNumber: true, taxInvoiceNumber: true, taxInvoiceDate: true,
                        paymentStatus: true
                    }
                }
            },
            orderBy: { date: 'asc' }
        }) as any[];

        for (const pr of purchaseReturns) {
            const tglRetur = fmtDate(pr.date);
            for (const prItem of pr.items) {
                const barcode = prItem.product.barcode || prItem.product.sku;
                rowNo++;
                rows.push({
                    _sortDate          : pr.date,
                    'NO'               : rowNo,
                    'TANGGAL'          : tglRetur,
                    'F. PAJAK'         : fmtDate(pr.receipt?.taxInvoiceDate),
                    'NOMOR'            : pr.returnNumber,
                    'TGL BELI'         : tglRetur,
                    'NAMA PEMBELI'     : '-',
                    'BARCODE'          : barcode,
                    'KETERANGAN ITEM'  : prItem.product.name,
                    'SALES'            : pr.receipt?.salesPerson || '-',
                    'QTY BELI'         : -prItem.quantity,   // negatif = retur keluar
                    'HARGA BELI'       : 0,
                    'OPS'              : 0,
                    'TOTAL BELI'       : 0,
                    'NAMA SUPPLIER'    : pr.receipt?.receivedFrom || '-',
                    'QTY JUAL'         : 0,
                    'HARGA JUAL'       : 0,
                    'TOTAL JUAL'       : 0,
                    'MARGIN'           : 0,
                    'MARGIN %'         : '-',
                    'DPP'              : 0,
                    'PPH'              : 0,
                    'TOTAL'            : 0,
                    'NO. PO'           : '-',
                    'NO. FAKTUR'       : pr.receipt?.formNumber || '-',
                    'NO. PAJAK'        : pr.receipt?.taxInvoiceNumber || '-',
                    'PAYMENT'          : pr.receipt?.paymentStatus || '-',
                    'PER/CT'           : prItem.product.uom || 'PCS',
                });
            }
        }

        // ════════════════════════════════════════════════════════════
        // STEP 4: RETUR JUAL
        // ════════════════════════════════════════════════════════════
        const salesReturns = await (prisma as any).salesReturn.findMany({
            where: { isVoid: false, date: { gte: startDate, lte: endDate } },
            include: {
                items: {
                    include: {
                        product: { select: { sku: true, name: true, uom: true, barcode: true } }
                    }
                },
                delivery: {
                    select: {
                        deliveryNumber: true, buyerName: true, recipient: true,
                        salesPerson: true, paymentStatus: true, poNumber: true,
                        taxRate: true, date: true
                    }
                }
            },
            orderBy: { date: 'asc' }
        }) as any[];

        for (const sr of salesReturns) {
            const tglRetur = fmtDate(sr.date);
            for (const srItem of sr.items) {
                const barcode  = srItem.product.barcode || srItem.product.sku;
                const taxRate  = Number(sr.delivery?.taxRate || 0);
                rowNo++;
                rows.push({
                    _sortDate          : sr.date,
                    'NO'               : rowNo,
                    'TANGGAL'          : tglRetur,
                    'F. PAJAK'         : '-',
                    'NOMOR'            : sr.returnNumber,
                    'TGL BELI'         : '-',
                    'NAMA PEMBELI'     : sr.delivery?.buyerName || sr.delivery?.recipient || '-',
                    'BARCODE'          : barcode,
                    'KETERANGAN ITEM'  : srItem.product.name,
                    'SALES'            : sr.delivery?.salesPerson || '-',
                    'QTY BELI'         : 0,
                    'HARGA BELI'       : 0,
                    'OPS'              : 0,
                    'TOTAL BELI'       : 0,
                    'NAMA SUPPLIER'    : '-',
                    'QTY JUAL'         : -srItem.quantity,  // negatif = retur masuk
                    'HARGA JUAL'       : 0,
                    'TOTAL JUAL'       : 0,
                    'MARGIN'           : 0,
                    'MARGIN %'         : '-',
                    'DPP'              : 0,
                    'PPH'              : 0,
                    'TOTAL'            : 0,
                    'NO. PO'           : sr.delivery?.poNumber || '-',
                    'NO. FAKTUR'       : sr.delivery?.deliveryNumber || '-',
                    'NO. PAJAK'        : '-',
                    'PAYMENT'          : sr.delivery?.paymentStatus || '-',
                    'PER/CT'           : srItem.product.uom || 'PCS',
                });
            }
        }

        // ════════════════════════════════════════════════════════════
        // STEP 5: Sort kronologis, re-number NO setelah sort
        // ════════════════════════════════════════════════════════════
        rows.sort((a, b) => new Date(a._sortDate).getTime() - new Date(b._sortDate).getTime());

        // Re-number setelah sort agar NO urut sesuai tanggal
        rows.forEach((row, idx) => { row['NO'] = idx + 1; });

        return rows.map(({ _sortDate, ...rest }) => rest);

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
                    deliveryNumber: { contains: `${filterMonth.toString().padStart(2, '0')}${filterYear}-` },
                    ...(isAll ? {} : { deliveryNumber: { startsWith: prefix } })
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
                    receiptNumber: { contains: `${filterMonth.toString().padStart(2, '0')}${filterYear}-` },
                    ...(isAll ? {} : { receiptNumber: { startsWith: prefix } })
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
                        description: { contains: prefix, mode: 'insensitive' }
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
                    ...(isAll ? {} : { deliveryNumber: { startsWith: prefix } })
                },
                select: { grandTotal: true, paidAmount: true }
            }),
            // 5. Accounts Payable (Unpaid LPB)
            (prisma as any).goodsReceipt.findMany({
                where: { 
                    isVoid: false, 
                    date: { lte: endDate },
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
    status?: string;   // AKTIF | HABIS | VOID | ALL
    sku?: string;
    supplier?: string;
}) {
    const prisma = getPrisma();

    const filterYear  = filters.year  || new Date().getFullYear();
    const filterMonth = filters.month || (new Date().getMonth() + 1);
    const startDate   = new Date(filterYear, filterMonth - 1, 1);
    const endDate     = new Date(filterYear, filterMonth, 0, 23, 59, 59);

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
                                        orderId: true
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
                });
            } else {
                // Satu row per alokasi penjualan
                for (const alloc of lot.allocations) {
                    const delivery  = alloc.sdItem?.delivery;
                    const soNumber  = delivery?.orderId
                        ? (orderNumberMap.get(delivery.orderId) ?? '-')
                        : '-';

                    report.push({
                        ...baseRow,
                        'Tgl Jual'          : delivery?.date
                            ? new Date(delivery.date).toLocaleDateString('id-ID')
                            : '-',
                        'No. SJ'            : delivery?.deliveryNumber || '-',
                        'No. SO'            : soNumber,
                        'Buyer'             : delivery?.buyerName || delivery?.recipient || '-',
                        'Sales Person Jual' : delivery?.salesPerson || 'UMUM',
                        'QTY Alokasi'       : Number(alloc.qty),
                        'HPP Saat Jual (Rp)': Number(alloc.hppAtTime),
                        'Status Bayar Jual' : delivery?.paymentStatus || '-',
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
