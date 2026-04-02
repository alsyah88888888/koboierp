export const dynamic = 'force-dynamic';

import prisma from "@/lib/prisma";
import { PurchaseDashboard } from "./PurchaseDashboard";
import { serializeDecimal } from "@/lib/utils";

import { headers } from "next/headers";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export default async function PurchasePage() {
    // Force dynamic rendering to skip build-time DB check
    await headers();
    
    const session = await getServerSession(authOptions) as any;
    const isAdmin = session?.user?.role?.toUpperCase() === "ADMIN";
    
    // Strict filters for non-admins to exclude "PF" and focus on "BC"
    const receiptFilter = isAdmin ? {} : { 
        OR: [{ salesPerson: "BC" }, { createdById: session?.user?.id }],
        NOT: { salesPerson: "PF" }
    };
    
    const returnFilter = isAdmin ? {} : {
        OR: [
            { receipt: { salesPerson: "BC" } },
            { createdById: session?.user?.id }
        ],
        NOT: { receipt: { salesPerson: "PF" } }
    };
    
    const products = serializeDecimal(await prisma.product.findMany({
        select: { 
            id: true, sku: true, name: true, uom: true, barcode: true,
            stocks: {
                select: { quantity: true, warehouseId: true, vendorName: true }
            }
        },
        orderBy: { sku: 'asc' }
    }).catch(() => []));

    const warehouses = serializeDecimal(await prisma.warehouse.findMany().catch(() => []));

    const vendors = serializeDecimal(await prisma.vendor.findMany({
        orderBy: { name: 'asc' }
    }).catch(() => []));

    const receipts = serializeDecimal(await prisma.goodsReceipt.findMany({
        where: receiptFilter,
        include: {
            warehouse: true,
            items: {
                include: { product: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    }).catch(() => []));

    const returns = serializeDecimal(await prisma.purchaseReturn.findMany({
        where: returnFilter,
        include: { receipt: true, items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' }
    }).catch(() => []));

    return (
        <PurchaseDashboard
            initialReceipts={receipts}
            initialReturns={returns}
            products={products}
            warehouses={warehouses}
            vendors={vendors}
        />
    );
}
