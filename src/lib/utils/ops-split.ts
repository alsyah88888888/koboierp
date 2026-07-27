/**
 * Alokasi murni (tanpa dependency prisma) untuk memecah nominal transaksi
 * operasional yang terkait banyak Surat Jalan/invoice menjadi beberapa baris
 * per-pengiriman, proporsional terhadap qty tiap pengiriman.
 *
 * Ini adalah satu-satunya implementasi alokasi qty-proporsional di seluruh
 * aplikasi — report-service.ts (server) dan modul Operasional (client) sama-sama
 * memanggil fungsi ini supaya hasil split (termasuk pembulatan) identik, bukan
 * dua implementasi terpisah yang bisa berbeda beberapa rupiah.
 */
export function splitOpsAmountsByDelivery(linkedOps: any[], deliveriesByInvoice: Map<string, any[]>): any[] {
    if (linkedOps.length === 0) return [];

    const qtyOf = (d: any) => (d.items || []).reduce((q: number, i: any) => q + Number(i.quantity || 0), 0) || 1;

    const result: any[] = [];

    for (const op of linkedOps) {
        const invoices = String(op.invoiceNumber || '').split(',').map((s: string) => s.trim()).filter(Boolean);
        if (invoices.length === 0) {
            result.push({ ...op });
            continue;
        }

        // Level 1: split the transaction amount across its distinct invoice-number groups by qty
        let totalQty = 0;
        const qtyByInvoice = new Map<string, number>();
        invoices.forEach((inv: string) => {
            const ds = deliveriesByInvoice.get(inv) || [];
            const qty = ds.reduce((s: number, d: any) => s + qtyOf(d), 0);
            qtyByInvoice.set(inv, qty);
            totalQty += qty;
        });

        if (totalQty === 0) {
            // None of the referenced invoice numbers match a real delivery — keep as-is
            result.push({ ...op });
            continue;
        }

        let remainingAmt = Number(op.amount || 0);
        let remainingQty = totalQty;
        let anyRowProduced = false;

        invoices.forEach((inv: string, index: number) => {
            const qty = qtyByInvoice.get(inv) || 0;
            const invoiceAmt = remainingQty > 0
                ? Math.round(remainingAmt * (qty / remainingQty))
                : Math.round(remainingAmt / (invoices.length - index));
            remainingAmt -= invoiceAmt;
            remainingQty -= qty;

            const ds = deliveriesByInvoice.get(inv) || [];
            if (ds.length === 0) return;

            // Level 2: split this invoice group's share across the deliveries that share it
            const grandQty = ds.reduce((s: number, d: any) => s + qtyOf(d), 0);
            let remainingInvoiceAmt = invoiceAmt;
            ds.forEach((d: any, dIdx: number) => {
                const dQty = qtyOf(d);
                const share = dIdx < ds.length - 1
                    ? Math.round(invoiceAmt * (dQty / grandQty))
                    : remainingInvoiceAmt; // last delivery in the group gets the remainder
                remainingInvoiceAmt -= share;
                if (share !== 0) {
                    anyRowProduced = true;
                    result.push({
                        ...op,
                        amount: share,
                        date: d.date,
                        salesPerson: d.salesPerson || op.salesPerson,
                        _sourceDeliveryNumber: d.deliveryNumber,
                        _sourceInvoiceGroup: inv,
                    });
                }
            });
        });

        if (!anyRowProduced) {
            // Defensive fallback: matched invoices existed but produced no rows (e.g. zero amount)
            result.push({ ...op });
        }
    }

    return result;
}

/** Helper untuk membangun lookup invoiceNumber/deliveryNumber -> deliveries[] dari daftar SalesDelivery mentah. */
export function buildDeliveriesByInvoiceMap(deliveries: any[]): Map<string, any[]> {
    const map = new Map<string, any[]>();
    deliveries.forEach((d: any) => {
        const key = d.invoiceNumber || d.deliveryNumber;
        if (!key) return;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(d);
    });
    return map;
}
