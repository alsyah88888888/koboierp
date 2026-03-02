import prisma from "@/lib/prisma";
import { PurchaseDashboard } from "./PurchaseDashboard";
import { serializeDecimal } from "@/lib/utils";

export default async function PurchasePage() {
    const products = await prisma.product.findMany({
        select: { id: true, sku: true, name: true, uom: true, barcode: true },
        orderBy: { sku: 'asc' }
    }).catch(() => []);

    const warehouses = await prisma.warehouse.findMany().catch(() => []);

    const vendors = serializeDecimal(await prisma.vendor.findMany({
        orderBy: { name: 'asc' }
    }).catch(() => []));

    const receipts = serializeDecimal(await prisma.goodsReceipt.findMany({
        include: { warehouse: true, items: true },
        orderBy: { createdAt: 'desc' }
    }).catch(() => []));

    return (
        <PurchaseDashboard
            initialReceipts={receipts}
            products={products}
            warehouses={warehouses}
            vendors={vendors}
        />
    );
}
