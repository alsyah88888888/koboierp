
import { getPrisma } from "@/lib/prisma";

/**
 * HIGH PERFORMANCE MATCHED TRACEABILITY (BUY/SELL PAIRING)
 */
export async function getProductTraceabilityService(month?: number, year?: number) {
    const prisma = getPrisma();

    try {
        // 1. Calculate Date Range
        const filterYear = year || new Date().getFullYear();
        const filterMonth = month || (new Date().getMonth() + 1);
        const startDate = new Date(filterYear, filterMonth - 1, 1);
        const endDate = new Date(filterYear, filterMonth, 0, 23, 59, 59);

        // 2. High Performance Raw SQL Join
        // Using LATERAL JOIN to find the latest purchase for each sales item efficiently.
        const results = await prisma.$queryRaw`
            SELECT 
                sdi."productId",
                p."sku",
                p."name" as "product_name",
                p."uom",
                sdi."quantity" as "qty_jual",
                sdi."salesPrice" as "sell_price",
                sdi."discount" as "sell_disc",
                sdi."vendorName" as "vendor_name",
                sd."deliveryNumber" as "delivery_number",
                sd."poNumber" as "po_number",
                sd."buyerName" as "buyer_name",
                sd."recipient",
                sd."salesPerson" as "sales_person_jual",
                sd."date" as "sale_date",
                sd."taxRate" as "sell_tax_rate",
                sd."notes" as "sale_notes",
                w."name" as "warehouse_name",
                
                latest_buy.buy_date,
                latest_buy.buy_receipt_number,
                latest_buy.buy_form_number,
                latest_buy.buy_received_from,
                latest_buy.buy_sales_person,
                latest_buy.buy_qty,
                latest_buy.buy_price,
                latest_buy.buy_disc,
                latest_buy.buy_tax_rate,
                latest_buy.buy_warehouse_name
            FROM "SalesDeliveryItem" sdi
            JOIN "SalesDelivery" sd ON sdi."deliveryId" = sd."id"
            JOIN "Product" p ON sdi."productId" = p."id"
            LEFT JOIN "Warehouse" w ON sd."warehouseId" = w."id"
            LEFT JOIN LATERAL (
                SELECT 
                    gr."date" as buy_date,
                    gr."receiptNumber" as buy_receipt_number,
                    gr."formNumber" as buy_form_number,
                    gr."receivedFrom" as buy_received_from,
                    gr."salesPerson" as buy_sales_person,
                    gri."quantity" as buy_qty,
                    gri."purchasePrice" as buy_price,
                    gri."discount" as buy_disc,
                    gr."taxRate" as buy_tax_rate,
                    bw."name" as buy_warehouse_name
                FROM "GoodsReceiptItem" gri
                JOIN "GoodsReceipt" gr ON gri."receiptId" = gr."id"
                LEFT JOIN "Warehouse" bw ON gr."warehouseId" = bw."id"
                WHERE gri."productId" = sdi."productId" 
                  AND (gr."receivedFrom" = sdi."vendorName" OR sdi."vendorName" = 'UMUM')
                ORDER BY gr."date" DESC, gr."createdAt" DESC
                LIMIT 1
            ) latest_buy ON TRUE
            WHERE sd."date" >= ${startDate} AND sd."date" <= ${endDate}
            ORDER BY sd."date" DESC
        `;

        // 3. Map SQL Results to Excel Format (Lighter Processing)
        return (results as any[]).map((row: any) => {
            const qty = Number(row.qty_jual || 0);
            const buyPrice = Number(row.buy_price || 0);
            const sellPrice = Number(row.sell_price || 0);
            const buyDisc = Number(row.buy_disc || 0);
            const sellDisc = Number(row.sell_disc || 0);
            const buyTaxRate = Number(row.buy_tax_rate || 0);
            const sellTaxRate = Number(row.sell_tax_rate || 0);

            const buyTotal = qty * (buyPrice - buyDisc);
            const sellTotal = qty * (sellPrice - sellDisc);

            return {
                'Satuan': row.uom || "PCS",
                'SKU': row.sku,
                'Nama Barang': row.product_name,
                'Tanggal': row.sale_date ? new Date(row.sale_date).toLocaleDateString('id-ID') : "-",
                
                // --- INFO PEMBELIAN (KIRI) ---
                '[BELI] Tgl': row.buy_date ? new Date(row.buy_date).toLocaleDateString('id-ID') : "-",
                '[BELI] No. LPB': row.buy_receipt_number || "-",
                '[BELI] No. SJ Supplier': row.buy_form_number || "-",
                '[BELI] Supplier': row.vendor_name || row.buy_received_from || "UMUM",
                '[BELI] Sales (BC/PF)': row.buy_sales_person || "-",
                '[BELI] Qty Beli': row.buy_qty ? Number(row.buy_qty) : "-",
                '[BELI] Harga Satuan': buyPrice,
                '[BELI] PPN (%)': buyTaxRate > 0 ? `${buyTaxRate}%` : "0%",
                
                // --- INFO PENJUALAN (KANAN) ---
                '[JUAL] No. TRN': row.delivery_number || "-",
                '[JUAL] No. PO Buyer': row.po_number || "-",
                '[JUAL] Buyer / Customer': row.buyer_name || row.recipient || "UMUM",
                '[JUAL] Sales (BC/PF)': row.sales_person_jual || "-",
                'Qty Jual': qty,
                '[JUAL] Harga Jual Satuan': sellPrice,
                '[JUAL] PPN (%)': sellTaxRate > 0 ? `${sellTaxRate}%` : "0%",
                '[JUAL] Total Nilai Jual': sellTotal,
                
                // --- ANALYSIS ---
                'Margin Estimasi (Rp)': Math.round(sellTotal - buyTotal),
                'Gudang': row.warehouse_name || row.buy_warehouse_name || "Pusat",
                'Catatan': row.sale_notes || "-"
            };
        });

    } catch (error: any) {
        console.error("[getProductTraceabilityService] FATAL SQL ERROR:", error);
        throw new Error(`SQL Error: ${error.message}`);
    }
}
