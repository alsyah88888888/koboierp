import { getPrisma } from "@/lib/prisma";
import { headers } from "next/headers";

import { PrintDatabaseTemplate } from "@/components/ui/PrintDatabaseTemplate";
import { serializeDecimal } from "@/lib/utils";

export default async function PrintDatabasePage() {
    // Force dynamic rendering to skip build-time DB check
    await headers();
    
    const prisma = getPrisma();
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
