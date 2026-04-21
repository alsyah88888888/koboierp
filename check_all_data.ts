
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
    const srCount = await prisma.salesReturn.count();
    const poCount = await prisma.purchaseOrder.count();
    const prCount = await prisma.purchaseRequest.count();
    const grCount = await prisma.goodsReceipt.count();
    const vendorCount = await prisma.vendor.count();
    const customerCount = await prisma.customer.count();
    
    console.log("Status Data Sistem:");
    console.log("- Retur Penjualan (SalesReturn):", srCount);
    console.log("- Purchase Order (Beli):", poCount);
    console.log("- Purchase Request:", prCount);
    console.log("- Penerimaan Barang (GoodsReceipt):", grCount);
    console.log("- Data Vendor:", vendorCount);
    console.log("- Data Customer:", customerCount);
}
main().finally(() => prisma.$disconnect());
