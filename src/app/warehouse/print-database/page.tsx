export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { PrintDatabaseTemplate } from "@/components/ui/PrintDatabaseTemplate";
import { serializeDecimal } from "@/lib/utils";

export default async function PrintDatabasePage() {
    const products = serializeDecimal(await prisma.product.findMany({
        orderBy: { category: 'asc' }
    }).catch(() => []));

    return (
        <div className="bg-white">
            <PrintDatabaseTemplate products={products as any} />
            <script dangerouslySetInnerHTML={{ __html: 'window.print()' }} />
        </div>
    );
}
