
import { getPrisma } from "@/lib/prisma";

/**
 * DIAGNOSTIC REPORT SERVICE (TESTING VOLUME & SERIALIZATION)
 */
export async function getProductTraceabilityService() {
    const prisma = getPrisma();

    console.log("[DIAGNOSTIC] Starting Traceability Report...");

    try {
        // 1. Fetch Sales Items - LIMITED TO 100 ROWS FOR DIAGNOSIS
        const salesItems = await prisma.salesDeliveryItem.findMany({
            select: {
                productId: true,
                vendorName: true,
                quantity: true,
                salesPrice: true,
                discount: true,
                product: {
                    select: { sku: true, name: true, uom: true }
                },
                delivery: {
                    select: {
                        date: true,
                        createdAt: true,
                        deliveryNumber: true,
                        poNumber: true,
                        buyerName: true,
                        recipient: true,
                        taxRate: true,
                        warehouse: { select: { name: true } }
                    }
                }
            },
            orderBy: { delivery: { date: 'desc' } }
        });

        console.log(`[DIAGNOSTIC] Fetched ${salesItems.length} sales items.`);

        if (salesItems.length === 0) return [];

        const productIds = [...new Set(salesItems.map((si: any) => si.productId))];

        // 2. Fetch related Purchase Items
        const purchaseItems = await prisma.goodsReceiptItem.findMany({
            where: { productId: { in: productIds } },
            select: {
                id: true,
                productId: true,
                purchasePrice: true,
                discount: true,
                receipt: {
                    select: {
                        date: true,
                        createdAt: true,
                        receiptNumber: true,
                        formNumber: true,
                        receivedFrom: true,
                        taxRate: true,
                        warehouse: { select: { name: true } }
                    }
                }
            },
            orderBy: { receipt: { date: 'desc' } }
        });

        const purchaseMap = new Map();
        purchaseItems.forEach((pi: any) => {
            if (!pi.receipt) return;
            const key = `${pi.productId}_${pi.receipt.receivedFrom}`;
            if (!purchaseMap.has(key)) purchaseMap.set(key, pi);
        });

        const reportData: any[] = [];

        // 3. Pair them carefully, ensuring NO Prisma Decimal objects survive
        salesItems.forEach((si: any) => {
            if (!si.delivery || !si.product) return;

            const key = `${si.productId}_${si.vendorName}`;
            const match = purchaseMap.get(key);

            // FORCE EVERYTHING TO PLAIN NUMBERS
            const buyPrice = match ? Number(match.purchasePrice || 0) : 0;
            const sellPrice = Number(si.salesPrice || 0);
            const buyDisc = match ? Number(match.discount || 0) : 0;
            const sellDisc = Number(si.discount || 0);
            const buyTax = match?.receipt?.taxRate ? Number(match.receipt.taxRate) : 0;
            const sellTax = Number(si.delivery.taxRate || 0);
            const qty = Number(si.quantity || 0);

            const buyTotal = qty * (buyPrice - buyDisc);
            const sellTotal = qty * (sellPrice - sellDisc);

            const saleDate = si.delivery.date || si.delivery.createdAt;
            const buyDate = match?.receipt?.date || match?.receipt?.createdAt;

            reportData.push({
                'SKU': String(si.product.sku),
                'Nama Barang': String(si.product.name),
                'Satuan': String(si.product.uom || "PCS"),
                
                // --- INFO PEMBELIAN ---
                '[BELI] Tgl': buyDate ? new Date(buyDate).toLocaleDateString('id-ID') : "-",
                '[BELI] No. LPB': String(match?.receipt?.receiptNumber || "-"),
                '[BELI] No. SJ Supplier': String(match?.receipt?.formNumber || "-"),
                '[BELI] Supplier': String(si.vendorName || match?.receipt?.receivedFrom || "UMUM"),
                '[BELI] Harga Satuan': buyPrice,
                '[BELI] PPN (%)': buyTax > 0 ? `${buyTax}%` : "0%",
                
                // --- INFO PENJUALAN ---
                '_rawSortDate': saleDate, 
                '[JUAL] No. TRN': String(si.delivery.deliveryNumber || "-"),
                '[JUAL] No. PO Buyer': String(si.delivery.poNumber || "-"),
                '[JUAL] Buyer / Customer': String(si.delivery.buyerName || si.delivery.recipient || "UMUM"),
                'Qty Jual': qty,
                '[JUAL] Harga Jual Satuan': sellPrice,
                '[JUAL] PPN (%)': sellTax > 0 ? `${sellTax}%` : "0%",
                '[JUAL] Total Nilai Jual': sellTotal,
                
                // --- ANALYSIS ---
                'Margin Estimasi (Rp)': sellTotal - buyTotal,
                'Gudang': String(si.delivery.warehouse?.name || match?.receipt?.warehouse?.name || "Pusat"),
                'Catatan': String(si.delivery.notes || "-")
            });
        });

        // 4. Sort and Cleanup
        reportData.sort((a, b) => {
            const dateA = a._rawSortDate ? new Date(a._rawSortDate).getTime() : 0;
            const dateB = b._rawSortDate ? new Date(b._rawSortDate).getTime() : 0;
            return dateA - dateB;
        });

        const finalResult = reportData.map(({ _rawSortDate, ...rest }) => ({
            ...rest,
            'Tanggal': _rawSortDate ? new Date(_rawSortDate).toLocaleDateString('id-ID') : "-"
        }));

        console.log("[DIAGNOSTIC] Report generation successful.");
        return finalResult;

    } catch (error: any) {
        console.error("[DIAGNOSTIC] FATAL ERROR:", error.message, error.stack);
        throw error;
    }
}
