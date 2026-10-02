import { getPrisma } from "@/lib/prisma";
import { WarehouseDashboard } from "./WarehouseDashboard";
import { serializeDecimal } from "@/lib/utils";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/auth";

export default async function WarehousePage() {
    // Force dynamic rendering to skip build-time DB check
    await headers();
    
    const prisma = getPrisma();
    const session = await getServerSession(getAuthOptions()) as any;

    if (!session) {
        redirect("/login");
    }
    // 1. Fetch Products, Warehouses, Receipts, and latest GR item prices in parallel
    const [products, warehouses, recentReceiptsRaw, latestGRItems, rawMovements] = await Promise.all([
        prisma.product.findMany({
            include: { stocks: true },
            orderBy: { sku: 'asc' }
        }).catch(() => []),
        prisma.warehouse.findMany().catch(() => []),
        prisma.goodsReceipt.findMany({
            where: { isVoid: false },
            include: { 
                items: { include: { product: true } },
                warehouse: true 
            },
            orderBy: { createdAt: 'desc' }
        }).catch(() => []),
        prisma.goodsReceiptItem.findMany({
            where: { receipt: { isVoid: false }, purchasePrice: { gt: 0 } },
            select: {
                productId: true,
                purchasePrice: true,
                receipt: { select: { receivedFrom: true, salesPerson: true, taxRate: true } }
            },
            orderBy: { id: 'desc' }
        }).catch(() => []),
        prisma.stockMovement.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
        }).catch(() => [])
    ]);

    const productIds = Array.from(new Set(rawMovements.map((m: any) => m.productId))).filter(Boolean);
    const warehouseIds = Array.from(new Set(rawMovements.map((m: any) => m.warehouseId))).filter(Boolean);

    const [movementProducts, movementWarehouses] = await Promise.all([
        prisma.product.findMany({ where: { id: { in: productIds } } }).catch(() => []),
        prisma.warehouse.findMany({ where: { id: { in: warehouseIds } } }).catch(() => [])
    ]);

    // Build latest price map for all products
    const latestPriceMap = new Map<string, { hpp: number; salesPerson: string; taxRate: number }>();
    latestGRItems.forEach((it: any) => {
        if (!latestPriceMap.has(it.productId)) {
            latestPriceMap.set(it.productId, {
                hpp: Number(it.purchasePrice || 0),
                salesPerson: it.receipt?.salesPerson || '-',
                taxRate: Number(it.receipt?.taxRate || 0)
            });
        }
        const vendorKey = `${it.productId}_${(it.receipt?.receivedFrom || 'CIBINONG').trim().toLowerCase()}`;
        if (!latestPriceMap.has(vendorKey)) {
            latestPriceMap.set(vendorKey, {
                hpp: Number(it.purchasePrice || 0),
                salesPerson: it.receipt?.salesPerson || '-',
                taxRate: Number(it.receipt?.taxRate || 0)
            });
        }
    });

    // Transform and POJO-ify for serialization safety
    const movements = rawMovements.map((m: any) => {
        const product = movementProducts.find((p: any) => p.id === m.productId);
        const warehouse = movementWarehouses.find((w: any) => w.id === m.warehouseId);
        return {
            ...JSON.parse(JSON.stringify(m)),
            product: product ? JSON.parse(JSON.stringify(product)) : null,
            warehouse: warehouse ? JSON.parse(JSON.stringify(warehouse)) : null
        };
    });

    const safeProducts = products.map((p: any) => {
        const meta = latestPriceMap.get(p.id);
        const resolvedPrice = Number(p.purchasePrice) > 0 ? Number(p.purchasePrice) : (meta?.hpp || 0);
        return {
            ...JSON.parse(JSON.stringify(p)),
            purchasePrice: resolvedPrice,
            stocks: p.stocks.map((s: any) => {
                const sVendorKey = `${p.id}_${(s.vendorName || 'CIBINONG').trim().toLowerCase()}`;
                const vendorMeta = latestPriceMap.get(sVendorKey) || meta;
                return {
                    ...JSON.parse(JSON.stringify(s)),
                    hpp: vendorMeta?.hpp || resolvedPrice,
                    salesPerson: vendorMeta?.salesPerson || '-',
                    taxRate: vendorMeta?.taxRate || 0
                };
            })
        };
    });

    const safeRecentReceipts = recentReceiptsRaw.map((r: any) => ({
        ...JSON.parse(JSON.stringify(r)),
        warehouse: r.warehouse ? JSON.parse(JSON.stringify(r.warehouse)) : null,
        items: r.items.map((i: any) => ({
            ...JSON.parse(JSON.stringify(i)),
            product: i.product ? JSON.parse(JSON.stringify(i.product)) : null
        }))
    }));

    return <WarehouseDashboard
        initialProducts={serializeDecimal(safeProducts)}
        warehouses={serializeDecimal(warehouses.map(w => JSON.parse(JSON.stringify(w))))}
        unverifiedReceipts={serializeDecimal(safeRecentReceipts)}
        movements={serializeDecimal(movements)}
    />;
}
