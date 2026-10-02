import { getPrisma } from "@/lib/prisma";
import { headers } from "next/headers";

import { PrintDatabaseTemplate } from "@/components/ui/PrintDatabaseTemplate";
import { serializeDecimal } from "@/lib/utils";

export default async function PrintDatabasePage() {
    // Force dynamic rendering to skip build-time DB check
    await headers();
    
    const prisma = getPrisma();
    const [products, latestGRItems] = await Promise.all([
        prisma.product.findMany({
            orderBy: { category: 'asc' }
        }).catch(() => []),
        prisma.goodsReceiptItem.findMany({
            where: { receipt: { isVoid: false }, purchasePrice: { gt: 0 } },
            select: { productId: true, purchasePrice: true },
            orderBy: { id: 'desc' }
        }).catch(() => [])
    ]);

    const priceMap = new Map<string, number>();
    latestGRItems.forEach((it: any) => {
        if (!priceMap.has(it.productId)) {
            priceMap.set(it.productId, Number(it.purchasePrice || 0));
        }
    });

    const safeProducts = products.map((p: any) => ({
        ...JSON.parse(JSON.stringify(p)),
        purchasePrice: Number(p.purchasePrice) > 0 ? Number(p.purchasePrice) : (priceMap.get(p.id) || 0)
    }));

    return (
        <div className="bg-white">
            <PrintDatabaseTemplate products={serializeDecimal(safeProducts) as any} />
            <script dangerouslySetInnerHTML={{ __html: 'window.print()' }} />
        </div>
    );
}
