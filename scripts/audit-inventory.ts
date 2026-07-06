import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

/**
 * READ-ONLY inventory reconciliation audit.
 * Compares three parallel representations of stock (ProductLot/LotAllocation chain,
 * StockMovement ledger, Stock table) and flags every place they disagree.
 * This script never writes to the database.
 */

type Severity = "HIGH" | "MEDIUM" | "LOW" | "INFO";

interface Discrepancy {
    category: string;
    severity: Severity;
    productId: string;
    sku: string;
    productName: string;
    lotId?: string;
    lotNumber?: string;
    grNumber?: string;
    grItemId?: string;
    deliveryNumber?: string;
    sdItemId?: string;
    returnNumber?: string;
    expected: number;
    actual: number;
    diff: number;
    valueImpact?: number;
    explanation: string;
}

function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
    const map = new Map<K, T[]>();
    for (const item of items) {
        const key = keyFn(item);
        const arr = map.get(key);
        if (arr) arr.push(item);
        else map.set(key, [item]);
    }
    return map;
}

function sumBy<T>(items: T[], fn: (item: T) => number): number {
    return items.reduce((acc, item) => acc + fn(item), 0);
}

async function main() {
    console.log("Loading data from database (read-only)...");

    const [products, lots, allocations, sdItems, purchaseReturnItems, salesReturnItems, stockMovements, stocks, salesReturns] =
        await Promise.all([
            prisma.product.findMany({
                select: { id: true, sku: true, name: true, purchasePrice: true },
            }),
            prisma.productLot.findMany(),
            prisma.lotAllocation.findMany(),
            prisma.salesDeliveryItem.findMany({
                select: {
                    id: true, deliveryId: true, productId: true, quantity: true,
                    delivery: { select: { isVoid: true, deliveryNumber: true, warehouseId: true } },
                },
            }),
            prisma.purchaseReturnItem.findMany({
                select: {
                    id: true, productId: true, quantity: true,
                    purchaseReturn: { select: { isVoid: true, returnNumber: true, receipt: { select: { receiptNumber: true } } } },
                },
            }),
            prisma.salesReturnItem.findMany({
                select: {
                    id: true, productId: true, quantity: true, deliveryItemId: true,
                    salesReturn: { select: { isVoid: true, returnNumber: true } },
                },
            }),
            prisma.stockMovement.findMany({
                select: { productId: true, quantity: true, type: true, reference: true },
            }),
            prisma.stock.findMany({ select: { productId: true, quantity: true } }),
            prisma.salesReturn.findMany({ select: { returnNumber: true } }),
        ]);

    console.log(
        `Loaded: ${products.length} products, ${lots.length} lots, ${allocations.length} allocations, ` +
        `${sdItems.length} sale items, ${purchaseReturnItems.length} purchase returns, ${salesReturnItems.length} sales returns, ` +
        `${stockMovements.length} stock movements, ${stocks.length} stock rows.`
    );

    const productMap = new Map(products.map((p) => [p.id, p]));
    const priceOf = (productId: string) => Number(productMap.get(productId)?.purchasePrice || 0);
    const skuOf = (productId: string) => productMap.get(productId)?.sku || "UNKNOWN";
    const nameOf = (productId: string) => productMap.get(productId)?.name || "UNKNOWN";

    const discrepancies: Discrepancy[] = [];

    // ---- Indices ----
    const allocsByLot = groupBy(allocations, (a) => a.lotId);
    const allocsBySdItem = groupBy(allocations, (a) => a.sdItemId);
    const lotsByProductGr = groupBy(lots, (l) => `${l.productId}|${l.grNumber}`);

    const purchaseReturnsByProductGr = new Map<string, number>();
    for (const pri of purchaseReturnItems) {
        if (pri.purchaseReturn.isVoid) continue;
        const key = `${pri.productId}|${pri.purchaseReturn.receipt.receiptNumber}`;
        purchaseReturnsByProductGr.set(key, (purchaseReturnsByProductGr.get(key) || 0) + pri.quantity);
    }

    // IMPORTANT: createSalesReturnAction/deleteSalesReturnAction restore/re-consume ProductLot.remainingQty
    // directly (LIFO over that sdItem's LotAllocation rows) but never touch the LotAllocation rows
    // themselves. So LotAllocation.qty always sums to the ORIGINAL sale quantity, regardless of later
    // returns — and a lot's true consumption must credit back whatever a return restored to it.
    // Replicate the same LIFO-restore-to-lot logic here so Check A can account for it per lot.
    const salesReturnRestorationByLot = new Map<string, number>();
    for (const sr of salesReturnItems) {
        if (sr.salesReturn.isVoid || !sr.deliveryItemId) continue;
        const allocsDesc = (allocsBySdItem.get(sr.deliveryItemId) || [])
            .slice()
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        let remaining = sr.quantity;
        for (const alloc of allocsDesc) {
            if (remaining <= 0) break;
            const restoreQty = Math.min(remaining, alloc.qty);
            salesReturnRestorationByLot.set(alloc.lotId, (salesReturnRestorationByLot.get(alloc.lotId) || 0) + restoreQty);
            remaining -= restoreQty;
        }
    }

    // A GR that was edited (PURCHASE_UPDATE_REVERT) or hard-deleted (PURCHASE_DELETE) after
    // creation cascade-deletes its ProductLot + any LotAllocations pointing at it (see schema
    // onDelete: Cascade). This is the proxy signal for "under-allocation may be unrecoverable".
    const productsWithGrEditSignal = new Set(
        stockMovements
            .filter((m) => m.type === "PURCHASE_UPDATE_REVERT" || m.type === "PURCHASE_DELETE")
            .map((m) => m.productId)
    );

    const salesReturnNumbers = new Set(salesReturns.map((sr) => sr.returnNumber));

    // ============================================================
    // CHECK A — Per-lot / per-(product,grNumber) conservation
    // ============================================================
    for (const [key, group] of lotsByProductGr) {
        const [productId, grNumber] = key.split("|");
        const nonVoided = group.filter((l) => !l.isVoided);
        if (nonVoided.length === 0) continue;

        const returnQty = purchaseReturnsByProductGr.get(key) || 0;

        if (nonVoided.length === 1) {
            const lot = nonVoided[0];
            const allocQty = sumBy(allocsByLot.get(lot.id) || [], (a) => a.qty);
            const restoredQty = salesReturnRestorationByLot.get(lot.id) || 0;
            const unclampedExpected = lot.initialQty - allocQty - returnQty + restoredQty;
            const expectedRemaining = Math.max(0, unclampedExpected);

            if (expectedRemaining !== lot.remainingQty) {
                discrepancies.push({
                    category: "LOT_CONSERVATION_MISMATCH",
                    severity: "HIGH",
                    productId, sku: skuOf(productId), productName: nameOf(productId),
                    lotId: lot.id, lotNumber: lot.lotNumber, grNumber,
                    grItemId: lot.grItemId,
                    expected: expectedRemaining, actual: lot.remainingQty,
                    diff: lot.remainingQty - expectedRemaining,
                    valueImpact: (lot.remainingQty - expectedRemaining) * Number(lot.landedCost ?? lot.purchasePrice),
                    explanation: `initialQty(${lot.initialQty}) - allocated(${allocQty}) - purchaseReturns(${returnQty}) + salesReturnsRestored(${restoredQty}) = ${expectedRemaining}, but remainingQty stored is ${lot.remainingQty}.`,
                });
            } else if (unclampedExpected < 0) {
                discrepancies.push({
                    category: "OVER_RETURN_CLAMPED",
                    severity: "INFO",
                    productId, sku: skuOf(productId), productName: nameOf(productId),
                    lotId: lot.id, lotNumber: lot.lotNumber, grNumber,
                    grItemId: lot.grItemId,
                    expected: 0, actual: 0, diff: unclampedExpected,
                    explanation: `Purchase return quantity (${returnQty}) exceeded what was left in this lot (initial ${lot.initialQty} - allocated ${allocQty} + salesReturnsRestored ${restoredQty} = ${lot.initialQty - allocQty + restoredQty}); production code silently clamped remainingQty to 0 instead of erroring. Likely a data-entry mistake on the return quantity.`,
                });
            }
        } else {
            // Ambiguous: multiple lots share the same (productId, grNumber). Production return
            // logic attributes the whole return to one lot via findFirst, not deterministically
            // splittable here — so validate the GROUP total, which is invariant regardless of
            // which specific lot in the group absorbed the return.
            const totalInitial = sumBy(nonVoided, (l) => l.initialQty);
            const totalRemaining = sumBy(nonVoided, (l) => l.remainingQty);
            const totalAlloc = sumBy(nonVoided, (l) => sumBy(allocsByLot.get(l.id) || [], (a) => a.qty));
            const totalRestored = sumBy(nonVoided, (l) => salesReturnRestorationByLot.get(l.id) || 0);
            const expectedTotalRemaining = Math.max(0, totalInitial - totalAlloc - returnQty + totalRestored);

            if (expectedTotalRemaining !== totalRemaining) {
                discrepancies.push({
                    category: "LOT_CONSERVATION_MISMATCH",
                    severity: "HIGH",
                    productId, sku: skuOf(productId), productName: nameOf(productId),
                    grNumber,
                    expected: expectedTotalRemaining, actual: totalRemaining,
                    diff: totalRemaining - expectedTotalRemaining,
                    explanation: `Group of ${nonVoided.length} lots sharing GR ${grNumber} (ambiguous purchase-return attribution): initial(${totalInitial}) - allocated(${totalAlloc}) - returns(${returnQty}) = ${expectedTotalRemaining}, but stored total remaining is ${totalRemaining}.`,
                });
            } else if (returnQty > 0) {
                discrepancies.push({
                    category: "LOW_CONFIDENCE_RETURN_MATCH",
                    severity: "INFO",
                    productId, sku: skuOf(productId), productName: nameOf(productId),
                    grNumber,
                    expected: totalRemaining, actual: totalRemaining, diff: 0,
                    explanation: `GR ${grNumber} has ${nonVoided.length} lots for this product; a purchase return of ${returnQty} units was recorded against this (product, GR) pair. Group total reconciles, but which specific lot absorbed the return cannot be determined from the data (no FK from PurchaseReturnItem to ProductLot).`,
                });
            }
        }
    }

    // ============================================================
    // CHECK B — Ledger vs Lot-remaining vs Stock table (per product)
    // ============================================================
    const ledgerByProduct = groupBy(
        stockMovements.filter((m) => m.type !== "SALE_VOID"),
        (m) => m.productId
    );
    const stockByProduct = groupBy(stocks, (s) => s.productId);
    const nonVoidedLotsByProduct = groupBy(lots.filter((l) => !l.isVoided), (l) => l.productId);

    const allProductIds = new Set([
        ...ledgerByProduct.keys(),
        ...stockByProduct.keys(),
        ...nonVoidedLotsByProduct.keys(),
    ]);

    for (const productId of allProductIds) {
        const ledgerSum = sumBy(ledgerByProduct.get(productId) || [], (m) => m.quantity);
        const stockSum = sumBy(stockByProduct.get(productId) || [], (s) => s.quantity);
        const lotRemainingSum = sumBy(nonVoidedLotsByProduct.get(productId) || [], (l) => l.remainingQty);

        if (ledgerSum !== stockSum) {
            discrepancies.push({
                category: "LEDGER_VS_STOCK_MISMATCH",
                severity: "HIGH",
                productId, sku: skuOf(productId), productName: nameOf(productId),
                expected: ledgerSum, actual: stockSum, diff: stockSum - ledgerSum,
                valueImpact: (stockSum - ledgerSum) * priceOf(productId),
                explanation: `Sum of StockMovement.quantity (excluding SALE_VOID) is ${ledgerSum}, but the Stock table total across all warehouses/vendors is ${stockSum}. The ledger does not reconstruct the current stock balance.`,
            });
        }

        if (lotRemainingSum !== stockSum) {
            discrepancies.push({
                category: "LOT_VS_STOCK_MISMATCH",
                severity: "HIGH",
                productId, sku: skuOf(productId), productName: nameOf(productId),
                expected: lotRemainingSum, actual: stockSum, diff: stockSum - lotRemainingSum,
                valueImpact: (stockSum - lotRemainingSum) * priceOf(productId),
                explanation: `Sum of ProductLot.remainingQty (non-voided lots) is ${lotRemainingSum}, but the Stock table total is ${stockSum}. The FIFO lot chain does not reconstruct the current stock balance.`,
            });
        }
    }

    // ---- Check B3: quantify today's admin "stock audit" double-count bug ----
    // Recompute runStockAuditService's inputs directly from loaded data.
    const goodsReceiptItemsAgg = await prisma.goodsReceiptItem.groupBy({
        by: ["productId"],
        where: { receipt: { isVerified: true, isVoid: false } },
        _sum: { quantity: true },
    });
    const totalPurchasedMap = new Map(goodsReceiptItemsAgg.map((r) => [r.productId, r._sum.quantity || 0]));

    const soldAgg = groupBy(sdItems.filter((s) => !s.delivery.isVoid), (s) => s.productId);
    const purchRetAgg = groupBy(purchaseReturnItems.filter((p) => !p.purchaseReturn.isVoid), (p) => p.productId);
    const salesRetAgg = groupBy(salesReturnItems.filter((s) => !s.salesReturn.isVoid), (s) => s.productId);
    const adjAgg = groupBy(stockMovements.filter((m) => m.type === "ADJUSTMENT"), (m) => m.productId);

    for (const productId of allProductIds) {
        const totalPurchased = totalPurchasedMap.get(productId) || 0;
        const totalSold = sumBy(soldAgg.get(productId) || [], (s) => s.quantity);
        const totalPurchReturned = sumBy(purchRetAgg.get(productId) || [], (p) => p.quantity);
        const totalSalesReturned = sumBy(salesRetAgg.get(productId) || [], (s) => s.quantity);
        const adjMovements = adjAgg.get(productId) || [];
        const totalAdjustmentsBuggy = sumBy(adjMovements, (m) => m.quantity);
        const totalAdjustmentsCorrected = sumBy(
            adjMovements.filter((m) => !(m.reference && salesReturnNumbers.has(m.reference))),
            (m) => m.quantity
        );

        const currentStock = sumBy(stockByProduct.get(productId) || [], (s) => s.quantity);
        const calcBuggy = totalPurchased - totalSold - totalPurchReturned + totalSalesReturned + totalAdjustmentsBuggy;
        const calcCorrected = totalPurchased - totalSold - totalPurchReturned + totalSalesReturned + totalAdjustmentsCorrected;
        const discrepancyBuggy = currentStock - calcBuggy;
        const discrepancyCorrected = currentStock - calcCorrected;

        if (discrepancyBuggy !== discrepancyCorrected) {
            discrepancies.push({
                category: "ADJUSTMENT_DOUBLE_COUNT_BUG",
                severity: "INFO",
                productId, sku: skuOf(productId), productName: nameOf(productId),
                expected: discrepancyCorrected, actual: discrepancyBuggy,
                diff: discrepancyBuggy - discrepancyCorrected,
                explanation: `Today's admin "Stock Audit" (runStockAuditService) reports a discrepancy of ${discrepancyBuggy} for this product, but ${discrepancyBuggy - discrepancyCorrected} of that is a phantom caused by double-counting sales-return quantities (once via SalesReturnItem, again via the ADJUSTMENT StockMovement rows written by createSalesReturnAction). The corrected discrepancy is ${discrepancyCorrected}.`,
            });
        }

        if (discrepancyCorrected !== 0) {
            discrepancies.push({
                category: "STOCK_TABLE_VS_HISTORY_MISMATCH",
                severity: Math.abs(discrepancyCorrected) >= 5 ? "HIGH" : "MEDIUM",
                productId, sku: skuOf(productId), productName: nameOf(productId),
                expected: calcCorrected, actual: currentStock, diff: discrepancyCorrected,
                valueImpact: discrepancyCorrected * priceOf(productId),
                explanation: `Replaying full transaction history (purchases - sales - purchase returns + sales returns + corrected adjustments) gives ${calcCorrected}, but Stock table shows ${currentStock}. Corrected discrepancy: ${discrepancyCorrected}.`,
            });
        }
    }

    // ============================================================
    // CHECK C — Per-sales-delivery-item allocation
    //
    // NOTE: sales returns are deliberately NOT subtracted here. createSalesReturnAction /
    // deleteSalesReturnAction restore/re-consume ProductLot.remainingQty directly but never
    // touch the LotAllocation rows — so LotAllocation.qty always sums to the item's ORIGINAL
    // sale quantity regardless of later returns (that restoration is checked in Check A instead,
    // via salesReturnRestorationByLot).
    // ============================================================
    for (const sdItem of sdItems) {
        if (sdItem.delivery.isVoid) continue;

        const allocQty = sumBy(allocsBySdItem.get(sdItem.id) || [], (a) => a.qty);
        const expected = sdItem.quantity;
        const diff = allocQty - expected;

        if (diff === 0) continue;

        if (diff > 0) {
            discrepancies.push({
                category: "SALES_ITEM_OVER_ALLOCATED",
                severity: "HIGH",
                productId: sdItem.productId, sku: skuOf(sdItem.productId), productName: nameOf(sdItem.productId),
                deliveryNumber: sdItem.delivery.deliveryNumber, sdItemId: sdItem.id,
                expected, actual: allocQty, diff,
                valueImpact: diff * priceOf(sdItem.productId),
                explanation: `SalesDeliveryItem allocated ${allocQty} units from lots but the delivery item quantity is only ${expected}. This should not be possible under normal FIFO logic — investigate manually.`,
            });
        } else {
            const hasEditSignal = productsWithGrEditSignal.has(sdItem.productId);
            if (allocQty === 0) {
                discrepancies.push({
                    category: "MANUAL_SALE_NO_LOT",
                    severity: "INFO",
                    productId: sdItem.productId, sku: skuOf(sdItem.productId), productName: nameOf(sdItem.productId),
                    deliveryNumber: sdItem.delivery.deliveryNumber, sdItemId: sdItem.id,
                    expected, actual: 0, diff,
                    explanation: `This sales delivery item has zero LotAllocation rows (needed ${expected} units). Likely created via a manual/legacy path (e.g. createManualSalesAction) that never allocates lots by design.`,
                });
            } else if (hasEditSignal) {
                discrepancies.push({
                    category: "LIKELY_DESTROYED_BY_GR_EDIT",
                    severity: "MEDIUM",
                    productId: sdItem.productId, sku: skuOf(sdItem.productId), productName: nameOf(sdItem.productId),
                    deliveryNumber: sdItem.delivery.deliveryNumber, sdItemId: sdItem.id,
                    expected, actual: allocQty, diff,
                    valueImpact: diff * priceOf(sdItem.productId),
                    explanation: `Under-allocated by ${-diff} units. This product has at least one GoodsReceipt that was later edited or deleted (PURCHASE_UPDATE_REVERT/PURCHASE_DELETE signal seen), which cascade-deletes ProductLot + LotAllocation rows even for lots already sold. This allocation gap may be unrecoverable directly — cross-check with the GR edit history.`,
                });
            } else {
                discrepancies.push({
                    category: "SOLD_BEFORE_PURCHASE_EXISTED",
                    severity: "LOW",
                    productId: sdItem.productId, sku: skuOf(sdItem.productId), productName: nameOf(sdItem.productId),
                    deliveryNumber: sdItem.delivery.deliveryNumber, sdItemId: sdItem.id,
                    expected, actual: allocQty, diff,
                    valueImpact: diff * priceOf(sdItem.productId),
                    explanation: `Under-allocated by ${-diff} units, with no GR-edit signal found for this product. Likely stock was sold before any matching purchase lot existed (a known FIFO edge case), or a warehouse mismatch prevented the lot from being found.`,
                });
            }
        }
    }

    // ============================================================
    // Summary + report generation
    // ============================================================
    const countsByCategory: Record<string, number> = {};
    let estimatedValueImpact = 0;
    for (const d of discrepancies) {
        countsByCategory[d.category] = (countsByCategory[d.category] || 0) + 1;
        if (d.valueImpact) estimatedValueImpact += Math.abs(d.valueImpact);
    }

    const knownLimitations = [
        "SALE_VOID StockMovement rows are excluded from ledger sums by design: voidSalesDeliveryService deletes the paired SALE/SALE_UPDATE rows, so including SALE_VOID would double-count the reversal.",
        "Lot FIFO matching is scoped by product + warehouse only (not vendor/supplier), while Stock/StockMovement are additionally scoped by vendorName. Check B is therefore done at product+warehouse-aggregate granularity, not per-vendor.",
        "Manual lot overrides (selectedLotId) mean lots are not always consumed in strict FIFO order — only quantity conservation is checked, not ordering.",
        "PurchaseReturnItem has no FK to ProductLot; attribution to a specific lot is a heuristic match on (productId, grNumber), same as production code. Ambiguous cases (2+ lots sharing a GR) are checked at the group level and flagged as LOW_CONFIDENCE_RETURN_MATCH rather than silently trusted.",
        "Sales returns never modify LotAllocation rows (only ProductLot.remainingQty, via a LIFO replay this script mirrors as salesReturnRestorationByLot). So Check C compares LotAllocation totals against the item's original sale quantity only, and the return's effect is validated in Check A instead.",
    ];

    const runAt = new Date().toISOString();
    const report = {
        runAt,
        summary: { totalDiscrepancies: discrepancies.length, countsByCategory, estimatedValueImpact },
        discrepancies: discrepancies.sort((a, b) => Math.abs(b.valueImpact || 0) - Math.abs(a.valueImpact || 0)),
        knownLimitations,
    };

    const outDir = path.join(__dirname, "output");
    fs.mkdirSync(outDir, { recursive: true });
    const stamp = runAt.replace(/[:.]/g, "-");
    const jsonPath = path.join(outDir, `audit-report-${stamp}.json`);
    const mdPath = path.join(outDir, `audit-report-${stamp}.md`);

    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    const md: string[] = [];
    md.push(`# Inventory Audit Report — ${runAt}`);
    md.push("");
    md.push(`Total discrepancies: **${discrepancies.length}**  `);
    md.push(`Estimated absolute value impact: **Rp ${estimatedValueImpact.toLocaleString("id-ID")}**`);
    md.push("");
    md.push("## Counts by category");
    for (const [cat, count] of Object.entries(countsByCategory)) {
        md.push(`- ${cat}: ${count}`);
    }
    md.push("");
    md.push("## Known limitations (not new bugs)");
    for (const l of knownLimitations) md.push(`- ${l}`);
    md.push("");

    const byCategory = groupBy(report.discrepancies, (d) => d.category);
    for (const [cat, items] of byCategory) {
        md.push(`## ${cat} (${items.length})`);
        md.push("");
        md.push("| SKU | Product | Ref | Expected | Actual | Diff | Value Impact |");
        md.push("|---|---|---|---|---|---|---|");
        for (const d of items) {
            const ref = d.lotNumber || d.deliveryNumber || d.grNumber || d.returnNumber || "-";
            md.push(
                `| ${d.sku} | ${d.productName} | ${ref} | ${d.expected} | ${d.actual} | ${d.diff} | ${d.valueImpact ? Math.round(d.valueImpact).toLocaleString("id-ID") : "-"} |`
            );
        }
        md.push("");
    }

    fs.writeFileSync(mdPath, md.join("\n"));

    console.log("\n=== AUDIT COMPLETE ===");
    console.log(`Total discrepancies: ${discrepancies.length}`);
    console.log("By category:", countsByCategory);
    console.log(`Estimated value impact: Rp ${estimatedValueImpact.toLocaleString("id-ID")}`);
    console.log(`\nJSON report: ${jsonPath}`);
    console.log(`Markdown report: ${mdPath}`);
}

main()
    .catch((e) => {
        console.error("AUDIT FAILED:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
