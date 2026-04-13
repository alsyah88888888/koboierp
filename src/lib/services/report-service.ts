
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
                'No. Dokumen Internal': ri.receipt.receiptNumber,
                'No. Surat Jalan (Supplier)': ri.receipt.formNumber || "-",
                'Pihak Terkait (Supplier/Customer)': ri.receipt.receivedFrom,
                'Quantity': ri.quantity,
                'Harga Beli Satuan': Number(ri.purchasePrice),
                'Harga Jual Satuan': 0,
                'Total Nilai': Number(ri.quantity) * Number(ri.purchasePrice),
                'Warehouse': 'Pusat'
            });
        });

        // Collect Sales (Keluar)
        product.salesItems.forEach((si: any) => {
            reportData.push({
                'SKU': product.sku,
                'Nama Barang': product.name,
                'Tanggal': si.delivery.date || si.delivery.createdAt,
                'Tipe': 'KELUAR (JUAL)',
                'No. Dokumen Internal': si.delivery.deliveryNumber,
                'No. Surat Jalan (Supplier)': si.delivery.poNumber || "-", // PO Number from Customer
                'Pihak Terkait (Supplier/Customer)': si.delivery.buyerName || si.delivery.recipient || 'UMUM',
                'Quantity': si.quantity,
                'Harga Beli Satuan': 0,
                'Harga Jual Satuan': Number(si.salesPrice || 0),
                'Total Nilai': Number(si.quantity) * Number(si.salesPrice || 0),
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
