
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

        // 2. Fetch Sales Items for the selected month
        const salesItems = await prisma.salesDeliveryItem.findMany({
            where: {
                delivery: {
                    date: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            },
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
                        salesPerson: true,
                        warehouse: { select: { name: true } }
                    }
                }
            },
            orderBy: { delivery: { date: 'desc' } }
        });

        if (salesItems.length === 0) return [];

        // 2. Optimization: Get unique product IDs from sales to filter purchase query
        const productIds = [...new Set(salesItems.map((si: any) => si.productId))];

        // 3. Fetch Purchase Items ONLY for products that have been sold
        const purchaseItems = await prisma.goodsReceiptItem.findMany({
            where: {
                productId: { in: productIds }
            },
            select: {
                id: true,
                productId: true,
                quantity: true,
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
                        salesPerson: true,
                        warehouse: { select: { name: true } }
                    }
                }
            },
            orderBy: { receipt: { date: 'desc' } }
        });

        // 4. Build a Map for fast O(1) matching
        const purchaseMap = new Map();
        purchaseItems.forEach((pi: any) => {
            if (!pi.receipt) return;
            const key = `${pi.productId}_${pi.receipt.receivedFrom}`;
            // Keep the latest one per product+vendor key
            if (!purchaseMap.has(key)) {
                purchaseMap.set(key, pi);
            }
        });

        const reportData: any[] = [];

        // 5. Build the paired report rows
        salesItems.forEach((si: any) => {
            if (!si.delivery || !si.product) return;

            const key = `${si.productId}_${si.vendorName}`;
            const match = purchaseMap.get(key);

            const buyPrice = match ? Number(match.purchasePrice || 0) : 0;
            const sellPrice = Number(si.salesPrice || 0);
            const buyDisc = match ? Number(match.discount || 0) : 0;
            const sellDisc = Number(si.discount || 0);
            const buyTax = match?.receipt?.taxRate ? Number(match.receipt.taxRate) : 0;
            const sellTax = si.delivery.taxRate ? Number(si.delivery.taxRate) : 0;
            const qty = Number(si.quantity || 0);
            
            const buyTotal = qty * (buyPrice - buyDisc);
            const sellTotal = qty * (sellPrice - sellDisc);

            const saleDate = si.delivery.date || si.delivery.createdAt;
            const buyDate = match?.receipt?.date || match?.receipt?.createdAt;

            reportData.push({
                'SKU': si.product.sku,
                'Nama Barang': si.product.name,
                'Satuan': si.product.uom || "PCS",
                
                // --- INFO PEMBELIAN (KIRI) ---
                '[BELI] Tgl': buyDate ? new Date(buyDate).toLocaleDateString('id-ID') : "-",
                '[BELI] No. LPB': match?.receipt?.receiptNumber || "-",
                '[BELI] No. SJ Supplier': match?.receipt?.formNumber || "-",
                '[BELI] Supplier': si.vendorName || match?.receipt?.receivedFrom || "UMUM",
                '[BELI] Sales (BC/PF)': match?.receipt?.salesPerson || "-",
                '[BELI] Qty Beli': match?.quantity ? Number(match.quantity) : "-",
                '[BELI] Harga Satuan': buyPrice,
                '[BELI] PPN (%)': buyTax > 0 ? `${buyTax}%` : "0%",
                
                // --- INFO PENJUALAN (KANAN) ---
                '_rawSortDate': saleDate, 
                '[JUAL] No. TRN': si.delivery.deliveryNumber || "-",
                '[JUAL] No. PO Buyer': si.delivery.poNumber || "-",
                '[JUAL] Buyer / Customer': si.delivery.buyerName || si.delivery.recipient || "UMUM",
                '[JUAL] Sales (BC/PF)': si.delivery.salesPerson || "-",
                'Qty Jual': qty,
                '[JUAL] Harga Jual Satuan': sellPrice,
                '[JUAL] PPN (%)': sellTax > 0 ? `${sellTax}%` : "0%",
                '[JUAL] Total Nilai Jual': sellTotal,
                
                // --- ANALYSIS ---
                'Margin Estimasi (Rp)': sellTotal - buyTotal,
                'Gudang': si.delivery.warehouse?.name || match?.receipt?.warehouse?.name || "Pusat",
                'Catatan': si.delivery.notes || "-"
            });
        });

        // 6. Final sort
        reportData.sort((a, b) => {
            const dateA = a._rawSortDate ? new Date(a._rawSortDate).getTime() : 0;
            const dateB = b._rawSortDate ? new Date(b._rawSortDate).getTime() : 0;
            return dateA - dateB;
        });

        // 7. Cleanup and format
        return reportData.map(({ _rawSortDate, ...rest }) => ({
            ...rest,
            'Tanggal': _rawSortDate ? new Date(_rawSortDate).toLocaleDateString('id-ID') : "-"
        }));

    } catch (error: any) {
        console.error("[getProductTraceabilityService] FATAL ERROR:", error);
        throw error;
    }
}
