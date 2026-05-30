import { getPrisma } from "@/lib/prisma";

/**
 * FIFO TRACEABILITY SERVICE — v3 (Full Accuracy)
 * Fix #1: PATH B pakai FIFO (lot tertua ≤ tgl jual), bukan lot terbaru
 * Fix #2: Baris PEMBELIAN sekarang include No. Lot dari ProductLot
 * Fix #3: Kolom Total Nilai Beli & Total Nilai Jual ditambahkan
 * Fix #4: Sales Person Beli PATH B diambil dari GR yang benar
 * Fix #5: Semua baris disortir kronologis (PEMBELIAN & PENJUALAN campur)
 * Fix #6: Retur Beli & Retur Jual diikutsertakan dalam laporan
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
        // PRE-FETCH: SalesDeliveries + SO map + PATH A GR map
        // ════════════════════════════════════════════════════════════
        const deliveries = await (prisma as any).salesDelivery.findMany({
            where: { isVoid: false, date: { gte: startDate, lte: endDate } },
            include: {
                items: {
                    include: {
                        product: { select: { sku: true, name: true, uom: true, purchasePrice: true } },
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

        // PATH A: collect GR numbers from lot allocations for payment/salesperson lookup
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
                select: { receiptNumber: true, paymentStatus: true, salesPerson: true }
            })
            : [];
        const grPaymentMapA  = new Map<string, string>(grDataPathA.map((g: any) => [g.receiptNumber, g.paymentStatus]));
        const grSalesPersonA = new Map<string, string>(grDataPathA.map((g: any) => [g.receiptNumber, g.salesPerson || 'UMUM']));

        // PATH B / edge-case: pre-fetch FIFO lots (Fix #1 — batch, no N+1)
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

        // Map: productId → lots[] sorted by grDate ASC (oldest first = FIFO)
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

        // Batch-fetch GR salesPerson for FIFO lots (Fix #4)
        const grNumbersFifo = new Set<string>();
        for (const lots of fifoLotsByProduct.values()) {
            for (const lot of lots) if (lot.grNumber) grNumbersFifo.add(lot.grNumber);
        }
        const grDataFifo = grNumbersFifo.size > 0
            ? await (prisma as any).goodsReceipt.findMany({
                where: { receiptNumber: { in: [...grNumbersFifo] } },
                select: { receiptNumber: true, paymentStatus: true, salesPerson: true }
            })
            : [];
        const grSalesPersonFifo = new Map<string, string>(grDataFifo.map((g: any) => [g.receiptNumber, g.salesPerson || 'UMUM']));

        // Helper: FIFO lot untuk produk pada tanggal tertentu
        const getFifoLot = (productId: string, saleDate: Date): any | null => {
            const lots = fifoLotsByProduct.get(productId) ?? [];
            // Ambil lot tertua yang grDate-nya ≤ tanggal jual
            const eligible = lots.filter((l: any) => new Date(l.grDate) <= saleDate);
            return eligible[0] ?? lots[0] ?? null; // fallback: lot tertua yang ada
        };

        // ════════════════════════════════════════════════════════════
        // STEP 1: PENJUALAN
        // ════════════════════════════════════════════════════════════
        for (const sd of deliveries) {
            const soNumber = soMap.get(sd.orderId ?? '') ?? sd.poNumber ?? '-';
            const buyer    = sd.buyerName || sd.recipient;
            const tglJual  = new Date(sd.date).toLocaleDateString('id-ID');
            const spJual   = sd.salesPerson || 'UMUM';

            for (const sdItem of sd.items) {
                const sku       = sdItem.product.sku;
                const nama      = sdItem.product.name;
                const satuan    = sdItem.product.uom || 'PCS';
                const sellPrice = Number(sdItem.salesPrice || 0);

                if (sdItem.lotAllocations?.length > 0) {
                    // ── PATH A: LOT ALLOCATED — 100% Akurat ──────────────
                    for (const alloc of sdItem.lotAllocations) {
                        const hpp         = Number(alloc.hppAtTime);
                        const profitUnit  = sellPrice - hpp;
                        const totalProfit = Math.round(profitUnit * alloc.qty);
                        const nilaiJual   = Math.round(sellPrice * alloc.qty);
                        const nilaiBeli   = Math.round(hpp * alloc.qty);
                        const marginPct   = sellPrice > 0 ? ((sellPrice - hpp) / sellPrice * 100) : 0;

                        rows.push({
                            _sortDate               : sd.date,
                            'Tipe Transaksi'        : 'PENJUALAN',
                            'Tanggal'               : tglJual,
                            'Tgl Beli'              : alloc.lot.grDate ? new Date(alloc.lot.grDate).toLocaleDateString('id-ID') : '-',
                            'No. GR (Batch Beli)'   : alloc.lot.grNumber || '-',
                            'No. Lot'               : alloc.lot.lotNumber || '-',
                            'No. Faktur Supplier'   : '-',
                            'Supplier'              : alloc.lot.supplierName || '-',
                            'HPP Per Unit (Rp)'     : hpp,
                            'Total Nilai Beli (Rp)' : nilaiBeli,
                            'Tgl Jual'              : tglJual,
                            'No. SJ'                : sd.deliveryNumber,
                            'No. SO'                : soNumber,
                            'Buyer'                 : buyer,
                            'SKU'                   : sku,
                            'Nama Barang'           : nama,
                            'Satuan'                : satuan,
                            'QTY'                   : alloc.qty,
                            'Harga Jual Per Unit (Rp)' : sellPrice,
                            'Total Nilai Jual (Rp)' : nilaiJual,
                            'Profit Per Unit (Rp)'  : Math.round(profitUnit),
                            'Total Profit (Rp)'     : totalProfit,
                            'Margin %'              : `${marginPct.toFixed(1)}%`,
                            'Status Bayar Beli'     : grPaymentMapA.get(alloc.lot.grNumber) || 'PAID',
                            'Status Bayar Jual'     : sd.paymentStatus || 'PENDING',
                            'Sales Person Beli'     : grSalesPersonA.get(alloc.lot.grNumber) || 'UMUM',
                            'Sales Person Jual'     : spJual,
                            'Akurasi HPP'           : 'LOT AKURAT',
                        });
                    }

                    // Edge-case: qty terjual > total alokasi lot
                    const allocQty    = sdItem.lotAllocations.reduce((s: number, a: any) => s + a.qty, 0);
                    const unallocated = sdItem.quantity - allocQty;
                    if (unallocated > 0) {
                        const fifoLot    = getFifoLot(sdItem.productId, sd.date);
                        const hpp        = fifoLot ? Number(fifoLot.purchasePrice) : Number(sdItem.product.purchasePrice || 0);
                        const profitUnit = sellPrice - hpp;
                        const nilaiJual  = Math.round(sellPrice * unallocated);
                        const nilaiBeli  = Math.round(hpp * unallocated);
                        const marginPct  = sellPrice > 0 ? (profitUnit / sellPrice * 100) : 0;
                        const spBeli     = fifoLot?.grNumber ? (grSalesPersonFifo.get(fifoLot.grNumber) || 'UMUM') : 'UMUM';

                        rows.push({
                            _sortDate               : sd.date,
                            'Tipe Transaksi'        : 'PENJUALAN',
                            'Tanggal'               : tglJual,
                            'Tgl Beli'              : fifoLot?.grDate ? new Date(fifoLot.grDate).toLocaleDateString('id-ID') : '-',
                            'No. GR (Batch Beli)'   : fifoLot?.grNumber || '-',
                            'No. Lot'               : fifoLot?.lotNumber || '-',
                            'No. Faktur Supplier'   : '-',
                            'Supplier'              : fifoLot?.supplierName || '-',
                            'HPP Per Unit (Rp)'     : Math.round(hpp),
                            'Total Nilai Beli (Rp)' : nilaiBeli,
                            'Tgl Jual'              : tglJual,
                            'No. SJ'                : sd.deliveryNumber,
                            'No. SO'                : soNumber,
                            'Buyer'                 : buyer,
                            'SKU'                   : sku,
                            'Nama Barang'           : nama,
                            'Satuan'                : satuan,
                            'QTY'                   : unallocated,
                            'Harga Jual Per Unit (Rp)' : sellPrice,
                            'Total Nilai Jual (Rp)' : nilaiJual,
                            'Profit Per Unit (Rp)'  : Math.round(profitUnit),
                            'Total Profit (Rp)'     : Math.round(profitUnit * unallocated),
                            'Margin %'              : `${marginPct.toFixed(1)}%`,
                            'Status Bayar Beli'     : 'PAID',
                            'Status Bayar Jual'     : sd.paymentStatus || 'PENDING',
                            'Sales Person Beli'     : spBeli,
                            'Sales Person Jual'     : spJual,
                            'Akurasi HPP'           : 'FIFO ESTIMASI',
                        });
                    }

                } else {
                    // ── PATH B: TANPA LOT — FIFO ESTIMATE (Fix #1) ───────
                    const fifoLot    = getFifoLot(sdItem.productId, sd.date);
                    const hpp        = fifoLot ? Number(fifoLot.purchasePrice) : Number(sdItem.product.purchasePrice || 0);
                    const profitUnit = sellPrice - hpp;
                    const nilaiJual  = Math.round(sellPrice * sdItem.quantity);
                    const nilaiBeli  = Math.round(hpp * sdItem.quantity);
                    const marginPct  = sellPrice > 0 ? (profitUnit / sellPrice * 100) : 0;
                    const spBeli     = fifoLot?.grNumber ? (grSalesPersonFifo.get(fifoLot.grNumber) || 'UMUM') : 'UMUM';
                    const akurasi    = fifoLot ? 'FIFO ESTIMASI' : 'MASTER PRICE';

                    rows.push({
                        _sortDate               : sd.date,
                        'Tipe Transaksi'        : 'PENJUALAN',
                        'Tanggal'               : tglJual,
                        'Tgl Beli'              : fifoLot?.grDate ? new Date(fifoLot.grDate).toLocaleDateString('id-ID') : '-',
                        'No. GR (Batch Beli)'   : fifoLot?.grNumber || '-',
                        'No. Lot'               : fifoLot?.lotNumber || '-',
                        'No. Faktur Supplier'   : '-',
                        'Supplier'              : fifoLot?.supplierName || '-',
                        'HPP Per Unit (Rp)'     : Math.round(hpp),
                        'Total Nilai Beli (Rp)' : nilaiBeli,
                        'Tgl Jual'              : tglJual,
                        'No. SJ'                : sd.deliveryNumber,
                        'No. SO'                : soNumber,
                        'Buyer'                 : buyer,
                        'SKU'                   : sku,
                        'Nama Barang'           : nama,
                        'Satuan'                : satuan,
                        'QTY'                   : sdItem.quantity,
                        'Harga Jual Per Unit (Rp)' : sellPrice,
                        'Total Nilai Jual (Rp)' : nilaiJual,
                        'Profit Per Unit (Rp)'  : Math.round(profitUnit),
                        'Total Profit (Rp)'     : Math.round(profitUnit * sdItem.quantity),
                        'Margin %'              : `${marginPct.toFixed(1)}%`,
                        'Status Bayar Beli'     : 'PAID',
                        'Status Bayar Jual'     : sd.paymentStatus || 'PENDING',
                        'Sales Person Beli'     : spBeli,
                        'Sales Person Jual'     : spJual,
                        'Akurasi HPP'           : akurasi,
                    });
                }
            }
        }

        // ════════════════════════════════════════════════════════════
        // STEP 2: PEMBELIAN — include No. Lot & Total Nilai Beli (Fix #2, #3)
        // ════════════════════════════════════════════════════════════
        const receipts = await (prisma as any).goodsReceipt.findMany({
            where: { isVoid: false, date: { gte: startDate, lte: endDate } },
            include: {
                items: {
                    include: {
                        product: { select: { sku: true, name: true, uom: true } },
                        lot: true   // Fix #2: include relasi lot
                    }
                }
            },
            orderBy: { date: 'asc' }
        }) as any[];

        for (const gr of receipts) {
            const tglBeli = gr.date ? new Date(gr.date).toLocaleDateString('id-ID') : '-';
            for (const grItem of gr.items) {
                const hpp      = Number(grItem.purchasePrice || 0);
                const qty      = grItem.quantity;
                const nilaiBeli = Math.round(hpp * qty);

                rows.push({
                    _sortDate               : gr.date ?? gr.createdAt,
                    'Tipe Transaksi'        : 'PEMBELIAN',
                    'Tanggal'               : tglBeli,
                    'Tgl Beli'              : tglBeli,
                    'No. GR (Batch Beli)'   : gr.receiptNumber,
                    'No. Lot'               : grItem.lot?.lotNumber || '-',   // Fix #2
                    'No. Faktur Supplier'   : gr.formNumber || '-',
                    'Supplier'              : gr.receivedFrom || '-',
                    'HPP Per Unit (Rp)'     : hpp,
                    'Total Nilai Beli (Rp)' : nilaiBeli,                      // Fix #3
                    'Tgl Jual'              : '-',
                    'No. SJ'                : '-',
                    'No. SO'                : '-',
                    'Buyer'                 : '-',
                    'SKU'                   : grItem.product.sku,
                    'Nama Barang'           : grItem.product.name,
                    'Satuan'                : grItem.product.uom || 'PCS',
                    'QTY'                   : qty,
                    'Harga Jual Per Unit (Rp)' : 0,
                    'Total Nilai Jual (Rp)' : 0,
                    'Profit Per Unit (Rp)'  : 0,
                    'Total Profit (Rp)'     : 0,
                    'Margin %'              : '-',
                    'Status Bayar Beli'     : gr.paymentStatus || 'PENDING',
                    'Status Bayar Jual'     : '-',
                    'Sales Person Beli'     : gr.salesPerson || 'UMUM',
                    'Sales Person Jual'     : '-',
                    'Akurasi HPP'           : 'AKTUAL BELI',
                });
            }
        }

        // ════════════════════════════════════════════════════════════
        // STEP 3: RETUR BELI (Fix #6)
        // ════════════════════════════════════════════════════════════
        const purchaseReturns = await (prisma as any).purchaseReturn.findMany({
            where: { isVoid: false, date: { gte: startDate, lte: endDate } },
            include: {
                items: {
                    include: {
                        product: { select: { sku: true, name: true, uom: true } }
                    }
                },
                receipt: {
                    select: {
                        receiptNumber: true, receivedFrom: true,
                        salesPerson: true, formNumber: true, paymentStatus: true
                    }
                }
            },
            orderBy: { date: 'asc' }
        }) as any[];

        for (const pr of purchaseReturns) {
            const tglRetur = new Date(pr.date).toLocaleDateString('id-ID');
            for (const prItem of pr.items) {
                rows.push({
                    _sortDate               : pr.date,
                    'Tipe Transaksi'        : 'RETUR BELI',
                    'Tanggal'               : tglRetur,
                    'Tgl Beli'              : tglRetur,
                    'No. GR (Batch Beli)'   : pr.receipt?.receiptNumber || '-',
                    'No. Lot'               : '-',
                    'No. Faktur Supplier'   : pr.receipt?.formNumber || '-',
                    'Supplier'              : pr.receipt?.receivedFrom || '-',
                    'HPP Per Unit (Rp)'     : 0,
                    'Total Nilai Beli (Rp)' : 0,
                    'Tgl Jual'              : '-',
                    'No. SJ'                : pr.returnNumber,
                    'No. SO'                : '-',
                    'Buyer'                 : '-',
                    'SKU'                   : prItem.product.sku,
                    'Nama Barang'           : prItem.product.name,
                    'Satuan'                : prItem.product.uom || 'PCS',
                    'QTY'                   : prItem.quantity,
                    'Harga Jual Per Unit (Rp)' : 0,
                    'Total Nilai Jual (Rp)' : 0,
                    'Profit Per Unit (Rp)'  : 0,
                    'Total Profit (Rp)'     : 0,
                    'Margin %'              : '-',
                    'Status Bayar Beli'     : pr.receipt?.paymentStatus || '-',
                    'Status Bayar Jual'     : '-',
                    'Sales Person Beli'     : pr.receipt?.salesPerson || 'UMUM',
                    'Sales Person Jual'     : '-',
                    'Akurasi HPP'           : '-',
                });
            }
        }

        // ════════════════════════════════════════════════════════════
        // STEP 4: RETUR JUAL (Fix #6)
        // ════════════════════════════════════════════════════════════
        const salesReturns = await (prisma as any).salesReturn.findMany({
            where: { isVoid: false, date: { gte: startDate, lte: endDate } },
            include: {
                items: {
                    include: {
                        product: { select: { sku: true, name: true, uom: true } }
                    }
                },
                delivery: {
                    select: {
                        deliveryNumber: true, buyerName: true,
                        recipient: true, salesPerson: true, paymentStatus: true
                    }
                }
            },
            orderBy: { date: 'asc' }
        }) as any[];

        for (const sr of salesReturns) {
            const tglRetur = new Date(sr.date).toLocaleDateString('id-ID');
            for (const srItem of sr.items) {
                rows.push({
                    _sortDate               : sr.date,
                    'Tipe Transaksi'        : 'RETUR JUAL',
                    'Tanggal'               : tglRetur,
                    'Tgl Beli'              : '-',
                    'No. GR (Batch Beli)'   : '-',
                    'No. Lot'               : '-',
                    'No. Faktur Supplier'   : '-',
                    'Supplier'              : '-',
                    'HPP Per Unit (Rp)'     : 0,
                    'Total Nilai Beli (Rp)' : 0,
                    'Tgl Jual'              : tglRetur,
                    'No. SJ'                : sr.delivery?.deliveryNumber || '-',
                    'No. SO'                : '-',
                    'Buyer'                 : sr.delivery?.buyerName || sr.delivery?.recipient || '-',
                    'SKU'                   : srItem.product.sku,
                    'Nama Barang'           : srItem.product.name,
                    'Satuan'                : srItem.product.uom || 'PCS',
                    'QTY'                   : srItem.quantity,
                    'Harga Jual Per Unit (Rp)' : 0,
                    'Total Nilai Jual (Rp)' : 0,
                    'Profit Per Unit (Rp)'  : 0,
                    'Total Profit (Rp)'     : 0,
                    'Margin %'              : '-',
                    'Status Bayar Beli'     : '-',
                    'Status Bayar Jual'     : sr.delivery?.paymentStatus || '-',
                    'Sales Person Beli'     : '-',
                    'Sales Person Jual'     : sr.delivery?.salesPerson || 'UMUM',
                    'Akurasi HPP'           : '-',
                });
            }
        }

        // ════════════════════════════════════════════════════════════
        // STEP 5: Sort semua baris secara kronologis (Fix #5)
        // ════════════════════════════════════════════════════════════
        rows.sort((a, b) => new Date(a._sortDate).getTime() - new Date(b._sortDate).getTime());

        // Hapus field internal sebelum return
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
