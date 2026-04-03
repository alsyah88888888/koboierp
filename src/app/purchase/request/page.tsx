export const dynamic = "force-dynamic";

import { getPurchaseRequestsAction } from "@/actions/purchase";
import { PurchaseRequestDashboard } from "@/app/purchase/request/PurchaseRequestDashboard";
import { serializeDecimal } from "@/lib/utils";

import { headers } from "next/headers";

export default async function PurchaseRequestPage() {
    // Calling headers() forces the page to be dynamic and skips prerendering during build
    await headers();
    
    const purchaseRequests = await getPurchaseRequestsAction();
    return (
        <PurchaseRequestDashboard
            purchaseRequests={serializeDecimal(purchaseRequests)}
        />
    );
}
