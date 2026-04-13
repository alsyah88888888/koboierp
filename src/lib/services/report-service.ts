
/**
 * REPORT SERVICES
 */

export async function getProductTraceabilityService() {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    // Fetch all products with their transactions
    const products = await prisma.product.findMany({
        include: {
            receiptItems: {
                include: {
                    receipt: true
                }
            },
            salesItems: {
                include: {
                    delivery: true
                }
            }
        },
        orderBy: { name: 'asc' }
    });

    const reportData: any[] = [];

    products.forEach((product: any) => {
        // Collect Purchases (Masuk)
        product.receiptItems.forEach((ri: any) => {
            reportData.push({
                'SKU': product.sku,
                'Nama Barang': product.name,
                'Tanggal': ri.receipt.date || ri.receipt.createdAt,
                'Tipe': 'MASUK (BELI)',
                'No. Dokumen': ri.receipt.receiptNumber,
                'Pihak Terkait': ri.receipt.receivedFrom,
                'Quantity': ri.quantity,
                'Harga Satuan': Number(ri.purchasePrice),
                'Total': Number(ri.quantity) * Number(ri.purchasePrice),
                'Warehouse': 'Pusat' // Can be refined if needed
            });
        });

        // Collect Sales (Keluar)
        product.salesItems.forEach((si: any) => {
            reportData.push({
                'SKU': product.sku,
                'Nama Barang': product.name,
                'Tanggal': si.delivery.date || si.delivery.createdAt,
                'Tipe': 'KELUAR (JUAL)',
                'No. Dokumen': si.delivery.deliveryNumber,
                'Pihak Terkait': si.delivery.buyerName || si.delivery.recipient || 'UMUM',
                'Quantity': si.quantity,
                'Harga Satuan': Number(si.salesPrice || 0),
                'Total': Number(si.quantity) * Number(si.salesPrice || 0),
                'Warehouse': 'Pusat'
            });
        });
    });

    // Sort all movements by Date
    reportData.sort((a, b) => new Date(a.Tanggal).getTime() - new Date(b.Tanggal).getTime());

    // Format final object for Excel
    return reportData.map(r => ({
        ...r,
        'Tanggal': new Date(r.Tanggal).toLocaleDateString('id-ID')
    }));
}
