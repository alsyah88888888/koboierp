import { getPrisma } from "@/lib/prisma";
import { PurchaseDashboard } from "./PurchaseDashboard";
import { serializeDecimal } from "@/lib/utils";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/auth";

export default async function PurchasePage() {
    // Force dynamic rendering to skip build-time DB check
    await headers();
    
    const prisma = getPrisma();
    const session = await getServerSession(getAuthOptions()) as any;

    if (!session) {
        redirect("/login");
    }

    const isAdmin = session?.user?.role?.toUpperCase() === "ADMIN";
    
    const receiptFilter = {};
    const returnFilter = {};
    
    const [
        rawProducts,
        rawWarehouses,
        rawVendors,
        rawReceipts,
        rawReturns,
        rawPurchaseRequests,
        rawCoa
    ] = await Promise.all([
        prisma.product.findMany({
            select: { 
                id: true, sku: true, name: true, uom: true, barcode: true,
                stocks: {
                    select: { quantity: true, warehouseId: true, vendorName: true }
                }
            },
            orderBy: { sku: 'asc' }
        }).catch(() => []),
        prisma.warehouse.findMany().catch(() => []),
        prisma.vendor.findMany({
            orderBy: { name: 'asc' }
        }).catch(() => []),
        prisma.goodsReceipt.findMany({
            where: receiptFilter,
            include: {
                warehouse: true,
                items: {
                    include: { product: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        }).catch(() => []),
        prisma.purchaseReturn.findMany({
            where: returnFilter,
            include: { receipt: true, items: { include: { product: true } } },
            orderBy: { createdAt: 'desc' }
        }).catch(() => []),
        prisma.purchaseRequest.findMany({
            where: isAdmin ? {} : { requestedById: session?.user?.id },
            include: { requestedBy: true, items: true, approvedBy: true, verifiedBy: true },
            orderBy: { createdAt: 'desc' }
        }).catch(() => []),
        prisma.financeAccount.findMany({
            orderBy: { code: 'asc' }
        }).catch(() => [])
    ]);

    const products = serializeDecimal(rawProducts);
    const warehouses = serializeDecimal(rawWarehouses);
    const vendors = serializeDecimal(rawVendors);
    const receipts = serializeDecimal(rawReceipts);
    const returns = serializeDecimal(rawReturns);
    const purchaseRequests = serializeDecimal(rawPurchaseRequests);
    const coa = serializeDecimal(rawCoa);

    return (
        <PurchaseDashboard
            initialReceipts={receipts}
            initialReturns={returns}
            initialRequests={purchaseRequests}
            products={products}
            warehouses={warehouses}
            vendors={vendors}
            coa={coa}
        />
    );
}
