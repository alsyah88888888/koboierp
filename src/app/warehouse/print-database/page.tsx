export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { PrintDatabaseTemplate } from "@/components/ui/PrintDatabaseTemplate";

export default async function PrintDatabasePage() {
    const products = await prisma.product.findMany({
        orderBy: { category: 'asc' }
    });

    return (
        <div className="bg-white">
            <PrintDatabaseTemplate products={products as any} />
            <script dangerouslySetInnerHTML={{ __html: 'window.print()' }} />
        </div>
    );
}
