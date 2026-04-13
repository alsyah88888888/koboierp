export const dynamic = "force-dynamic";

import { getPurchaseRequestsAction } from "@/actions/purchase";
import { PurchaseRequestDashboard } from "@/app/purchase/request/PurchaseRequestDashboard";
import { serializeDecimal } from "@/lib/utils";
import { getPrisma } from "@/lib/prisma";

import { headers } from "next/headers";

export default async function PurchaseRequestPage() {
    // Calling headers() forces the page to be dynamic and skips prerendering during build
    await headers();
    
    const prisma = getPrisma();
    const purchaseRequests = await getPurchaseRequestsAction();
    const coa = await prisma.financeAccount.findMany({
        orderBy: { code: 'asc' }
    }).catch(() => []);

    return (
        <PurchaseRequestDashboard
            purchaseRequests={serializeDecimal(purchaseRequests)}
            coa={serializeDecimal(coa)}
        />
    );
}
